<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\HandlesOrdering;
use App\Http\Controllers\Traits\GeneratesUniqueNumbers;
use App\Services\InventoryService; // Import the service

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

use App\Models\{
    BILOrder, BILOrderItem, BILSale, BILReceipt, BILInvoice, BILInvoiceLog,
    BILInvoicePayment, BILInvoicePaymentDetail, BILDebtor, BILDebtorLog,
    BILCollection, IVRequistion, IVRequistionItem,IVIssue ,SIV_Store,
    FacilityOption, BLSPaymentType, BLSPriceCategory,UserGroupPrinter, BLSCustomer
};

use App\Enums\{
    BillingTransTypes, InvoiceStatus, PaymentSources, InvoiceTransTypes, StoreType
};

class BilPostController extends Controller
{
    use HandlesOrdering;
    use GeneratesUniqueNumbers;

    /**
     * Display a listing of posted or proforma orders.
     */
    public function index(Request $request)
    {
        $today = now()->format('Y-m-d');
        $startDate = $request->input('start_date', $today);
        $endDate = $request->input('end_date', $today);

        $query = BILOrder::with(['orderitems', 'customer']);

        if ($request->filled('search')) {
            $query->whereHas('customer', function ($q) use ($request) {
                $q->where('first_name', 'like', '%' . $request->search . '%')
                  ->orWhere('surname', 'like', '%' . $request->search . '%')
                  ->orWhere('other_names', 'like', '%' . $request->search . '%')
                  ->orWhere('company_name', 'like', '%' . $request->search . '%');
            });
        }

        $parsedStartDate = Carbon::parse($startDate)->startOfDay();
        $parsedEndDate = Carbon::parse($endDate)->endOfDay();
        $query->whereBetween('created_at', [$parsedStartDate, $parsedEndDate]);

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        $query->whereIn('stage', [3, 4]); // Proforma (3) and Saved for Later (4)

        $orders = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        return inertia('BilPosts/Index', [
            'orders' => $orders,
            'filters' => [
                'search'     => $request->input('search'),
                'stage'      => $request->input('stage'),
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ],
        ]);
    }

    /**
     * Show the form for creating a new order.
     */
    public function create()
    {
        return inertia('BilPosts/Create', [
            'fromstore' => SIV_Store::all(),
            'priceCategories' => $this->fetchPriceCategories(),
        ]);
    }

    /**
     * Show a confirmation view before saving a new order.
     * THIS METHOD HAS BEEN RESTORED.
     */
    public function confirmSave(Request $request)
    {
        // Validate the incoming order data
        $validatedData = $request->validate([
            'store_id' => 'required|integer|exists:siv_stores,id',
            'pricecategory_id' => 'required|string',
            'total' => 'required|numeric|min:0',
            'orderitems' => 'required|array|min:1',
            'orderitems.*.item_id' => 'required|integer|exists:bls_items,id',
            'orderitems.*.item_name' => 'required|string',
            'orderitems.*.quantity' => 'required|numeric|min:0.01',
            'orderitems.*.price' => 'required|numeric|min:0',
        ]);

        return inertia('BilPosts/SaveOrderConfirmation', [
            'orderData' => $validatedData
        ]);
    }

    /**
     * Store a newly created order with a "Saved for Later" status.
     */
    public function store(Request $request)
    {
        $this->createOrder($request); // Uses HandlesOrdering trait
        return redirect()->route('billing1.index')->with('success', 'Order created successfully.');
    }

    /**
     * Show the form for editing the specified order.
     */
    public function edit(BILOrder $order)
    {
        $order->load(['customer', 'store', 'orderitems.item']);
        return inertia('BilPosts/Edit', [
            'order' => $order,
            'fromstore' => SIV_Store::all(),
            'priceCategories' => $this->fetchPriceCategories(),
        ]);
    }

    /**
     * Show the confirmation view before updating a saved order.
     */
    public function confirmUpdate(Request $request, BILOrder $order)
    {
        $orderData = $request->all();
        $orderData['id'] = $order->id; // Pass the order ID along

        return inertia('BilPosts/ConfirmOrderUpdate', [
            'orderData' => $orderData,
            'originalOrder' => $order->load('customer'), // Show original details for comparison
        ]);
    }

    /**
     * Update the specified order.
     */
    public function update(Request $request, BILOrder $order)
    {
        $this->updateOrder($request, $order); // Uses HandlesOrdering trait
        return redirect()->route('billing1.index')->with('success', 'Order updated successfully.');
    }

