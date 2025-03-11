<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
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
};

use App\Enums\{
    VoidSources,
    BillingTransTypes,
    InvoiceStatus,
    PaymentSources,
    InvoiceTransTypes
};

class BilPostController extends Controller
{
    /**
     * Display a listing of orders.
     */
    
     public function index(Request $request)
     {
         $query = BILOrder::with(['orderitems', 'customer']); // Eager load order items and customer
     
         // Filtering by customer name using relationship
         if ($request->filled('search')) {
             $query->whereHas('customer', function ($q) use ($request) {
                 $q->where('name', 'like', '%' . $request->search . '%');
             });
         }
     
         // Filtering by stage (Ensure 'stage' exists in the BILOrder model)
         if ($request->filled('stage')) {
             $query->where('stage', $request->stage);
         }

         $query->where('stage', '>=', '3');
     
         // Paginate and sort orders
         $orders = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('BilPosts/Index', [
             'orders' => $orders,
             'filters' => $request->only(['search', 'stage']),
         ]);
     }
     

    /**
     * Show the form for creating a new order.
     */
    public function create()
    {
        return inertia('BilPosts/Create');
    }

    /**
     * Store a newly created order in storage.
     */
    
     public function store(Request $request)
     {
         // Validate input
         $validated = $request->validate([             
             'customer_id' => 'required|exists:bls_customers,id', //validate customer id             
             'store_id' => 'required|exists:siv_stores,id', //validate store id       
             'stage' => 'required|integer|min:1',
             'orderitems' => 'required|array',
             'orderitems.*.item_id' => 'required|exists:bls_items,id',  
             'orderitems.*.quantity' => 'required|numeric|min:0',
             'orderitems.*.price' => 'required|numeric|min:0', 
         ]);
     
         // Begin database transaction
         DB::transaction(function () use ($validated) {
             // Create the order without a total initially
             $order = BILOrder::create([
                 'customer_id' => $validated['customer_id'],
                 'store_id' => $validated['store_id'],
                 'stage' => $validated['stage'],
                 'total' => 0, // Set an initial total (will update later)
                 'user_id' => Auth::id(),
             ]);    
     
             // Create associated order items
             foreach ($validated['orderitems'] as $item) {
                 $order->orderitems()->create([
                     'item_id' => $item['item_id'],
                     'quantity' => $item['quantity'],
                     'price' => $item['price'],
                 ]);
             }
     
             // Reload the relationship to ensure all items are fetched
             $order->load('orderitems');
     
             // Compute the total based on updated order items
             $calculatedTotal = $order->orderitems->sum(fn($item) => $item->quantity * $item->price);
     
             // Update order with the correct total
             $order->update(['total' => $calculatedTotal]);
         });
     
         return redirect()->route('billing1.index')->with('success', 'Order created successfully.');
     }     

    /**
     * Show the form for editing the specified order.
     */
    public function edit(BILOrder $order)
    {       
        // Eager load order items and their related items
        $order->load(['customer', 'store', 'orderitems.item']); 

        return inertia('BilPosts/Edit', [
            'order' => $order,
        ]);
    }


    /**
     * Update the specified order in storage.
     */

