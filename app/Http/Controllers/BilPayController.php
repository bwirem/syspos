<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\GeneratesUniqueNumbers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

use App\Models\{
    BILDebtor,
    BILDebtorLog,
    BILInvoice,
    BILInvoiceLog,
    BILInvoicePayment,
    BILInvoicePaymentDetail,
    BILCollection,
    BLSPaymentType
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
     * --- THIS IS THE RESTORED ORIGINAL METHOD ---
     */
    public function edit(BILDebtor $debtor)
    {
        // Eager load the customer, and then eager load the payable invoices ON the customer.
        $debtor->load(['customer' => function ($query) {
            $query->with(['invoices' => function ($invoiceQuery) {
                $invoiceQuery->where('balancedue', '>', 0)
                             ->where('voided', '!=', 1) // Or use `where('voided', false)`
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
        $validated = $request->validate([
            'debtorItems' => 'required|array|min:1',
            'debtorItems.*.invoiceno' => 'required|string|exists:bil_invoices,invoiceno',
            'debtorItems.*.balancedue' => 'required|numeric',
            'payment_method' => 'required|integer|exists:bls_paymenttypes,id',
            'paid_amount' => 'required|numeric|min:0.01',
            'customer_id' => 'required|integer|exists:bls_customers,id',
        ]);

        try {
            DB::transaction(function () use ($validated) {
                $this->payInvoices($validated);
            });

            return redirect()->route('billing2.index')
                             ->with('success', 'Payment processed successfully.');

        } catch (\Exception $e) {
            Log::error('Error during invoice payment processing:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
            ]);

            return back()->with('error', 'An unexpected error occurred during payment processing.');
        }
    }

    /**
     * Handles the business logic of applying a payment across multiple invoices.
     */
    private function payInvoices(array $data): void
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
    }
}