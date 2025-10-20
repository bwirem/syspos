<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use Carbon\Carbon;

use App\Models\{   
    BILOrder,
    BILOrderItem,
    BILSale,
    BILReceipt,
    BILInvoice,
    BILInvoiceLog,

    BILInvoicePayment,
    BILInvoicePaymentDetail,
    

    BILDebtor,
    BILDebtorLog,

    BILVoidedSale,
    BILCollection,
    BILRefund,


    IVRequistion,
    IVRequistionItem,

    SIV_Store,
};

use App\Enums\{
    PaymentSources,
    VoidSources,
    InvoiceStatus,
    BillingTransTypes
};



class BilHistoryController extends Controller
{
    /**
     * Display a listing of orders.
     */
    
    public function saleHistory(Request $request)
    {
        // --- 1. SET DEFAULT DATES ---
        $today = now()->format('Y-m-d');

        // Use the dates from the request, OR use today's date as the default.
        $startDate = $request->input('start_date', $today);
        $endDate = $request->input('end_date', $today);

        // --- 2. BUILD THE QUERY ---
        $query = BILSale::with(['items', 'customer']); // Eager load relations

        // Filtering by customer name or invoice number
        if ($request->filled('search')) {
            $searchTerm = '%' . $request->search . '%';
            $query->where(function ($q) use ($searchTerm) {
                $q->whereHas('customer', function ($subQ) use ($searchTerm) {
                    $subQ->where('first_name', 'like', $searchTerm)
                         ->orWhere('surname', 'like', $searchTerm)
                         ->orWhere('other_names', 'like', $searchTerm)
                         ->orWhere('company_name', 'like', $searchTerm);
                })->orWhere('receiptno', 'like', $searchTerm); // Also search by invoice number
            });
        }

        // --- 3. ALWAYS APPLY DATE FILTER ---
        // The date filter is now applied on every request.
        $parsedStartDate = Carbon::parse($startDate)->startOfDay();
        $parsedEndDate = Carbon::parse($endDate)->endOfDay();
        $query->whereBetween('created_at', [$parsedStartDate, $parsedEndDate]);

        // Only show sales that are not voided
        $query->where('voided', '=', 0);

        // Paginate and sort sales, ensuring filters are kept on pagination links
        $sales = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        // --- 4. RETURN DATA TO INERTIA ---
        return inertia('BilHistory/SaleHistory', [
            'sales' => $sales,
            // Explicitly pass the filters that were used for the query back to the frontend.
            'filters' => [
                'search'     => $request->input('search', ''),
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ],
        ]);
    }
     /**
     * Show the form for editing the specified order.
     */
    public function previewSale(BILSale $sale)
    {       
        // Eager load order items and their related items
        $sale->load(['customer','items.item']); 

        return inertia('BilHistory/SalePreview', [
            'sale' => $sale,           
        ]);
    }

   
    public function postVoidSale(Request $request, BILSale $sale)
    {
        try {

            $reasons = $request->input('remarks');
        
            // Validate the request
            $validator = Validator::make($request->all(), [
                'remarks' => 'required|string|max:255',
            ]);
            if ($validator->fails()) {
                return back()->withErrors($validator)->withInput(); 
            }

            // Check if the sale is already voided
            if ($sale->invoiceno) {
                
                $this->voidInvoice($sale->invoiceno, $sale->transdate,$reasons);
               
            }else{
                $this->voidReceipt($sale->receiptno, $sale->transdate,$reasons);
            }            
            

            return back()->with('success', 'Sale voided successfully.');

        } catch (\Exception $e) {
            \Log::error('Failed to void sale: '.$e->getMessage());
            return back()->withErrors(['error' => 'Failed to void sale.']);
        }
    }

   
    public function repaymentHistory(Request $request)
    {
        // --- 1. SET DEFAULT DATES ---
        $today = now()->format('Y-m-d');

        // Use the dates from the request, OR use today's date as the default.
        $startDate = $request->input('start_date', $today);
        $endDate = $request->input('end_date', $today);

        // --- 2. BUILD THE QUERY ---
        $query = BILInvoicePayment::with(['items', 'customer']); // Eager load relations

        // Filtering by customer name OR invoice number
        if ($request->filled('search')) {
            $searchTerm = '%' . $request->search . '%';
            $query->where(function ($q) use ($searchTerm) {
                // Search in the customer relationship
                $q->whereHas('customer', function ($subQ) use ($searchTerm) {
                    $subQ->where('first_name', 'like', $searchTerm)
                         ->orWhere('surname', 'like', $searchTerm)
                         ->orWhere('other_names', 'like', $searchTerm)
                         ->orWhere('company_name', 'like', $searchTerm);
                })
                // Also search for matching invoice numbers in the related items
                ->orWhereHas('items', function ($subQ) use ($searchTerm) {
                    $subQ->where('invoiceno', 'like', $searchTerm);
                });
            });
        }

        // --- 3. ALWAYS APPLY DATE FILTER ---
        // The date filter is now applied on every request using the determined dates.
        $parsedStartDate = Carbon::parse($startDate)->startOfDay();
        $parsedEndDate = Carbon::parse($endDate)->endOfDay();
        $query->whereBetween('created_at', [$parsedStartDate, $parsedEndDate]);

        // Only show repayments that are not voided
        $query->where('voided', '=', 0);

        // Paginate and sort, ensuring filters are kept on pagination links
        $repayments = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        // --- 4. RETURN DATA TO INERTIA ---
        return inertia('BilHistory/RepaymentHistory', [
            'repayments' => $repayments,
            // Explicitly pass the filters that were used for the query.
            'filters' => [
                'search'     => $request->input('search', ''),
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ],
        ]);
    }
     