     public function update(Request $request, BILOrder $order)
     {
         // Validate input
         $validated = $request->validate([             
             'customer_id' => 'required|exists:bls_customers,id', //validate customer id             
             'store_id' => 'required|exists:siv_stores,id', //validate store id       
             'total' => 'required|numeric|min:0',
             'stage' => 'required|integer|min:1',
             'orderitems' => 'required|array',
             'orderitems.*.id' => 'nullable|exists:bil_orderitems,id',
             'orderitems.*.item_id' => 'required|exists:bls_items,id',
             'orderitems.*.quantity' => 'required|numeric|min:0',
             'orderitems.*.price' => 'required|numeric|min:0',
         ]);
     
         // Update the order within a transaction
         DB::transaction(function () use ($validated, $order) {
             // Retrieve existing item IDs before the update
             $oldItemIds = $order->orderitems()->pluck('id')->toArray();
             
             $existingItemIds = [];
             $newItems = [];
     
             foreach ($validated['orderitems'] as $item) {
                 if (!empty($item['id'])) {
                     $existingItemIds[] = $item['id'];
                 } else {
                     $newItems[] = $item;
                 }
             }
     
             // Identify and delete removed items
             $itemsToDelete = array_diff($oldItemIds, $existingItemIds);
             $order->orderitems()->whereIn('id', $itemsToDelete)->delete();
     
             // Add new items
             foreach ($newItems as $item) {
                 $order->orderitems()->create([
                     'item_id' => $item['item_id'],
                     'quantity' => $item['quantity'],
                     'price' => $item['price'],
                 ]);
             }
     
             // Update existing items
             foreach ($validated['orderitems'] as $item) {
                 if (!empty($item['id'])) {
                     $orderItem = BILOrderItem::find($item['id']);
     
                     if ($orderItem) {
                         $orderItem->update([
                             'item_id' => $item['item_id'],
                             'quantity' => $item['quantity'],
                             'price' => $item['price'],
                         ]);
                     }
                 }
             }
     
             // Compute the total based on updated order items
             $calculatedTotal = $order->orderitems->sum(fn($item) => $item->quantity * $item->price);
     
             // Update the order details
             $order->update([                 
                 'customer_id' => $validated['customer_id'],                 
                 'store_id' => $validated['store_id'],
                 'stage' => $validated['stage'],
                 'total' => $calculatedTotal,
                 'user_id' => Auth::id(),
             ]);
         });
     
         return redirect()->route('billing1.index')->with('success', 'Order updated successfully.');
     }
     
     
    
    /**
     * Remove the specified order from storage.
     */
    public function destroy(BILOrder $order)
    {
        // Delete the order and associated items
        $order->orderitems()->delete();
        $order->delete();

        return redirect()->route('billing1.index')
            ->with('success', 'Order deleted successfully.');
    }

    // ... other methods

