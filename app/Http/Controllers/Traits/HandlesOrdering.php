<?php

namespace App\Http\Controllers\Traits;

use App\Models\BILOrder;
use App\Models\BLSPriceCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

trait HandlesOrdering
{
    /**
     * Fetches the active price categories.
     * This logic is based on a database structure where categories are columns in a single row.
     */
    protected function fetchPriceCategories()
    {
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

        return $priceCategories;
    }

    /**
     * Validate and create a new order and its items.
     */
    public function createOrder(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:bls_customers,id',
            'store_id' => 'required|exists:siv_stores,id',
            'stage' => 'required|integer|min:1',
            'orderitems' => 'required|array',
            'orderitems.*.item_id' => 'required|exists:bls_items,id',
            'orderitems.*.quantity' => 'required|numeric|min:1', // Quantity should be at least 1
            'orderitems.*.price' => 'required|numeric|min:0',
            // New fields for Multi-Store and Price Category tracking
            'orderitems.*.source_store_id' => 'nullable|integer',             
            'orderitems.*.price_ref' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated) {
            $order = BILOrder::create([
                'customer_id' => $validated['customer_id'],
                'store_id' => $validated['store_id'],
                'stage' => $validated['stage'],
                'total' => 0, // Initial total
                'user_id' => Auth::id(),
            ]);

            // Create the associated order items
            $order->orderitems()->createMany($validated['orderitems']);

            // Refresh the model to get the latest state from the database, including all created items.
            $order->refresh();

            // Recalculate and update the total based on the newly created items.
            $calculatedTotal = $order->orderitems->sum(fn($item) => $item->quantity * $item->price);
            $order->update(['total' => $calculatedTotal]);
        });
    }

    /**
     * Validate and update an existing order and its items.
     */
    public function updateOrder(Request $request, BILOrder $order)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:bls_customers,id',
            'store_id' => 'required|exists:siv_stores,id',
            'stage' => 'required|integer|min:1',
            'orderitems' => 'required|array',
            'orderitems.*.id' => 'nullable|exists:bil_orderitems,id',
            'orderitems.*.item_id' => 'required|exists:bls_items,id',
            'orderitems.*.quantity' => 'required|numeric|min:1', // Quantity should be at least 1
            'orderitems.*.price' => 'required|numeric|min:0',
            // New fields for Multi-Store and Price Category tracking
            'orderitems.*.source_store_id' => 'nullable|integer',             
            'orderitems.*.price_ref' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated, $order) {
            $incomingItemIds = collect($validated['orderitems'])->pluck('id')->filter()->toArray();
            $oldItemIds = $order->orderitems()->pluck('id')->toArray();

            // Delete items that are no longer in the request
            $itemsToDelete = array_diff($oldItemIds, $incomingItemIds);
            if (!empty($itemsToDelete)) {
                $order->orderitems()->whereIn('id', $itemsToDelete)->delete();
            }

            // Update existing items and create new ones
            foreach ($validated['orderitems'] as $itemData) {
                $order->orderitems()->updateOrCreate(
                    ['id' => $itemData['id'] ?? null], // Condition to find the item
                    [
                        'item_id' => $itemData['item_id'],
                        'quantity' => $itemData['quantity'],
                        'price' => $itemData['price'],
                        'source_store_id' => $itemData['source_store_id'] ?? null,
                        'price_ref' => $itemData['price_ref'] ?? null,
                    ]
                );
            }
            
            // Refresh the order instance to get the updated relationship state from the database.
            // This is crucial for an accurate total calculation.
            $order->refresh();

            // Recalculate the total based on the final state of the order items
            $calculatedTotal = $order->orderitems->sum(fn($item) => $item->quantity * $item->price);

            // Update the main order details
            $order->update([
                'customer_id' => $validated['customer_id'],
                'store_id' => $validated['store_id'],
                'stage' => $validated['stage'],
                'total' => $calculatedTotal,
                'user_id' => Auth::id(), // Update the user who last edited the order
            ]);
        });
    }
}