<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\HandlesOrdering; // Import the trait
use App\Models\BILOrder;
use App\Models\SIV_Store;
use Illuminate\Http\Request;

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
        $order->load(['customer', 'store', 'orderitems.item']);

        return inertia('BilOrders/Edit', [
            'order' => $order,
            'fromstore' => SIV_Store::all(),
            'priceCategories' => $this->fetchPriceCategories(), // Use trait method
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