    public function pay(Request $request, $order = null)
    {
        // Log::info('Start processing payment:', ['order' => $order, 'request_data' => $request->all()]);

        try {
                if ($order) {
                // Edit mode: Handle PUT request with order ID
                $validator = Validator::make($request->all(), [
                    'orderitems' => 'required|array',
                    'orderitems.*.item_id' => 'required|integer',
                    'orderitems.*.quantity' => 'required|numeric',
                    'orderitems.*.price' => 'required|numeric',
                    'payment_method' => 'nullable|integer',
                    'paid_amount' => 'nullable|numeric',
                    'total_paid' => 'nullable|numeric',
                    'total' => 'nullable|numeric',   //Total Due
                    'sale_type' => 'required|string',
                    'customer_id' => 'required|integer',
                    'store_id' => 'required|integer',
                    'stage' => 'required|integer',
                ]);

                    if ($validator->fails()) {
                        Log::error('Validation errors during payment update:', [
                        'errors' => $validator->errors()->all(),
                        'request_data' => $request->all(),
                    ]);
                    return response()->json(['success' => false, 'message' => $validator->errors()->first()], 422);
                }
                    
                $validated = $validator->validated();

                // Update the order within a transaction
                DB::transaction(function () use ($validated, $order) {
                        $bilorder = BILOrder::findOrFail($order);

                    // Get old items and sync them
                    $oldItemIds = $bilorder->orderitems()->pluck('id')->toArray();
                    // Sync order items
                    $newItemIds = [];
                        foreach ($validated['orderitems'] as $item) {
                        if(!empty($item['id'])){
                            $newItemIds[] = $item['id'];
                        } else {
                            //Create new item
                            $bilorder->orderitems()->create([
                            'item_id' => $item['item_id'],
                            'quantity' => $item['quantity'],
                            'price' => $item['price'],
                        ]);
                    }
                    }
                $itemsToDelete = array_diff($oldItemIds, $newItemIds);
                    $bilorder->orderitems()->whereIn('id', $itemsToDelete)->delete(); // Use detach to remove
                    
                    foreach ($validated['orderitems'] as $item) {
                        if(!empty($item['id'])) {
                            $orderItem = BILOrderItem::find($item['id']);
                            if ($orderItem) {
                                    $orderItem->update([
                                    'item_id' => $item['item_id'],
                                    'quantity' => $item['quantity'],
                                    'price' => $item['price'],
                                ]);
                            }
                    }
                    }
    
                    // Compute the total based on updated order items
                    $calculatedTotal = $bilorder->orderitems->sum(fn($item) => $item->quantity * $item->price);

                    // Update the order details
                    $bilorder->update([
                        'customer_id' => $validated['customer_id'],
                        'store_id' => $validated['store_id'],
                        'stage' => 5,
                        'total' => $calculatedTotal,
                        'user_id' => Auth::id(),
                    ]);

                    //Fill post Bills table
                    $this->postBills($validated);

                });
            
                return response()->json(['success' => true, 'message' => 'Payment updated successfully.']);

            } else {
                    // Create mode: Handle POST request
                $validator = Validator::make($request->all(), [
                        'orderitems' => 'required|array',
                        'orderitems.*.item_id' => 'required|integer',
                        'orderitems.*.quantity' => 'required|numeric',
                        'orderitems.*.price' => 'required|numeric',
                        'payment_method' => 'nullable|integer',
                        'paid_amount' => 'nullable|numeric',
                        'total_paid' => 'nullable|numeric',
                        'total' => 'nullable|numeric',   // Total Due           
                        'sale_type' => 'required|string',
                        'customer_id' => 'required|integer',
                        'store_id' => 'required|integer',
                        'stage' => 'required|integer',
                ]);

                if ($validator->fails()) {
                    Log::error('Validation errors during payment create:', [
                        'errors' => $validator->errors()->all(),
                        'request_data' => $request->all(),
                    ]);
                    return response()->json(['success' => false, 'message' => $validator->errors()->first()], 422);
                }

                $validated = $validator->validated();
                
                // Begin database transaction
                DB::transaction(function () use ($validated) {
                    // Create the order without a total initially
                $order = BILOrder::create([
                    'customer_id' => $validated['customer_id'],
                    'store_id' => $validated['store_id'],
                    'stage' => 5,
                    'total' => 0, // Set an initial total (will update later)
                    'user_id' => Auth::id(),
                ]);    
    
                // Create associated order items
                foreach ($validated['orderitems'] as $item) {
                        $order->orderitems()->create([
                        'item_id' => $item['item_id'],
                        'quantity' => $item['quantity'],
                        'price' => $item['price'],
                    ]);
                }
    
                // Reload the relationship to ensure all items are fetched
                $order->load('orderitems');
    
                // Compute the total based on updated order items
                $calculatedTotal = $order->orderitems->sum(fn($item) => $item->quantity * $item->price);
    
                // Update order with the correct total
                $order->update(['total' => $calculatedTotal]);

                //Fill post Bills table
                $this->postBills($validated);

                });

                
                return response()->json(['success' => true, 'message' => 'Payment processed successfully.']);
            }

        } catch (\Exception $e) {
            Log::error('Error during payment processing:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'order' => $order,
                'request_data' => $request->all(),
            ]);
            return response()->json(['success' => false, 'message' => 'Error during payment processing.'], 500);
        }
    }


    // postBills

    public function postBills($data)
    {
        
        $paymentSource = PaymentSources::CashSale->value;

        // Calculate amounts
        $amtToInvoice = $data['total']; //- ($data['discount'] ?? 0);
        $has_receipt = $data['paid_amount'] > 0 || $amtToInvoice == 0;
        $has_invoice = $data['paid_amount'] < $amtToInvoice;

        if($has_invoice){

            $paymentSource = PaymentSources::InvoicePayment->value;
        }

        // Generate unique numbers
        $receiptNo = $has_receipt ? $this->generateUniqueNumber('REC', 'receiptno') : '';
        $invoiceNo = $has_invoice ? $this->generateUniqueNumber('INV', 'invoiceno') : '';

        // Use a transaction for atomicity
        DB::transaction(function () use ($data,$receiptNo, $invoiceNo, $amtToInvoice,$paymentSource) {

            // Parse year and month parts
            //$transdate = $data['transdate'];
            $transdate = Carbon::now(); // Get the current date and time
            $yearpart = Carbon::parse($transdate)->year;
            $monthpart = Carbon::parse($transdate)->month;

            $TransDescription1 = "Sales";
            $TransDescription2 = "Payment";
            $DebtorType = "Individual";
            

            // Create the sale record
            $sale = BILSale::create([
                'transdate' => $transdate,
                'customer_id' => $data['customer_id'],
                'receiptno' => $receiptNo,
                'invoiceno' => $invoiceNo,
                'totaldue' => $amtToInvoice,
                'totalpaid' => $data['paid_amount'],
                'changeamount' => max(0, $data['paid_amount'] - $amtToInvoice),
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,
                'transtype' => BillingTransTypes::Sales->value,
                'user_id' => Auth::id(),
            ]);

            // Insert associated sale items
            foreach ($data['orderitems'] as $item) {
                $sale->items()->create($item);
            }

            //invoice if any
            if ($invoiceNo) {
                // Create the invoice record
                $invoice = BILInvoice::create([
                    'transdate' => $transdate,
                    'customer_id' => $data['customer_id'],
                    'invoiceno' => $invoiceNo,
                    'totaldue' => $amtToInvoice,
                    'totalpaid' => 0,
                    'paidforinvoice' => $data['paid_amount'],
                    'balancedue' => $amtToInvoice,
                    'status' => InvoiceStatus::Open->value, // For Open                    
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart,
                    'user_id' => Auth::id(),
                ]);
            
                // Update the invoice if a receipt exists
                if ($receiptNo) {
                    // Use the query builder for raw updates
                    DB::table('bil_invoices')
                        ->where('invoiceno', $invoiceNo)
                        ->update([
                            'balancedue' => DB::raw("balancedue - {$data['paid_amount']}"),
                            'totalpaid' => DB::raw("totalpaid + {$data['paid_amount']}"),
                        ]);
            
                    // Check if the invoice is fully paid and update the status
                    $invoice = BILInvoice::where('invoiceno', $invoiceNo)->first(); // Reload the invoice
                    if ($invoice->balancedue == 0) {
                        $invoice->update(['status' => InvoiceStatus::Closed->value]); // For Fully Paid
                    }
                }

                // Create the invoice log record
                $invoiceLog = BILInvoiceLog::create([
                    'transdate' => $transdate,
                    'customer_id' => $data['customer_id'],
                    'reference' => $invoiceNo,
                    'invoiceno' => $invoiceNo,
                    'debitamount' => $amtToInvoice,
                    'creditamount' => 0,    
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart,               
                    'transtype' => InvoiceTransTypes::NewInvoice->value,
                    'transdescription' => $TransDescription1 , 
                    'user_id' => Auth::id(),
                ]);

                 // Update the invoice log if a receipt exists
                if ($receiptNo) {
                    // Create the invoice log record
                    $invoiceLog = BILInvoiceLog::create([
                        'transdate' => $transdate,
                        'customer_id' => $data['customer_id'],
                        'reference' => $receiptNo,
                        'invoiceno' => $invoiceNo,
                        'debitamount' => 0,
                        'creditamount' => $data['paid_amount'], 
                        'yearpart' => $yearpart,
                        'monthpart' => $monthpart,                   
                        'transtype' => InvoiceTransTypes::Payment->value,
                        'transdescription' => $TransDescription2, 
                        'user_id' => Auth::id(),
                    ]);
                }

                // Insert associated sale items
                foreach ($data['orderitems'] as $item) {
                    $invoice->items()->create($item);
                }
           

                // Check if the debtor record exists
                $debtor = BILDebtor::where('customer_id', $data['customer_id'])
                ->where('debtortype', $DebtorType)
                ->first();

                if ($debtor) {
                    // Update existing debtor balance
                    $debtor->increment('balance', $amtToInvoice);
                } else {
                    // Create a new debtor record
                    $debtor = BILDebtor::create([
                        'transdate' => $transdate,
                        'customer_id' => $data['customer_id'],
                        'debtortype' => $DebtorType,
                        'balance' => $amtToInvoice,
                        'user_id' => auth()->id(), // Set the current authenticated user
                    ]);
                }

                // If a receipt exists, reduce the debtor's balance
                if ($receiptNo) {
                    $debtor->decrement('balance', $data['paid_amount']);
                }

                // Insert a debit transaction into the debtor logs
                BILDebtorLog::create([
                'transdate' => $transdate,    
                'debtor_id' => $debtor->id,
                'reference' => $invoiceNo,
                'debtortype' => $DebtorType,
                'debitamount' => $amtToInvoice,
                'creditamount' => 0,
                'yearpart' => $yearpart,
                'monthpart' => $monthpart,   
                'transtype' => BillingTransTypes::Invoice->value,
                'transdescription' => $TransDescription1 , 
                'transdate' => now(), // Current timestamp
                'user_id' => auth()->id(), // Set the current authenticated user
                ]);

                // If a receipt exists, insert a credit transaction
                if ($receiptNo) {
                    BILDebtorLog::create([
                        'transdate' => $transdate,
                        'debtor_id' => $debtor->id,
                        'reference' => $receiptNo,
                        'debtortype' => $DebtorType,
                        'debitamount' => 0,
                        'creditamount' => $data['paid_amount'],
                        'yearpart' => $yearpart,
                        'monthpart' => $monthpart,   
                        'transtype' => BillingTransTypes::Payment->value, // For Payments
                        'transdescription' => $TransDescription2, 
                        'user_id' => auth()->id(),
                    ]);
                }

            }

            //invoice payment if any
            if ($invoiceNo && $receiptNo) {     
            
               // Insert into BILInvoicePayment
                BILInvoicePayment::create([
                    'transdate' => $transdate,
                    'receiptno' => $receiptNo,
                    'customer_id' => $data['customer_id'],
                    'totalpaid' => $data['paid_amount'],
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart, 
                    'user_id' => auth()->id(), // Assuming the authenticated user is creating this record
                ]);

                // Insert into BILInvoicePaymentDetail
                BILInvoicePaymentDetail::create([
                    'receiptno' => $receiptNo,
                    'invoiceno' => $invoiceNo,
                    'totaldue' => $amtToInvoice,
                    'totalpaid' => $data['paid_amount'],
                ]);              

            }

            //receipt if any
            if ($receiptNo && !$invoiceNo) {
               
                // Create the sale record
                $sale = BILReceipt::create([
                    'transdate' => $transdate,
                    'customer_id' => $data['customer_id'],                    
                    'receiptno' => $receiptNo,
                    'totaldue' => $amtToInvoice,
                    'totalpaid' => $data['paid_amount'],
                    'changeamount' => max(0, $data['paid_amount'] - $amtToInvoice),
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart,   
                    'user_id' => Auth::id(),
                ]);

                // Insert associated sale items
                foreach ($data['orderitems'] as $item) {
                    $sale->items()->create($item);
                }

            }

            //collection
            if ($receiptNo){

                $data['paymentmethod'] = '000001';
                // Define payment types with dynamic key
                $paymentTypes = [                    
                    $data['paymentmethod'] => $data['paid_amount'] ?? 0,
                    // Add more payment types if required
                ];
                
                // Initialize base collection data
                $collectionData = [
                    'transdate' => $transdate,
                    'receiptno' => $receiptNo, // Trim the receipt number
                    'paymentsource' => $paymentSource, 
                    'customer_id' => $data['customer_id'], // Customer ID                    
                    'yearpart' => $yearpart,
                    'monthpart' => $monthpart,               
                    'transtype' => BillingTransTypes::Payment->value,
                    'user_id' => Auth::id(), // Current authenticated user
                ];
                
                // Dynamically add payment types
                foreach ($paymentTypes as $type => $value) {
                    $collectionData['paytype' . $type] = $value;
                }
                
                // Save collection data to the database
                BILCollection::create($collectionData);                    
                
            }
            
         });
    }

    private function generateUniqueNumber($prefix, $column)
    {
        do {
            $number = $prefix . time() . rand(100, 999); // Add randomness to avoid collisions
        } while (BILSale::where($column, $number)->exists());

        return $number;
    }
    

}
