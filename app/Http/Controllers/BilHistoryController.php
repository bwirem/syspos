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
        $query = BILSale::with(['items', 'customer']); // Eager load sale items and customer

        // Filtering by customer name using relationship
        if ($request->filled('search')) {
            $query->whereHas('customer', function ($q) use ($request) {
                $q->where('first_name', 'like', '%' . $request->search . '%')
                    ->orWhere('surname', 'like', '%' . $request->search . '%')
                    ->orWhere('other_names', 'like', '%' . $request->search . '%')
                    ->orWhere('company_name', 'like', '%' . $request->search . '%');
            });
        }

        // Add the date range filter
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $startDate = Carbon::parse($request->start_date)->startOfDay();
            $endDate = Carbon::parse($request->end_date)->endOfDay(); // Set time to the end of the day
            $query->whereBetween('created_at', [$startDate, $endDate]);
        }

        $query->where('voided', '=', 0);

        // Paginate and sort sales
        $sales = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('BilHistory/SaleHistory', [
            'sales' => $sales,
            'filters' => $request->only(['search', 'start_date', 'end_date']),
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
         $query = BILInvoicePayment::with(['items', 'customer']); // Eager load repayment items and customer
     
         // Filtering by customer name using relationship
         if ($request->filled('search')) {
            $query->whereHas('customer', function ($q) use ($request) {                 
                $q->where('first_name', 'like', '%' . $request->search . '%')
               ->orWhere('surname', 'like', '%' . $request->search . '%')
               ->orWhere('other_names', 'like', '%' . $request->search . '%')
               ->orWhere('company_name', 'like', '%' . $request->search . '%');
            });
        }
     
        $query->where('voided', '=', 0);

         // Paginate and sort repayments
         $repayments = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('BilHistory/RepaymentHistory', [
             'repayments' => $repayments,
             'filters' => $request->only(['search']),
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

        return redirect()->route('billing4.preview')->with('success', 'Repayments voided successfully.');
    
    }

    public function voidHistory(Request $request)
    {
    $query = BILVoidedSale::with(['items', 'customer']); // Eager load repayment items and customer
    
    
        // Filtering by customer name using relationship
        if ($request->filled('search')) {
        $query->whereHas('customer', function ($q) use ($request) {                 
            $q->where('first_name', 'like', '%' . $request->search . '%')
            ->orWhere('surname', 'like', '%' . $request->search . '%')
            ->orWhere('other_names', 'like', '%' . $request->search . '%')
            ->orWhere('company_name', 'like', '%' . $request->search . '%');
        });
    }
    
    
        // Paginate and sort voids
        $voidsales = $query->orderBy('created_at', 'desc')->paginate(10);
    
        return inertia('BilHistory/VoidHistory', [
            'voidsales' => $voidsales,
            'filters' => $request->only(['search']),
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
     
     private function voidInvoice($invoiceno, $transdate,$reasons)
     {               
         // Parse year and month parts
         $yearpart = Carbon::parse($transdate)->year;
         $monthpart = Carbon::parse($transdate)->month;
     
         // Generate unique void number
         $voidno = $this->generateUniqueNumber('VOD', 'voidno');       
  
         $invoice = BILInvoice::where('invoiceno', $invoiceno)->first();
     
         // Start a database transaction
         DB::transaction(function () use ($invoice, $transdate, $voidno, $reasons, $yearpart, $monthpart) {
             
             $DebtorType = "Individual";
             $TransDescription = "Voided Invoice";            
             
             // Update the receipt to mark as voided
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
 
             // Fetch the sale first
             $sale = BILSale::where('invoiceno', $invoice->invoiceno)->first();
 
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
                 'customer_id' => $invoice->customer_id, 
 
                 'invoiceno'=> $invoice->invoiceno,
                 'totaldue' => $invoice->totaldue,
                 'totalpaid' => $invoice->totalpaid,
                 'balancedue' => $invoice->balancedue, 
                 'paidforinvoice' => $invoice->paidforinvoice,  
 
                 'status' => InvoiceStatus::Cancelled->value,                
                 'voidsource' => VoidSources::InvoiceSale->value, // Accessing enum value
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
                
             // Fetch receipt items for the given receipt number
             $invoiceItems = $invoice->items;
     
             // Iterate over the receipt items
             foreach ($invoiceItems as $invoiceItem) {
                 // Prepare data for voided sales item with negative quantity for void
                 $voidedSalesItemData = [
                     'item_id' => $invoiceItem->item_id,
                     'quantity' => -$invoiceItem->quantity, // Mark as voided by setting a negative quantity
                     'price' => $invoiceItem->price,
                 ];
 
                 // Insert into BILVoidedSalesItems table for the receipt
                 $invoice->items()->create($voidedSalesItemData);
 
                 // Insert into BILVoidedSalesItems table for the sale
                 $sale->items()->create($voidedSalesItemData);
 
                 // Prepare data for the voided sales item to be associated with the voided sale
                 $voidedSalesItemData['quantity'] = $invoiceItem->quantity; // Positive quantity for voided item in the voided sale
 
                 // Insert into BILVoidedSalesItems table for the voided sale
                 $voidedsale->items()->create($voidedSalesItemData);
             }
 
            
             // Check if the debtor record exists
              $debtor = BILDebtor::where('customer_id', $invoice->customer_id)
              ->where('debtortype', $DebtorType)
              ->first();            
              $debtor->decrement('balance', $invoice['balancedue']);
  
              // Insert a debit transaction into the debtor logs            
              BILDebtorLog::create([
                  'transdate' => $transdate,
                  'debtor_id' => $debtor->id,
                  'reference' => $voidno,
                  'debtortype' => $DebtorType,
                  'debitamount' => 0,
                  'creditamount' => $invoice->balancedue,
                  'transtype' => BillingTransTypes::SaleCancellation->value,
                  'transdescription' => $TransDescription, 
                  'user_id' => auth()->id(),
              ]);
 
 
         });
     
         // Any additional logic after the transaction (optional)
     }  
 
     private function voidPayment($id, $transdate,$reasons)
     {               
         // Parse year and month parts
         $yearpart = Carbon::parse($transdate)->year;
         $monthpart = Carbon::parse($transdate)->month;
     
         // Generate unique void number
         $voidno = $this->generateUniqueNumber('VOD', 'voidno');
     
         // Fetch the receipt by ID       
         $payment = BILInvoicePayment::findOrFail($id);
     
         // Start a database transaction
         DB::transaction(function () use ($payment, $transdate, $voidno, $reasons, $yearpart, $monthpart) {
                        
             // Update the receipt to mark as voided
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
     
             // Insert into BILVoidedSale
             $voidedsale = BILVoidedSale::create([
                 'transdate' => $transdate,
                 'customer_id' => $payment->customer_id,  
                 
                 'receiptno'=> $payment->receiptno,                
                 'totaldue' => $payment->totaldue,
                 'totalpaid' => $payment->totalpaid,                
 
                 'voidsource' => VoidSources::InvoicePayment->value, // Accessing enum value
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
 
         });
     
         // Any additional logic after the transaction (optional)
     } 
     
     private function voidRefund($id,$transdate,$reasons)    
     {
         
         $voidedsale = BILVoidedSale::findOrFail($id);        
 
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
