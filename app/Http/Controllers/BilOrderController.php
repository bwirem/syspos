<?php

namespace App\Http\Controllers;

use App\Models\BILOrder;
use App\Models\BILOrderItem;
use App\Models\SIV_Store;
use App\Models\BLSPriceCategory;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;


class BilOrderController extends Controller
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
                $q->where('first_name', 'like', '%' . $request->search . '%')
                ->orWhere('surname', 'like', '%' . $request->search . '%')
                ->orWhere('other_names', 'like', '%' . $request->search . '%')
                ->orWhere('company_name', 'like', '%' . $request->search . '%');
             });
         }
     
         // Filtering by stage (Ensure 'stage' exists in the BILOrder model)
         if ($request->filled('stage')) {
             $query->where('stage', $request->stage);
         }
        
         $query->whereBetween('stage', [1, 2]);
     
         // Paginate and sort orders
         $orders = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('BilOrders/Index', [
             'orders' => $orders,
             'filters' => $request->only(['search', 'stage']),
         ]);
     }
     

    /**
     * Show the form for creating a new order.
     */
    public function create()
    {
        // Fetch all records from facilitypricecategories
        $rows = BLSPriceCategory::query()->first();
    
        $priceCategories = [];
    
        if ($rows) {
            for ($i = 1; $i <= 13; $i++) {
                if (!empty($rows->{'useprice' . $i}) && $rows->{'useprice' . $i} == 1) {
                    $priceCategories[] = [
                        'pricename' => 'price' . $i,
                        'pricedescription' => trim($rows->{'price' . $i}),
                    ];
                }
            }
        }

        return inertia('BilOrders/Create', [
            'fromstore' => SIV_Store::all(), // Assuming you have a Store model
            'priceCategories' => $priceCategories,
        ]);
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
     
         return redirect()->route('billing0.index')->with('success', 'Order created successfully.');
     }     

    /**
     * Show the form for editing the specified order.
     */
    public function edit(BILOrder $order)
    {
        // Eager load order items and their related items
        $order->load(['customer', 'store', 'orderitems.item']); 

        // Fetch all records from facilitypricecategories
        $rows = BLSPriceCategory::query()->first();
    
        $priceCategories = [];
    
        if ($rows) {
            for ($i = 1; $i <= 13; $i++) {
                if (!empty($rows->{'useprice' . $i}) && $rows->{'useprice' . $i} == 1) {
                    $priceCategories[] = [
                        'pricename' => 'price' . $i,
                        'pricedescription' => trim($rows->{'price' . $i}),
                    ];
                }
            }
        }

        return inertia('BilOrders/Edit', [
            'order' => $order,
            'fromstore' => SIV_Store::all(), // Assuming you have a Store model
            'priceCategories' => $priceCategories,
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
     
         return redirect()->route('billing0.index')->with('success', 'Order updated successfully.');
     }
     
     
    
    /**
     * Remove the specified order from storage.
     */
    public function destroy(BILOrder $order)
    {
        // Delete the order and associated items
        $order->orderitems()->delete();
        $order->delete();

        return redirect()->route('billing0.index')
            ->with('success', 'Order deleted successfully.');
    }
}