     /* Show the form for editing the specified order.
     */
    public function previewRepayment(BILInvoicePayment $repayment)
    {       
        // Eager load order items and their related items
        $repayment->load(['customer','items']); 

        return inertia('BilHistory/RepaymentPreview', [
            'repayment' => $repayment,           
        ]);
    }


    public function postVoidRepayment(Request $request, BILInvoicePayment $repayment)
    {
        // 1. Validate the incoming request for remarks
        $validated = $request->validate([
            'remarks' => 'required|string|min:5|max:255',
        ]);

        try {
            // Safety check to prevent voiding an already-voided transaction
            if ($repayment->voided) {
                return back()->with('error', 'This repayment has already been voided.');
            }

            // 2. Delegate the complex reversal logic to the private `voidPayment` function
            $this->voidPayment(
                $repayment,           // Pass the entire payment object
                now(),                 // Use the current timestamp for the void transaction
                $validated['remarks']  // Pass the validated reason
            );

            // 3. On success, redirect back to the same preview page.
            //    This provides a great UX, showing the user the result of their action.
            return redirect()->route('billing4.preview', $repayment->id)
                             ->with('success', 'Repayment voided successfully!');

        } catch (\Exception $e) {
            // Catch any exceptions from the database transaction
            \Log::error('Failed to void repayment: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return back()->with('error', 'An unexpected error occurred while voiding the repayment.');
        }
    }

    public function voidHistory(Request $request)
    {
        // --- 1. SET DEFAULT DATES ---
        $today = now()->format('Y-m-d');

        // Use the dates from the request, OR use today's date as the default.
        $startDate = $request->input('start_date', $today);
        $endDate = $request->input('end_date', $today);

        // --- 2. BUILD THE QUERY ---
        $query = BILVoidedSale::with(['items', 'customer']); // Eager load relations

        // Filtering by customer name OR invoice number
        if ($request->filled('search')) {
            $searchTerm = '%' . $request->search . '%';
            $query->where(function ($q) use ($searchTerm) {
                $q->whereHas('customer', function ($subQ) use ($searchTerm) {
                    $subQ->where('first_name', 'like', $searchTerm)
                         ->orWhere('surname', 'like', $searchTerm)
                         ->orWhere('other_names', 'like', $searchTerm)
                         ->orWhere('company_name', 'like', $searchTerm);
                })->orWhere('invoice_number', 'like', $searchTerm); // Also search by invoice number
            });
        }

        // --- 3. ALWAYS APPLY DATE FILTER ---
        // The date filter is now applied on every request.
        $parsedStartDate = Carbon::parse($startDate)->startOfDay();
        $parsedEndDate = Carbon::parse($endDate)->endOfDay();
        $query->whereBetween('created_at', [$parsedStartDate, $parsedEndDate]);

        // Paginate and sort, ensuring filters are kept on pagination links
        $voidsales = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        // --- 4. RETURN DATA TO INERTIA ---
        return inertia('BilHistory/VoidHistory', [
            'voidsales' => $voidsales,
            // Explicitly pass the filters that were used for the query back to the frontend.
            'filters' => [
                'search'     => $request->input('search', ''),
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ],
        ]);
    }

     /* Show the form for editing the specified order.
     */
    public function previewVoid(BILVoidedSale $voidsale)
    {       
        // Eager load order items and their related items
        $voidsale->load(['customer','items']); 

        return inertia('BilHistory/VoidPreview', [
            'sale' => $voidsale,           
        ]);
    }

    /*
    * You will also need a NEW method to show the refund page.
    * Add this method to your controller.
    */
    public function createRefund(BILVoidedSale $voidsale)
    {
        // You can also load relationships here if needed by Refund.jsx
        $voidsale->load(['customer']);
        $paymentMethods = DB::table('bls_paymenttypes')->select('id', 'name')->get();

        return inertia('BilHistory/VoidRefund', [ // Renders the new Refund.jsx component
            'voided_sale' => $voidsale,
            'payment_methods' => $paymentMethods,
        ]);
    }

    private function voidReceipt($receiptno, $transdate,$reasons)
    {
        // Parse year and month parts
        $yearpart = Carbon::parse($transdate)->year;
        $monthpart = Carbon::parse($transdate)->month;
    
        // Generate unique void number
        $voidno = $this->generateUniqueNumber('VOD', 'voidno');
    
        // Fetch the receipt by ID
        $receipt = BILReceipt::where('receiptno', $receiptno)->first();

    
        // Start a database transaction
        DB::transaction(function () use ($receipt, $transdate, $voidno, $reasons, $yearpart, $monthpart) {
            // Update the receipt to mark as voided
            $receipt->update([
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::SaleCancellation->value,
                'voiduser_id' => Auth::id(),
            ]);

            // Fetch the sale first
            $sale = BILSale::where('receiptno', $receipt->receiptno)->first();

            // Update the sale to mark as voided
            $sale->update([
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::SaleCancellation->value,
                'voiduser_id' => Auth::id(),
            ]);
    
            // Insert into BILVoidedSale
            $voidedsale = BILVoidedSale::create([
                'transdate' => $transdate,
                'customer_id' => $receipt->customer_id,
                'receiptno'=> $receipt->receiptno,
                'totaldue' => $receipt->totaldue,
                'totalpaid' => $receipt->totalpaid,
                'balancedue' => $receipt->totaldue - $receipt->totalpaid,
                'voidsource' => VoidSources::CashSale->value, // Accessing enum value
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'voiduser_id' => Auth::id(),
                'currency_id' => $receipt->currency_id,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::SaleCancellation->value,
                'user_id' => $receipt->user_id,
                'reasons' => $reasons,
            ]);
    
            // Fetch receipt items for the given receipt number
            $receiptItems = $receipt->items;
    
            // Iterate over the receipt items
            foreach ($receiptItems as $receiptItem) {
                // Prepare data for voided sales item with negative quantity for void
                $voidedSalesItemData = [
                    'item_id' => $receiptItem->item_id,
                    'quantity' => -$receiptItem->quantity, // Mark as voided by setting a negative quantity
                    'price' => $receiptItem->price,
                ];

                // Insert into BILVoidedSalesItems table for the receipt
                $receipt->items()->create($voidedSalesItemData);

                // Insert into BILVoidedSalesItems table for the sale
                $sale->items()->create($voidedSalesItemData);

                // Prepare data for the voided sales item to be associated with the voided sale
                $voidedSalesItemData['quantity'] = $receiptItem->quantity; // Positive quantity for voided item in the voided sale

                // Insert into BILVoidedSalesItems table for the voided sale
                $voidedsale->items()->create($voidedSalesItemData);
            }


        });
    
        // Any additional logic after the transaction (optional)
    }
     
    private function voidInvoice($invoiceno, $transdate, $reasons)
    {               
        // --- PREPARATION ---
        $yearpart = Carbon::parse($transdate)->year;
        $monthpart = Carbon::parse($transdate)->month;
        $voidno = $this->generateUniqueNumber('VOD', 'voidno');       
        $invoice = BILInvoice::where('invoiceno', $invoiceno)->firstOrFail();

        // --- ATOMIC TRANSACTION ---
        DB::transaction(function () use ($invoice, $transdate, $voidno, $reasons, $yearpart, $monthpart) {
            
            // --- 1. FIND AND VOID ALL ASSOCIATED PAYMENTS FIRST ---
            // This reverses the cash side and debits the customer for the voided payments.
            $paymentDetails = BILInvoicePaymentDetail::where('invoiceno', $invoice->invoiceno)->get();
            
            foreach ($paymentDetails as $detail) {
                $payment = BILInvoicePayment::where('receiptno', $detail->receiptno)->where('voided', 0)->first();
                if ($payment) {
                    // Call the separate voidPayment function for each payment found.
                    // It will handle its own debtor log and balance adjustments.
                    $this->voidPayment($payment->id, $transdate, "Voided due to cancellation of Invoice #{$invoice->invoiceno}");
                }
            }

            // --- 2. UPDATE THE INVOICE RECORD TO VOIDED ---
            $invoice->update([
                'status' => InvoiceStatus::Cancelled->value,  
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::SaleCancellation->value,
                'voiduser_id' => Auth::id(),
            ]);

            // --- 3. UPDATE THE CORRESPONDING SALE RECORD ---
            $sale = BILSale::where('invoiceno', $invoice->invoiceno)->first();
            if ($sale) {
                $sale->update([                 
                    'voided' => 1,
                    'voidsysdate' => now(),
                    'voidtransdate' => $transdate,
                    'voidno' => $voidno,
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart,
                    'transtype' => BillingTransTypes::SaleCancellation->value,
                    'voiduser_id' => Auth::id(),
                ]);
            }
        
            // --- 4. CREATE THE PRIMARY HISTORICAL VOIDED SALE RECORD ---
            $voidedsale = BILVoidedSale::create([
                'transdate' => $transdate,
                'customer_id' => $invoice->customer_id, 
                'invoiceno'=> $invoice->invoiceno,
                'totaldue' => $invoice->totaldue,
                'totalpaid' => $invoice->totalpaid, // Store the original paid amount for historical record
                'balancedue' => $invoice->balancedue, 
                'paidforinvoice' => $invoice->paidforinvoice,  
                'status' => InvoiceStatus::Cancelled->value,                
                'voidsource' => VoidSources::InvoiceSale->value,
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'voiduser_id' => Auth::id(),
                'currency_id' => $invoice->currency_id,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::SaleCancellation->value,
                'user_id' => $invoice->user_id,
                'reasons' => $reasons,
            ]);
            
            // --- 5. REVERSE INVENTORY/STOCK BY CREATING NEGATIVE ITEM ENTRIES ---
            $invoiceItems = $invoice->items()->where('quantity', '>', 0)->get(); // Get original items, not reversals
        
            foreach ($invoiceItems as $invoiceItem) {
                // Data for negative quantity entries to reverse stock
                $reversalItemData = [
                    'item_id' => $invoiceItem->item_id,
                    'quantity' => -$invoiceItem->quantity, // Negative quantity
                    'price' => $invoiceItem->price,
                ];

                // Create reversal item on the original invoice
                $invoice->items()->create($reversalItemData);

                // Create reversal item on the original sale if it exists
                if ($sale) {
                    $sale->items()->create($reversalItemData);
                }

                // Data for the historical voided sale record (with positive quantity)
                $historicalItemData = [
                    'item_id' => $invoiceItem->item_id,
                    'quantity' => $invoiceItem->quantity, // Positive quantity
                    'price' => $invoiceItem->price,
                ];

                // Log the original item in the new voided sale record
                $voidedsale->items()->create($historicalItemData);
            }

            // --- 6. REVERSE THE ORIGINAL DEBT CREATION FROM THE DEBTOR'S ACCOUNT ---
            $debtor = BILDebtor::where('customer_id', $invoice->customer_id)->first();
            
            if ($debtor) {
                // Decrement the balance by the FULL ORIGINAL INVOICE AMOUNT (`totaldue`).
                // This reverses the initial debt. The payment reversals were handled in step 1.
                $debtor->decrement('balance', $invoice->totaldue);

                // Create a log entry for this reversal. This is a CREDIT to the customer's account.
                BILDebtorLog::create([
                    'transdate' => $transdate,
                    'debtor_id' => $debtor->id,
                    'reference' => $voidno,
                    'debtortype' => "Individual", // Or determine dynamically
                    'debitamount' => 0,
                    'creditamount' => $invoice->totaldue, // Credit the full original amount
                    'transtype' => BillingTransTypes::SaleCancellation->value,
                    'transdescription' => "Cancellation of Invoice #{$invoice->invoiceno}", 
                    'user_id' => auth()->id(),
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart,
                ]);
            }
        });
    }

    private function voidPayment(BILInvoicePayment $payment, $transdate, $reasons)
    {               
        $yearpart = $transdate->year;
        $monthpart = $transdate->month;
        $voidno = $this->generateUniqueNumber('VOD', 'voidno');
    
        // Use a single, atomic database transaction for the entire reversal process.
        // If any step fails, all previous steps will be rolled back.
        DB::transaction(function () use ($payment, $transdate, $voidno, $reasons, $yearpart, $monthpart) {
            
            // --- Step 1: Void the main BILInvoicePayment record ---
            $payment->update([              
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::PaymentCancellation->value,
                'voiduser_id' => Auth::id(),
            ]);           
    
            // --- Step 2: Create a historical BILVoidedSale record ---
            // This acts as an audit log and a trigger for the separate refund process.
            BILVoidedSale::create([
                'transdate' => $transdate,
                'customer_id' => $payment->customer_id,  
                'receiptno' => $payment->receiptno,                
                'totalpaid' => $payment->totalpaid, // The amount that is now potentially refundable
                'voidsource' => VoidSources::InvoicePayment->value,
                'voided' => 1,
                'voidsysdate' => now(),
                'voidtransdate' => $transdate,
                'voidno' => $voidno,
                'voiduser_id' => Auth::id(),
                'currency_id' => $payment->currency_id,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::PaymentCancellation->value,
                'user_id' => $payment->user_id,
                'reasons' => $reasons,
            ]);

            // --- Step 3: Reverse the payment's effect on all related Invoices ---
            $paymentDetails = BILInvoicePaymentDetail::where('receiptno', $payment->receiptno)->get();

            foreach($paymentDetails as $detail) {
                $invoice = BILInvoice::where('invoiceno', $detail->invoiceno)->first();
                if ($invoice) {
                    // Re-establish the debt on the invoice by reversing the paid amounts.
                    $invoice->increment('balancedue', $detail->totalpaid);
                    $invoice->decrement('totalpaid', $detail->totalpaid);

                    // If the payment had closed the invoice, re-open it.
                    if ($invoice->status == InvoiceStatus::Closed->value) {
                        $invoice->status = InvoiceStatus::Open->value;
                    }
                    $invoice->save();

                    // Create a reversal log in the BILInvoiceLog (a DEBIT for the invoice).
                    BILInvoiceLog::create([
                        'transdate' => $transdate,
                        'customer_id' => $invoice->customer_id,
                        'reference' => $voidno, // Use the void number as the reference
                        'invoiceno' => $invoice->invoiceno,
                        'debitamount' => $detail->totalpaid, // The reversed payment is a debit
                        'creditamount' => 0, 
                        'yearpart' => $yearpart,
                        'monthpart' => $monthpart,                 
                        'transtype' => BillingTransTypes::PaymentCancellation->value,
                        'transdescription' => "Reversal for Payment #{$payment->receiptno}", 
                        'user_id' => Auth::id(),
                    ]);
                }
            }

            // --- Step 4: Reverse the payment's effect on the customer's overall Debtor balance ---
            $debtor = BILDebtor::where('customer_id', $payment->customer_id)->first();
            if ($debtor) {
                // The customer owes the money again, so their total balance increases.
                $debtor->increment('balance', $payment->totalpaid);

                // Create a reversal log in the BILDebtorLog (a DEBIT to the customer's account).
                BILDebtorLog::create([
                    'transdate' => $transdate,
                    'debtor_id' => $debtor->id,
                    'reference' => $voidno,
                    'debtortype' => "Individual", // This can be made dynamic if needed
                    'debitamount' => $payment->totalpaid, // The full payment amount is now a debit
                    'creditamount' => 0,
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart,
                    'transtype' => BillingTransTypes::PaymentCancellation->value,
                    'transdescription' => "Payment Reversal #{$payment->receiptno}", 
                    'user_id' => auth()->id(),
                ]);
            }

        });
            
    }
    
    public function storeRefund(Request $request, BILVoidedSale $voidsale)
    {
        // --- 1. VALIDATION ---
        $maxRefundable = $voidsale->totalpaid - $voidsale->refunded_amount;

        $validated = $request->validate([
            'transdate' => 'required|date',
            // Ensure the refund amount is not more than what is available to be refunded
            'refund_amount' => "required|numeric|min:0.01|max:{$maxRefundable}",
            'paymentmethod_id' => 'required|exists:bls_paymenttypes,id',
            'remarks' => 'nullable|string|max:255',
            'voidedsale_id' => 'required|exists:bil_voidedsales,id',
        ]);

        // --- 2. DATABASE TRANSACTION ---
        DB::transaction(function () use ($validated, $voidsale) {

            // --- A. PREPARE COMMON DATA ---
            $transdate = Carbon::parse($validated['transdate']);
            $yearpart = $transdate->year;
            $monthpart = $transdate->month;
            $refundAmount = $validated['refund_amount'];
            $refundNo = $this->generateUniqueRefundNumber('REF', 'refundno');

            // --- B. CREATE THE REFUND RECORD ---
            BILRefund::create([
                'transdate' => $transdate,
                'refundno' => $refundNo,
                'customer_id' => $voidsale->customer_id,
                'voidedsale_id' => $voidsale->id,
                'refund_amount' => $refundAmount,
                'paymentmethod_id' => $validated['paymentmethod_id'],
                'remarks' => $validated['remarks'],
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::Refund->value,
                'user_id' => Auth::id(),
            ]);

            // --- C. UPDATE THE VOIDED SALE RECORD ---
            $voidsale->increment('refunded_amount', $refundAmount);
            // Check if it's now fully refunded
            if ($voidsale->refunded_amount >= $voidsale->totalpaid) {
                $voidsale->is_refunded = true;
            }
            $voidsale->save();

            // --- D. CREATE A NEGATIVE COLLECTION ENTRY ---
            $paymentMethodColumn = 'paytype' . str_pad($validated['paymentmethod_id'], 6, '0', STR_PAD_LEFT);
            BILCollection::create([
                'transdate' => $transdate,
                'receiptno' => $refundNo, // Use refund number as the reference
                'paymentsource' => $voidsale->voidsource, // Same source as the void
                'customer_id' => $voidsale->customer_id,
                $paymentMethodColumn => -$refundAmount, // **CRITICAL: Negative amount**
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::Refund->value,
                'user_id' => Auth::id(),
            ]);

            // --- E. UPDATE DEBTOR/CREDITOR BALANCE (IF IT WAS AN INVOICE) ---
            // A refund means the company owes the customer money, or owes them more.
            // This reduces the customer's liability (debt) to the company.
            if ($voidsale->voidsource === VoidSources::InvoiceSale->value || $voidsale->voidsource === VoidSources::InvoicePayment->value) {
                
                $debtor = BILDebtor::where('customer_id', $voidsale->customer_id)->first();

                if ($debtor) {
                    // Decrementing the balance. If it goes negative, the customer is a creditor.
                    $debtor->decrement('balance', $refundAmount);

                    // Create a log entry for the refund. A debit from the company's books.
                    BILDebtorLog::create([
                        'transdate' => $transdate,
                        'debtor_id' => $debtor->id,
                        'reference' => $refundNo,
                        'debtortype' => "Individual", // Or determine dynamically if needed
                        'debitamount' => $refundAmount, // Money going out from company to customer
                        'creditamount' => 0,
                        'transtype' => BillingTransTypes::Refund->value,
                        'transdescription' => "Refund for Voided Sale: " . ($voidsale->invoice_number ?: $voidsale->receiptno),
                        'user_id' => Auth::id(),
                    ]);
                }
            }
        });

        // --- 3. REDIRECT ON SUCCESS ---
        return redirect()->route('billing5.voidsalehistory')->with('success', 'Refund processed successfully!');
    }


     /**
     * Generates a unique number for a refund.
     *
     * @param string $prefix
     * @param string $column
     * @return string
     */
    private function generateUniqueRefundNumber($prefix, $column)
    {
        do {
            // Using a more robust method for uniqueness
            $number = $prefix . Carbon::now()->format('YmdHis') . rand(10, 99);
        } while (BILRefund::where($column, $number)->exists());

        return $number;
    }


     private function generateUniqueNumber($prefix, $column)
     {
         do {
             $number = $prefix . time() . rand(100, 999); // Add randomness to avoid collisions
         } while (BILVoidedSale::where($column, $number)->exists());
 
         return $number;
     }
 
     // viewCollectionByReceipt
     public function viewCollectionByReceipt($receiptNo,$voidSource)
     {       
         
         
         $paymentSource = PaymentSources::CashSale->value;
         if ($voidSource == VoidSources::InvoicePayment->value)
         {
             $paymentSource = PaymentSources::InvoicePayment->value;
         }
     
         try {
             // Fetch the collection data using the BILCollection model
             $collection = $this->getCollectionByReceiptAndSource($receiptNo, $paymentSource);
     
             // Check if collections were found
             if (!$collection) {
                 return response()->json(['success' => false, 'message' => 'No collections found.'], 404);
             }
     
             // Retrieve payment types and key by code for fast access
             $paymentTypes = $this->getPaymentTypes();
     
             // Prepare the payments made array
             $paymentsMade = $this->preparePaymentsMade($collection, $paymentTypes);
     
             return response()->json(['success' => true, 'data' => $paymentsMade]);
     
         } catch (\Exception $ex) {
             return response()->json(['success' => false, 'error' => $ex->getMessage()], 500);
         }
     }
     
     /**
      * Get the collection data for a specific receipt and payment source.
      *
      * @param string $receiptNo
      * @param int $paymentSource
      * @return \Illuminate\Database\Eloquent\Model|null
      */
     private function getCollectionByReceiptAndSource($receiptNo, $paymentSource)
     {
         return BILCollection::select(DB::raw($this->getSumColumns()))
             ->where('receiptno', $receiptNo)
             ->where('paymentsource', $paymentSource)
             ->first(); // Use first() for a single result
     }
     
     /**
      * Retrieve payment types from the database.
      *
      * @return \Illuminate\Support\Collection
      */
     private function getPaymentTypes()
     {
         return DB::table('bls_paymenttypes')->pluck('description', 'id');
     }
     
     /**
      * Prepare the array of payments made from the collection data.
      *
      * @param object $collection
      * @param \Illuminate\Support\Collection $paymentTypes
      * @return array
      */
     private function preparePaymentsMade($collection, $paymentTypes)
     {
         $paymentsMade = [];
     
         foreach ($collection->toArray() as $key => $value) {
             if (str_starts_with($key, 'paytype')) {
                 $payTypeCode = strtolower($key);
                 $payTypeNumber = ltrim(substr($payTypeCode, strlen('paytype')), '0');
                 $payTypeDescription = $paymentTypes->get($payTypeNumber, $payTypeCode);
     
                 $paymentsMade[] = [
                     'paytypecode' => $payTypeCode,
                     'paytypedescription' => trim($payTypeDescription),
                     'paidamount' => $value,
                     'refundedamount' => 0, // Adjust if refund logic is required
                 ];
             }
         }
     
         return $paymentsMade;
     }
     
     /**
      * Helper function to get sum columns.
      *
      * @return string
      */
     private function getSumColumns()
     {
         // Directly query `information_schema.columns` for column names (compatible with older MySQL)
         $columns = DB::table('information_schema.columns')
             ->where('table_schema', config('database.connections.mysql.database')) // Current database
             ->where('table_name', 'bil_collections') // Target table
             ->pluck('column_name'); // Fetch column names
     
         // Filter columns that start with "paytype" (case-insensitive)
         $paytypeColumns = array_filter($columns->toArray(), function ($column) {
             return stripos($column, 'paytype') === 0;
         });
     
         // If no matching columns exist, return an empty string
         if (empty($paytypeColumns)) {
             return '';
         }
     
         // Create the SUM() expressions for each matching column
         return implode(', ', array_map(function ($column) {
             return "SUM($column) AS $column";
         }, $paytypeColumns));
     }   
}