    /**
     * Show the payment processing view for a new order.
     */
    public function confirmPayment(Request $request)
    {
        $validatedData = $request->validate([
            'store_id' => 'required|integer|exists:siv_stores,id',
            'pricecategory_id' => 'required|string',
            'total' => 'required|numeric|min:0',
            'orderitems' => 'required|array|min:1',
            'orderitems.*.item_id' => 'required|integer|exists:bls_items,id',
            'orderitems.*.quantity' => 'required|numeric|min:0.01',
            'orderitems.*.price' => 'required|numeric|min:0',
        ]);

        return inertia('BilPosts/ProcessPayment', [
            'orderData' => $validatedData,
            'facilityoption' => FacilityOption::first(),
            'paymentMethods' => BLSPaymentType::all(),
        ]);
    }

    /**
     * Show the payment view for an existing order.
     */
    public function confirmExistingPayment(Request $request, BILOrder $order)
    {
        $orderData = $request->all();
        $orderData['id'] = $order->id;

        return inertia('BilPosts/ProcessExistingOrderPayment', [
            'orderData' => $orderData,
            'originalOrder' => $order->load('customer'),
            'paymentMethods' => BLSPaymentType::all(),
        ]);
    }
   
    /**
     * Processes the payment and handles Printing logic (Silent vs Preview).
     */
    public function processPayment(Request $request, BILOrder $order = null)
    {
        // 1. Manual ID Check (Same as before)
        if (!$order) {
            $orderId = $request->input('id') ?? $request->input('order');
            if ($orderId) {
                $order = BILOrder::find($orderId);
            }
        }

        // 2. Validation (Same as before)
        $validated = $request->validate([
            'orderitems' => 'required|array|min:1',
            'orderitems.*.id' => 'nullable|exists:bil_orderitems,id',
            'orderitems.*.item_id' => 'required|integer|exists:bls_items,id',
            'orderitems.*.quantity' => 'required|numeric|min:0.01',
            'orderitems.*.price' => 'required|numeric|min:0',
            'payment_method' => 'nullable|integer|exists:bls_paymenttypes,id',
            'paid_amount' => 'nullable|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'customer_id' => 'required|integer|exists:bls_customers,id',
            'store_id' => 'required|integer|exists:siv_stores,id',
        ]);

        try {
            // 3. Database Transaction (Save Sale)
            $sale = DB::transaction(function () use ($validated, $order) {
                $finalOrder = $this->createOrUpdateFinalOrder($validated, $order);
                return $this->postBills($validated, $finalOrder);
            });

            session(['latest_sale_id' => $sale->id]);

            // ============================================================
            // 4. PRINTING LOGIC START
            // ============================================================
            
            // Get Context: Current User Group & Machine Name
            $userGroupId = Auth::user()->usergroup_id;
            $machineName = gethostname(); 

            // Query Configuration
            // We look for a config for this Group + DocType + (Specific Machine OR Any Machine)
            $printerConfig = UserGroupPrinter::where('usergroup_id', $userGroupId)
                ->where('documenttypecode', 'invoice') 
                ->where('autoprint', true) // Must be set to Auto Print
                ->where(function ($query) use ($machineName) {
                    $query->where('machinename', $machineName)
                          ->orWhere('machinename', '')
                          ->orWhereNull('machinename');
                })
                // Order by length of machinename desc so specific matches ("PC-01") come before generic matches ("")
                ->orderByRaw('LENGTH(machinename) DESC') 
                ->first();

            $shouldPrintSilently = false;
            $targetPrinterName = null;

            if ($printerConfig) {
                $targetPrinterName = $printerConfig->printername;
                // If printtoscreen is FALSE (0), we print silently in backend
                // If printtoscreen is TRUE (1), we send URL to frontend
                $shouldPrintSilently = !$printerConfig->printtoscreen;
            }

            // ------------------------------------------------------------
            // HANDLE SILENT BACKEND PRINTING
            // ------------------------------------------------------------
            if ($shouldPrintSilently) {
                
                // A. Generate PDF
                $facility = FacilityOption::first();
                $pdf = Pdf::loadView('pdfs.sale_invoice', [
                    'sale' => $sale,
                    'facility' => $facility,
                ]);

                // B. Save to Temp File
                $fileName = 'invoice_' . $sale->id . '_' . time() . '.pdf';
                $directory = storage_path('app/public/temp_invoices');
                
                if (!file_exists($directory)) {
                    mkdir($directory, 0755, true);
                }
                
                $filePath = $directory . '/' . $fileName;
                $pdf->save($filePath);

                // C. Send to Printer (SumatraPDF)
                $this->printToBackendPrinter($filePath, $targetPrinterName);
            }

            // ============================================================
            // 5. RETURN RESPONSE
            // ============================================================

            // If we printed silently, invoice_url is null (frontend does nothing).
            // If we need preview, invoice_url is the route.
            $invoiceUrl = $shouldPrintSilently ? null : route('billing1.invoice_preview');
            
            $msg = 'Payment processed successfully.';
            if ($shouldPrintSilently) {
                $msg .= ' Sent to printer: ' . $targetPrinterName;
            }

            return response()->json([
                'success' => true,
                'invoice_url' => $invoiceUrl,
                'message' => $msg,
            ]);

        } catch (\Exception $e) {
            Log::error('Error during payment/printing:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'order_id' => $order?->id,
            ]);
            
            return response()->json(['message' => 'An unexpected error occurred: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Helper: Executes the printing command
     */
    /**
     * Helper: Executes the printing command
     */
    private function printToBackendPrinter($filePath, $printerName)
    {
        $printerExe = public_path('SumatraPDF.exe');
        
        if (!file_exists($printerExe)) {
            Log::error("SumatraPDF.exe not found at: " . $printerExe);
            return; 
        }

        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // WINDOWS FIX: 
            // The syntax is: start /B "" "PathToExe" Arguments
            // We add an empty pair of quotes "" after /B so Windows knows the next quoted string is the command, not the title.
            
            $command = "start /B \"\" \"{$printerExe}\" -print-to \"{$printerName}\" -silent \"{$filePath}\"";
            
            pclose(popen($command, "r"));
        } else {
            // Linux/Mac fallback
            $linuxCmd = "lp -d \"{$printerName}\" \"{$filePath}\"";
            exec($linuxCmd);
        }
    }

    //--------------------------------------------------------------------------
    // PRIVATE HELPER METHODS
    //--------------------------------------------------------------------------

    /**
     * Creates a new order or updates an existing one for the final payment stage.
     */
    private function createOrUpdateFinalOrder(array $validated, ?BILOrder $order): BILOrder
    {
        $calculatedTotal = collect($validated['orderitems'])->sum(fn($item) => $item['quantity'] * $item['price']);

        $orderData = [
            'customer_id' => $validated['customer_id'],
            'store_id' => $validated['store_id'],
            'stage' => 5, // Final "Posted" stage
            'total' => $calculatedTotal,
            'user_id' => Auth::id(),
        ];

        if ($order) {
            $order->update($orderData);
        } else {
            $order = BILOrder::create($orderData);
        }

        // Sync order items (add, update, delete)
        $incomingItemIds = collect($validated['orderitems'])->pluck('id')->filter()->all();
        $order->orderitems()->whereNotIn('id', $incomingItemIds)->delete();
        foreach ($validated['orderitems'] as $itemData) {
            $order->orderitems()->updateOrCreate(['id' => $itemData['id'] ?? null], $itemData);
        }

        return $order->fresh(); // Return a fresh instance with all relations
    }

    /**
     * Orchestrates all accounting and inventory posting after a sale is finalized.
     */
    private function postBills(array $data, BILOrder $order):BILSale
    {
        $transdate = Carbon::now();
        $totalDue = $data['total'];
        $paidAmount = $data['paid_amount'] ?? 0;
        $hasPayment = $paidAmount > 0;
        $isCreditSale = $paidAmount < $totalDue;

        // Generate unique numbers only if they are needed
        $receiptNo = $hasPayment ? $this->generateUniqueNumber(BILReceipt::class, 'receiptno', 'REC') : null;
        $invoiceNo = $isCreditSale ? $this->generateUniqueNumber(BILInvoice::class, 'invoiceno', 'INV') : null;
        

       
        $sale = $this->createSaleRecord($data, $transdate, $receiptNo, $invoiceNo);
        $this->createInventoryRequisition($data, $transdate, $order->orderitems, $sale);

        if ($isCreditSale) {
            $this->handleInvoicingAndDebtors($data, $transdate, $invoiceNo, $receiptNo);
        }

        if ($hasPayment && !$isCreditSale) {
            $this->createReceiptRecord($data, $transdate, $receiptNo);
        }

        if ($hasPayment) {
            $paymentSource = $isCreditSale ? PaymentSources::InvoicePayment->value : PaymentSources::CashSale->value;
            $this->createCollectionRecord($data, $transdate, $receiptNo, $paymentSource);
        }

        return $sale;
        
    }

    /**
     * Creates the primary sale record.
     */
    private function createSaleRecord(array $data, Carbon $transdate, ?string $receiptNo, ?string $invoiceNo):BILSale
    {
        $sale = BILSale::create([
            'transdate' => $transdate,
            'customer_id' => $data['customer_id'],
            'receiptno' => $receiptNo,
            'invoiceno' => $invoiceNo,
            'totaldue' => $data['total'],
            'totalpaid' => $data['paid_amount'] ?? 0,
            'changeamount' => max(0, ($data['paid_amount'] ?? 0) - $data['total']),
            'yearpart' => $transdate->year,
            'monthpart' => $transdate->month,
            'transtype' => BillingTransTypes::Sales->value,
            'user_id' => Auth::id(),
        ]);
        $sale->items()->createMany($data['orderitems']);
        return $sale;
    }

    /**
     * Creates an inventory requisition to be processed by the stores department.
     */
    private function createInventoryRequisition(array $data, Carbon $transdate, $orderItems, BILSale $sale): void
    {
        $inventoryService = new InventoryService();
        // Check facility option for affecting stock at cashier
        $facilityOptions = FacilityOption::first();
        $affectstockatcashier = $facilityOptions?->affectstockatcashier ?? true;
        
        $stage = 3;// Ready for inventory issue
        if ($affectstockatcashier) {
            $stage = 4; // Directly issued
        }


        $requisition = IVRequistion::create([
            'sale_id' => $sale->id, 
            'transdate' => $transdate,
            'tostore_id' => $data['customer_id'],
            'tostore_type' => StoreType::Customer->value,
            'fromstore_id' => $data['store_id'],
            'stage' => $stage, 
            'total' => 0,
            'user_id' => Auth::id(),
        ]);

        $requisitionItemsData = [];
        foreach ($orderItems->load('item.product') as $orderItem) {
            if ($product = $orderItem->item->product) {
                $requisitionItemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $orderItem->quantity,
                    'price' => $product->costprice, // Use cost price for inventory value
                ];
            }
        }

        $requisition->requistionitems()->createMany($requisitionItemsData);

        $costTotal = $requisition->requistionitems()->sum(DB::raw('quantity * price'));
        $requisition->update(['total' => $costTotal]);

        
        
        if (!$affectstockatcashier) {
            return; // Skip inventory issue if not affecting stock at cashier
        }

        // Generate a unique delivery number
        $deliveryNo = $this->generateUniqueNumber(IVIssue::class, 'delivery_no', 'ISS');
        $tostore_type = StoreType::Customer->value;
        $customer = BLSCustomer::find($data['customer_id']); 
        $tostore_name = $customer->company_name ?? trim("{$customer->first_name} {$customer->surname}");
         
         // Perform the issuance
        $inventoryService->issue(
            $data['store_id'],
            $data['customer_id'],
            $tostore_type,
            $tostore_name,
            $requisitionItemsData,
            $deliveryNo,
            null // Expiry date is not handled in this part of the form
        );
    }

    /**
     * Handles creation of invoices, debtor records, and all related logs for credit sales.
     */
    private function handleInvoicingAndDebtors(array $data, Carbon $transdate, string $invoiceNo, ?string $receiptNo): void
    {
        $paidAmount = $data['paid_amount'] ?? 0;
        $totalDue = $data['total'];
        $balance = $totalDue - $paidAmount;
        $userId = Auth::id();

        // 1. Create Invoice
        $invoice = BILInvoice::create([
            'transdate' => $transdate, 'customer_id' => $data['customer_id'], 'invoiceno' => $invoiceNo,
            'totaldue' => $totalDue, 'totalpaid' => $paidAmount, 'balancedue' => $balance,
            'status' => $balance <= 0 ? InvoiceStatus::Closed->value : InvoiceStatus::Open->value,
            'yearpart' => $transdate->year, 'monthpart' => $transdate->month, 'user_id' => $userId,
        ]);
        $invoice->items()->createMany($data['orderitems']);

        // 2. Create Invoice Logs
        BILInvoiceLog::create([
            'transdate' => $transdate, 'customer_id' => $data['customer_id'], 'reference' => $invoiceNo,
            'invoiceno' => $invoiceNo, 'debitamount' => $totalDue, 'creditamount' => 0,
            'transtype' => InvoiceTransTypes::NewInvoice->value, 'transdescription' => 'Sales', 'user_id' => $userId,
        ]);
        if ($receiptNo) {
            BILInvoiceLog::create([
                'transdate' => $transdate, 'customer_id' => $data['customer_id'], 'reference' => $receiptNo,
                'invoiceno' => $invoiceNo, 'debitamount' => 0, 'creditamount' => $paidAmount,
                'transtype' => InvoiceTransTypes::Payment->value, 'transdescription' => 'Payment', 'user_id' => $userId,
            ]);
        }

        // 3. Update Debtor Record
        $debtor = BILDebtor::firstOrCreate(
            ['customer_id' => $data['customer_id'], 'debtortype' => 'Individual'],
            ['transdate' => $transdate, 'balance' => 0, 'user_id' => $userId]
        );
        $debtor->increment('balance', $balance);

        // 4. Create Debtor Logs
        BILDebtorLog::create([
            'transdate' => $transdate, 'debtor_id' => $debtor->id, 'reference' => $invoiceNo, 'debtortype' => 'Individual',
            'debitamount' => $totalDue, 'creditamount' => 0, 'transtype' => BillingTransTypes::Invoice->value,
            'transdescription' => 'Sales', 'user_id' => $userId,
        ]);
        if ($receiptNo) {
            BILDebtorLog::create([
                'transdate' => $transdate, 'debtor_id' => $debtor->id, 'reference' => $receiptNo, 'debtortype' => 'Individual',
                'debitamount' => 0, 'creditamount' => $paidAmount, 'transtype' => BillingTransTypes::Payment->value,
                'transdescription' => 'Payment', 'user_id' => $userId,
            ]);
        }

        // 5. Create Invoice Payment Details
        if ($receiptNo) {
            BILInvoicePayment::create([
                'transdate' => $transdate, 'receiptno' => $receiptNo, 'customer_id' => $data['customer_id'],
                'totalpaid' => $paidAmount, 'yearpart' => $transdate->year, 'monthpart' => $transdate->month, 'user_id' => $userId,
            ]);
            BILInvoicePaymentDetail::create([
                'receiptno' => $receiptNo, 'invoiceno' => $invoiceNo, 'totaldue' => $totalDue, 'totalpaid' => $paidAmount,
            ]);
        }
    }

    /**
     * Creates a receipt record for a fully paid cash sale.
     */
    private function createReceiptRecord(array $data, Carbon $transdate, string $receiptNo): void
    {
        $receipt = BILReceipt::create([
            'transdate' => $transdate,
            'customer_id' => $data['customer_id'],
            'receiptno' => $receiptNo,
            'totaldue' => $data['total'],
            'totalpaid' => $data['paid_amount'] ?? 0,
            'changeamount' => max(0, ($data['paid_amount'] ?? 0) - $data['total']),
            'yearpart' => $transdate->year,
            'monthpart' => $transdate->month,
            'user_id' => Auth::id(),
        ]);
        $receipt->items()->createMany($data['orderitems']);
    }

    /**
     * Creates a collection record for any payment received.
     */
    private function createCollectionRecord(array $data, Carbon $transdate, string $receiptNo, string $paymentSource): void
    {
        if (empty($data['payment_method']) || empty($data['paid_amount'])) {
            return;
        }

        $paymentMethodColumn = 'paytype' . str_pad($data['payment_method'], 6, '0', STR_PAD_LEFT);

        BILCollection::create([
            'transdate' => $transdate,
            'receiptno' => $receiptNo,
            'paymentsource' => $paymentSource,
            'customer_id' => $data['customer_id'],
            'yearpart' => $transdate->year,
            'monthpart' => $transdate->month,
            'transtype' => BillingTransTypes::Payment->value,
            'user_id' => Auth::id(),
            $paymentMethodColumn => $data['paid_amount'],
        ]);
    }



    public function invoicePreview()
    {
        $saleId = session('latest_sale_id');
        if (!$saleId) {
            return redirect()->route('billing1.index')->with('error', 'No sale to display.');
        }

        $sale = BILSale::findOrFail($saleId);
        $facility = FacilityOption::first();

        $pdf = Pdf::loadView('pdfs.sale_invoice', [
            'sale' => $sale,
            'facility' => $facility,
        ]);

        // Send PDF with correct headers so browser opens it
        return response($pdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="invoice_' . ($sale->invoiceno ?? $sale->receiptno) . '.pdf"');
    }


}
