<?php

namespace App\Services;

use App\Models\BILProductControl;
use App\Models\BILProductCostLog;
use App\Models\BILProductExpiryDates;
use App\Models\BILProductTransactions;
use App\Models\BILPhysicalStockBalance;
use App\Models\IVPhysicalInventory;
use App\Models\SIV_Product;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Throwable;

class PhysicalInventoryService
{
    const TRANSACTION_TYPE_ADJUSTMENT = 'SystemAdjustment';
    const STAGE_CLOSED = 3;

    /**
     * Commits a physical inventory count. This is the core business logic that:
     * 1. Resets expiry date records for the counted products.
     * 2. Calculates the difference (delta) between expected and counted stock.
     * 3. Creates adjustment transactions for the deltas.
     * 4. Updates product costs.
     * 5. Resets the master stock level (BILProductControl) to the counted quantity.
     * 6. Creates a historical snapshot of the stock balance.
     *
     * @param IVPhysicalInventory $inventory
     * @return void
     * @throws Throwable
     */
    public function commit(IVPhysicalInventory $inventory): void
    {
        DB::transaction(function () use ($inventory) {
            $transDate = Carbon::now();
            $userId = Auth::id();
            $storeId = $inventory->store_id;

            // --- 1. Finalize the main inventory document ---
            $inventory->update([
                'closed_date' => $transDate,
                'calculated_date' => $transDate,
                'stage' => self::STAGE_CLOSED,
            ]);

            $inventory->load('physicalinventoryitems.item');
            $inventoryItems = $inventory->physicalinventoryitems;
            $productIds = $inventoryItems->pluck('product_id')->unique()->toArray();

            // --- 2. Clear existing expiry dates for these products in this store ---
            // This prepares for a clean slate based on the new count.
            BILProductExpiryDates::where('store_id', $storeId)
                ->whereIn('product_id', $productIds)
                ->delete();

            // This will hold the final, total counted quantity for each product.
            $productControlQuantities = [];

            foreach ($inventoryItems as $item) {
                $product = $item->item;
                $countedQty = (float) $item->countedqty;
                $expectedQty = (float) $item->expectedqty;
                $transPrice = (float) $item->price;

                // Accumulate the total counted quantity for this product.
                $productControlQuantities[$product->id] = ($productControlQuantities[$product->id] ?? 0) + $countedQty;

                // --- 3. Create new expiry date records from the count ---
                // (Assuming your physical count includes expiry date information)
                if ($item->expirydate && $countedQty > 0) {
                    BILProductExpiryDates::create([
                        'store_id' => $storeId,
                        'product_id' => $product->id,
                        'expirydate' => $item->expirydate,
                        'quantity' => $countedQty,
                        'butchno' => $item->butchno,
                    ]);
                }

                // --- 4. Handle Discrepancies (Delta) by creating transactions ---
                $deltaQty = $countedQty - $expectedQty;
                if ($deltaQty != 0) {
                    BILProductTransactions::create([
                        'transdate' => $transDate,
                        'sourcecode' => 'PHYSINV',
                        'sourcedescription' => $inventory->description ?: 'Physical Inventory Adjustment',
                        'product_id' => $product->id,
                        'reference' => 'PI-' . $inventory->id,
                        'transprice' => $transPrice,
                        'transtype' => self::TRANSACTION_TYPE_ADJUSTMENT,
                        'transdescription' => 'Stock Count Adjustment',
                        'qtyin_' . $storeId => $deltaQty > 0 ? $deltaQty : 0,
                        'qtyout_' . $storeId => $deltaQty < 0 ? -$deltaQty : 0,
                        'user_id' => $userId,
                    ]);

                    // --- 5. Update Product Costing ---
                    $product->update([
                        'prevcost' => $product->costprice,
                        'costprice' => $transPrice,
                        'averagecost' => $transPrice, // Simplified logic based on original code
                    ]);

                    BILProductCostLog::create([
                        'sysdate' => now(),
                        'transdate' => $transDate,
                        'product_id' => $product->id,
                        'costprice' => $transPrice,
                    ]);
                }
            }

            // --- 6. Set the final, authoritative stock quantity in BILProductControl ---
            foreach ($productControlQuantities as $productId => $totalCountedQty) {
                BILProductControl::updateOrCreate(
                    ['product_id' => $productId],
                    ['qty_' . $storeId => $totalCountedQty]
                );
            }

            // --- 7. Update the historical physical stock balance snapshot ---
            BILPhysicalStockBalance::where('transdate', $transDate)
                ->where('store_id', $storeId)
                ->whereIn('product_id', $productIds)
                ->delete();

            foreach ($productControlQuantities as $productId => $totalCountedQty) {
                BILPhysicalStockBalance::create([
                    'transdate' => $transDate,
                    'store_id' => $storeId,
                    'product_id' => $productId,
                    'quantity' => $totalCountedQty,
                ]);
            }
        });
    }
}