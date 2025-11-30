<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\HandlesOrdering; // Import the trait
use App\Models\BILOrder;
use App\Models\SIV_Store;
use Illuminate\Http\Request;
use App\Models\FacilityOption;
use Illuminate\Support\Facades\DB;

class BilOrderController extends Controller
{
    use HandlesOrdering; // Use the trait to access shared logic

    /**
     * Display a listing of orders.
     */
    public function index(Request $request)
    {
        $query = BILOrder::with(['orderitems', 'customer']);

        // Filtering by customer name
        if ($request->filled('search')) {
            $query->whereHas('customer', function ($q) use ($request) {
                $q->where('first_name', 'like', '%' . $request->search . '%')
                    ->orWhere('surname', 'like', '%' . $request->search . '%')
                    ->orWhere('other_names', 'like', '%' . $request->search . '%')
                    ->orWhere('company_name', 'like', '%' . $request->search . '%');
            });
        }

        // Filtering by stage
        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        // This index method will only show orders with stage 1 or 2.
        // This is likely intentional to separate active orders from completed/cancelled ones.
        $query->whereBetween('stage', [1, 2]);

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
        return inertia('BilOrders/Create', [
            'fromstore' => SIV_Store::all(),
            'priceCategories' => $this->fetchPriceCategories(), // Use trait method
            'facilityOptions' => FacilityOption::first(), // Passed for stock validation settings
        ]);
    }

    /**
     * Store a newly created order in storage.
     */
    public function store(Request $request)
    {
        $this->createOrder($request); // Use trait method for cleaner controller

        return redirect()->route('billing0.index')->with('success', 'Order created successfully.');
    }

        
    /**
     * Show the form for editing the specified order.
     */
    public function edit(BILOrder $order)
    {
        // 1. Load relationships, including sourceStore for badge display
        $order->load(['customer', 'store', 'orderitems.item', 'orderitems.sourceStore']);

        // 2. Manually inject 'stock_quantity' for each item so frontend validation works
        $order->orderitems->each(function ($orderItem) use ($order) {
            
            // Default to 0
            $orderItem->stock_quantity = 0;

            // Only fetch stock if the item exists and is linked to inventory (has product_id)
            if ($orderItem->item && $orderItem->item->product_id) {
                
                // Determine the context: Did this item come from a specific store or the default?
                $targetStoreId = $orderItem->source_store_id ?? $order->store_id;
                
                // Construct the dynamic column name (e.g., 'qty_1')
                $qtyColumn = 'qty_' . (int)$targetStoreId;

                // Query the inventory control table directly
                // Using value() is slightly cleaner/faster for a single column
                $stockValue = DB::table('iv_productcontrol')
                    ->where('product_id', $orderItem->item->product_id)
                    ->value($qtyColumn);

                // If record exists, assign the value to the object
                if ($stockValue !== null) {
                    $orderItem->stock_quantity = (float) $stockValue;
                }
            }
        });

        return inertia('BilOrders/Edit', [
            'order' => $order,
            'fromstore' => SIV_Store::all(),
            'priceCategories' => $this->fetchPriceCategories(), // Use trait method
            'facilityOptions' => FacilityOption::first(), // Passed for stock validation settings
        ]);
    }

    /**
     * Update the specified order in storage.
     */
    public function update(Request $request, BILOrder $order)
    {
        $this->updateOrder($request, $order); // Use trait method for cleaner controller

        return redirect()->route('billing0.index')->with('success', 'Order updated successfully.');
    }

    /**
     * Remove the specified order from storage.
     */
    public function destroy(BILOrder $order)
    {
        // Deleting related items first is good practice,
        // especially if cascading deletes aren't set up in the database.
        $order->orderitems()->delete();
        $order->delete();

        return redirect()->route('billing0.index')
            ->with('success', 'Order deleted successfully.');
    }
}
