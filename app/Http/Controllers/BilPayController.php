<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\GeneratesUniqueNumbers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf; // Import PDF
use Carbon\Carbon;

use App\Models\{
    BILDebtor,
    BILDebtorLog,
    BILInvoice,
    BILInvoiceLog,
    BILInvoicePayment, // The receipt model
    BILInvoicePaymentDetail,
    BILCollection,
    BLSPaymentType,
    UserGroupPrinter, // Import Printer Config
    FacilityOption,   // Import Facility Option
    BLSCustomer
};

use App\Enums\{
    BillingTransTypes,
    InvoiceStatus,
    PaymentSources,
    InvoiceTransTypes
};

class BilPayController extends Controller
{
    use GeneratesUniqueNumbers;

    /**
     * Display a listing of debtors with outstanding balances.
     */
    public function index(Request $request)
    {
        $query = BILDebtor::with('customer');

        if ($request->filled('search')) {
            $query->whereHas('customer', function ($q) use ($request) {
                $q->where('first_name', 'like', '%' . $request->search . '%')
                  ->orWhere('surname', 'like', '%' . $request->search . '%')
                  ->orWhere('other_names', 'like', '%' . $request->search . '%')
                  ->orWhere('company_name', 'like', '%' . $request->search . '%');
            });
        }

        $query->where('balance', '>', 0);

        $debtors = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        return inertia('BilPays/Index', [
            'debtors' => $debtors,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for paying a specific debtor's invoices.
     */
    public function edit(BILDebtor $debtor)
    {
        $debtor->load(['customer' => function ($query) {
            $query->with(['invoices' => function ($invoiceQuery) {
                $invoiceQuery->where('balancedue', '>', 0)
                             ->where('voided', '!=', 1)
                             ->where('status', '!=', InvoiceStatus::Cancelled->value)
                             ->orderBy('transdate', 'asc');
            }]);
        }]);

        return inertia('BilPays/PayBills', [
            'debtor' => $debtor,
            'payment_types' => BLSPaymentType::all(),
        ]);
    }

    /**
     * Process the payment for a debtor's invoices.
     */
    public function pay(Request $request)
    {
        // 1. Validation
        $validated = $request->validate([
            // ... keep your existing validation ...
            'debtorItems' => 'required|array|min:1',
            'debtorItems.*.invoiceno' => 'required|string|exists:bil_invoices,invoiceno',
            'debtorItems.*.balancedue' => 'required|numeric',
            'payment_method' => 'required|integer|exists:bls_paymenttypes,id',
            'paid_amount' => 'required|numeric|min:0.01',
            'customer_id' => 'required|integer|exists:bls_customers,id',
        ]);

        try {
            // 2. Process Payment Transaction
            $receiptNo = DB::transaction(function () use ($validated) {
                return $this->payInvoices($validated);
            });
            
            session(['latest_receipt_no' => $receiptNo]);

            // ============================================================
            // 3. HYBRID PRINTING LOGIC
            // ============================================================
            
            $userGroupId = Auth::user()->usergroup_id;
            $machineName = gethostname(); 

            // Query Printer Configuration
            $printerConfig = UserGroupPrinter::where('usergroup_id', $userGroupId)
                ->where('documenttypecode', 'receipt') 
                ->where('autoprint', true) 
                ->where(function ($query) use ($machineName) {
                    $query->where('machinename', $machineName) // Matches specific local server
                          ->orWhere('machinename', '')         // Fallback
                          ->orWhereNull('machinename');
                })
                ->orderByRaw('LENGTH(machinename) DESC') 
                ->first();

            $backendPrinted = false;
            $frontendAutoPrint = false;
            $receiptUrl = route('billing2.receipt_preview'); // Default URL

            // IF Configuration exists
            if ($printerConfig) {
                
                // CASE 1: Silent Print Requested (!printtoscreen)
                if (!$printerConfig->printtoscreen) {
                    
                    // Attempt Backend Printing (SumatraPDF)
                    // This creates the PDF temporarily on the server
                    $tempPdfPath = $this->generateTempPdf($receiptNo);
                    
                    if ($this->printToBackendPrinter($tempPdfPath, $printerConfig->printername)) {
                        // SUCCESS: Server printed it physically (Local Deployment)
                        $backendPrinted = true;
                        $receiptUrl = null; // No need to show PDF in browser
                    } else {
                        // FAIL: Server couldn't print (Cloud Deployment or missing EXE)
                        // Fallback: Tell Frontend to Auto-Print via Iframe
                        $frontendAutoPrint = true;
                    }

                } else {
                    // CASE 2: Preview Requested (printtoscreen = 1)
                    // Frontend will open New Tab
                    $frontendAutoPrint = false; 
                }
            }

            // ============================================================
            // 4. RETURN RESPONSE
            // ============================================================
            
            $msg = 'Payment processed successfully.';
            if ($backendPrinted) {
                $msg .= ' Sent to server printer: ' . $printerConfig->printername;
            }

            return response()->json([
                'success' => true,
                'invoice_url' => $receiptUrl,
                'auto_print' => $frontendAutoPrint, // True = Iframe, False = New Tab
                'backend_printed' => $backendPrinted, // True = Done on server
                'message' => $msg,
            ]);

        } catch (\Exception $e) {
            Log::error('Payment Error: ' . $e->getMessage());
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Tries to print using SumatraPDF. Returns TRUE if successful, FALSE if not found.
     */
    private function printToBackendPrinter($filePath, $printerName)
    {
        // 1. Check if SumatraPDF exists (Only exists on Local Windows Deployments)
        $printerExe = public_path('SumatraPDF.exe');
        
        if (!file_exists($printerExe) && strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            Log::warning("SumatraPDF.exe missing. Falling back to browser print.");
            return false;
        }

        // 2. Check for Linux 'lp' (Only exists on Linux servers with CUPS configured)
        // If on DigitalOcean without CUPS, this usually fails or does nothing useful for client printers
        if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
             // Optional: If you have a specific setup for Linux local servers
             // exec("lp ...", $output, $returnVar);
             // return $returnVar === 0;
             return false; // Default to Browser Print on Linux/Cloud
        }

        // 3. Execute Windows Print Command
        try {
            $command = "start /B \"\" \"{$printerExe}\" -print-to \"{$printerName}\" -silent \"{$filePath}\"";
            pclose(popen($command, "r"));
            return true;
        } catch (\Exception $e) {
            Log::error("Backend print failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Generates a temporary PDF file for backend printing
     */
    private function generateTempPdf($receiptNo)
    {
        $paymentRecord = BILInvoicePayment::with(['items.invoice.items.item', 'customer'])
                        ->where('receiptno', $receiptNo)->first();
        $facility = FacilityOption::first();

        $pdf = Pdf::loadView('pdfs.payment_receipt', [
            'payment' => $paymentRecord,
            'facility' => $facility,
        ]);

        $fileName = 'receipt_' . $receiptNo . '_' . time() . '.pdf';
        $directory = storage_path('app/public/temp_receipts');
        
        if (!file_exists($directory)) {
            mkdir($directory, 0755, true);
        }
        
        $filePath = $directory . '/' . $fileName;
        $pdf->save($filePath);
        
        return $filePath;
    }

     /**
     * Preview the Receipt (Used if not silent printing)
     */
    public function receiptPreview()
    {
        $receiptNo = session('latest_receipt_no');
        
        if (!$receiptNo) {
            return redirect()->route('billing2.index')->with('error', 'No receipt to display.');
        }
       
        $paymentRecord = BILInvoicePayment::with([
                            'items.invoice.items.item', 
                            'customer'
                        ])->where('receiptno', $receiptNo)->first();                       

        $facility = FacilityOption::first();

        // Ensure you have this view created 'pdfs.payment_receipt'
        $pdf = Pdf::loadView('pdfs.payment_receipt', [
            'payment' => $paymentRecord,
            'facility' => $facility,
        ]);

        return response($pdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="receipt_' . $receiptNo . '.pdf"');
    }

    /**
     * Handles the business logic of applying a payment across multiple invoices.
     * Returns the Receipt Number.
     */
    private function payInvoices(array $data): string
    {
        $transdate = Carbon::now();
        $customerId = $data['customer_id'];
        $totalPaid = $data['paid_amount'];
        $remainingToApply = $totalPaid;

        $receiptNo = $this->generateUniqueNumber(BILInvoicePayment::class, 'receiptno', 'REC');

        // --- Step 1: Create Transaction-Level Records (ONCE) ---
        BILInvoicePayment::create([
            'transdate' => $transdate, 'receiptno' => $receiptNo, 'customer_id' => $customerId,
            'totalpaid' => $totalPaid, 'yearpart' => $transdate->year, 'monthpart' => $transdate->month,
            'user_id' => Auth::id(),
        ]);

        $paymentMethodColumn = 'paytype' . str_pad($data['payment_method'], 6, '0', STR_PAD_LEFT);
        BILCollection::create([
            'transdate' => $transdate, 'receiptno' => $receiptNo, 'paymentsource' => PaymentSources::InvoicePayment->value,
            'customer_id' => $customerId, 'yearpart' => $transdate->year, 'monthpart' => $transdate->month,
            'transtype' => BillingTransTypes::Payment->value, 'user_id' => Auth::id(),
            $paymentMethodColumn => $totalPaid,
        ]);

        // --- Step 2: Apply Payment to Each Invoice ---
        foreach ($data['debtorItems'] as $item) {
            if ($remainingToApply <= 0) break;
            $invoice = BILInvoice::where('invoiceno', $item['invoiceno'])->firstOrFail();
            $amountToApply = min($remainingToApply, $invoice->balancedue);
            $invoice->decrement('balancedue', $amountToApply);
            $invoice->increment('totalpaid', $amountToApply);
            if ($invoice->balancedue <= 0) {
                $invoice->status = InvoiceStatus::Closed->value;
                $invoice->save();
            }
            BILInvoiceLog::create([
                'transdate' => $transdate, 'customer_id' => $customerId, 'reference' => $receiptNo,
                'invoiceno' => $invoice->invoiceno, 'debitamount' => 0, 'creditamount' => $amountToApply,
                'yearpart' => $transdate->year, 'monthpart' => $transdate->month,
                'transtype' => InvoiceTransTypes::Payment->value, 'transdescription' => 'Payment', 'user_id' => Auth::id(),
            ]);
            BILInvoicePaymentDetail::create([
                'receiptno' => $receiptNo, 'invoiceno' => $invoice->invoiceno,
                'totaldue' => $invoice->totaldue, 'totalpaid' => $amountToApply,
            ]);
            $remainingToApply -= $amountToApply;
        }

        // --- Step 3: Update the Debtor's Overall Balance (ONCE) ---
        $debtor = BILDebtor::where('customer_id', $customerId)->first();
        if ($debtor) {
            $debtor->decrement('balance', $totalPaid);
            BILDebtorLog::create([
                'transdate' => $transdate, 'debtor_id' => $debtor->id, 'reference' => $receiptNo,
                'debtortype' => 'Individual', 'debitamount' => 0, 'creditamount' => $totalPaid,
                'yearpart' => $transdate->year, 'monthpart' => $transdate->month,
                'transtype' => BillingTransTypes::Payment->value, 'transdescription' => 'Payment', 'user_id' => Auth::id(),
            ]);
        }

        return $receiptNo; // Return the generated receipt number
    }

    
   
}