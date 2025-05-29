<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SIV_Product;
use App\Models\SIV_Store;
use App\Models\SIV_ProductCategory; // Assuming SIV_Product has category_id
use App\Models\BILProductControl; // For stock quantities per store (qty_1, qty_2 etc.)
use App\Models\BILProductTransactions; // For movement history
use App\Models\BILProductExpiryDates; // For expiry dates
use App\Models\BILSaleItem; // For calculating sales to determine slow-moving

use App\Models\BILPhysicalStockBalance; // Assuming this is the source for current stock

use App\Models\BILSale; // For joining BILSaleItem
use App\Models\BLSItem; // Crucial for linking to product_id

use Carbon\Carbon;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;


class InventoryReportsController extends Controller
{
    /**
     * Stock on Hand Report
     * Shows current quantities for items, optionally filtered by store, category, or product.
     * This report relies heavily on how BILProductControl stores quantities for different stores.
     * The columns qty_1, qty_2 etc. in BILProductControl are problematic for direct store filtering
     * unless you have a clear mapping of which qty_X column corresponds to which store_id.
     *
     * For a more robust SOH, a dedicated 'stock_levels' table with (store_id, product_id, quantity) is better.
     * Given BILProductControl, we might have to assume qty_1 is for store 1, qty_2 for store 2, etc.
     * Or, if your product control is simpler and you have another table like `iv_physicalstockbalances`.
     * I will assume `iv_physicalstockbalances` is the primary source for SOH for simplicity.
     */
    public function stockOnHand(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:siv_stores,id',
            'category_id' => 'nullable|exists:siv_productcategories,id',
            'product_id' => 'nullable|exists:siv_products,id',
        ]);

        $storeId = $validated['store_id'] ?? null;
        $categoryId = $validated['category_id'] ?? null;
        $productId = $validated['product_id'] ?? null;

        // Using BILPhysicalStockBalance as the source of truth for current stock
        // This assumes it's regularly updated (e.g., after every transaction).
        $stockQuery = DB::table('iv_physicalstockbalances as psb')
            ->join('siv_products as p', 'psb.product_id', '=', 'p.id')
            ->join('siv_stores as s', 'psb.store_id', '=', 's.id')
            ->leftJoin('siv_productcategories as pc', 'p.category_id', '=', 'pc.id')
            ->select(
                'p.id as product_id',
                'p.name as product_name',
                'p.costprice', // For valuation later
                'pc.name as category_name',
                's.name as store_name',
                'psb.quantity as current_quantity'
            )
            ->where('psb.quantity', '>', 0); // Typically only show items with stock

        if ($storeId) {
            $stockQuery->where('psb.store_id', $storeId);
        }
        if ($categoryId) {
            $stockQuery->where('p.category_id', $categoryId);
        }
        if ($productId) {
            $stockQuery->where('psb.product_id', $productId);
        }

        $stockOnHand = $stockQuery->orderBy('s.name')->orderBy('pc.name')->orderBy('p.name')->get();

        // Calculate total value for the SOH report based on current selection
        $totalValueSOH = $stockOnHand->sum(function ($item) {
            return (float)$item->current_quantity * (float)$item->costprice;
        });


        return Inertia::render('Reports/Inventory/StockOnHand', [
            'stockOnHand' => $stockOnHand,
            'totalValueSOH' => $totalValueSOH,
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'categories' => SIV_ProductCategory::orderBy('name')->get(['id', 'name']),
            'productsList' => SIV_Product::orderBy('name')->get(['id', 'name']), // For product dropdown
            'filters' => $validated,
        ]);
    }

    /**
     * Inventory Valuation Report
     * Calculates total value of stock, usually based on cost price.
     */
    public function valuation(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:siv_stores,id',
            'valuation_date' => 'nullable|date_format:Y-m-d', // Value as of this date (more complex)
        ]);

        $storeId = $validated['store_id'] ?? null;
        // Valuing as of a specific past date is complex and requires historical stock levels.
        // For simplicity, this will be current valuation.
        $valuationDate = Carbon::parse($validated['valuation_date'] ?? Carbon::today())->endOfDay();


        // Using BILPhysicalStockBalance again for current stock
        $valuationQuery = DB::table('iv_physicalstockbalances as psb')
            ->join('siv_products as p', 'psb.product_id', '=', 'p.id')
            ->select(
                'p.name as product_name',
                'p.costprice',
                'psb.quantity',
                DB::raw('psb.quantity * p.costprice as item_total_value')
            )
             // If you want valuation as of a specific date, you'd need to reconstruct stock
             // levels at that point using transactions, which is much harder.
             // This example is for *current* valuation.
            ->where('psb.quantity', '>', 0); // Only value items with stock

        if ($storeId) {
            $valuationQuery->where('psb.store_id', $storeId);
        }

        $valuedItems = $valuationQuery->orderBy('p.name')->get();
        $totalInventoryValue = $valuedItems->sum('item_total_value');

        return Inertia::render('Reports/Inventory/Valuation', [
            'valuedItems' => $valuedItems,
            'totalInventoryValue' => $totalInventoryValue,
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'filters' => $validated + ['valuation_date' => $valuationDate->format('Y-m-d')],
        ]);
    }

    /**
     * Stock Movement History / Audit Trail
     */
    public function movementHistory(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'nullable|exists:siv_products,id',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'transtype'  => 'nullable|string', // e.g., SALE, RECEIVE, ADJUST, TRANSFER_OUT, TRANSFER_IN
            // 'store_id' is missing from BILProductTransactions, so cannot filter by store directly here
            // unless sourcecode or reference implies a store.
        ]);

        $productId  = $validated['product_id'] ?? null;
        $startDate  = Carbon::parse($validated['start_date'] ?? Carbon::now()->subMonth())->startOfDay();
        $endDate    = Carbon::parse($validated['end_date']   ?? Carbon::now())->endOfDay();
        $transType  = $validated['transtype'] ?? null;

        $movementsQuery = BILProductTransactions::with('product:id,name') // Select specific columns from product
            ->whereBetween('transdate', [$startDate, $endDate]);

        if ($productId) {
            $movementsQuery->where('product_id', $productId);
        }
        if ($transType) {
            $movementsQuery->where('transtype', $transType);
        }

        $movements = $movementsQuery->orderBy('transdate', 'desc')->orderBy('id', 'desc')->paginate(50)->withQueryString();

        // Get distinct transaction types for filter dropdown
        $transactionTypes = BILProductTransactions::select('transtype')->distinct()->pluck('transtype');


        return Inertia::render('Reports/Inventory/MovementHistory', [
            'movements' => $movements,
            'productsList' => SIV_Product::orderBy('name')->get(['id', 'name']),
            'transactionTypes' => $transactionTypes,
            'filters' => $validated,
        ]);
    }

    /**
     * Inventory Ageing Report (Conceptual - More complex)
     * This requires knowing when stock batches were received.
     * BILProductExpiryDates might be useful if it also tracks received_date or if butch_no links to GRNs.
     * A simple version might just look at last_received_date vs current_date.
     * A true ageing needs FIFO/LIFO costing and batch tracking.
     */
    public function ageing(Request $request)
    {
        // This is a complex report. A simplified version:
        // 1. Get current stock (from BILPhysicalStockBalance).
        // 2. For each stock item, try to find its oldest 'receive' transaction date.
        //    This requires BILProductTransactions to accurately log receives with quantities.
        // This is highly dependent on detailed transaction logging with batch/lot info.
        // For now, returning a placeholder.
        Log::warning('Inventory Ageing Report: Not fully implemented due to complexity. Placeholder data.');
        return Inertia::render('Reports/Inventory/Ageing', [
            'reportData' => ['message' => 'Inventory Ageing Report is conceptual and requires detailed batch/lot tracking for accurate implementation.'],
            'filters' => $request->all(),
        ]);
    }

    /**
     * Reorder Level Report
     */
    public function reorderLevel(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:siv_stores,id',
            'category_id' => 'nullable|exists:siv_productcategories,id',
        ]);
        $storeId = $validated['store_id'] ?? null;
        $categoryId = $validated['category_id'] ?? null;

        // Using BILPhysicalStockBalance for current quantities
        $lowStockQuery = DB::table('siv_products as p')
            ->join('iv_physicalstockbalances as psb', 'p.id', '=', 'psb.product_id')
            ->leftJoin('siv_productcategories as pc', 'p.category_id', '=', 'pc.id')
            ->select(
                'p.id', 'p.name as product_name', 'pc.name as category_name',
                'psb.quantity as current_quantity', 'p.reorderlevel as reorder_level', // SIV_Product needs reorderlevel
                'psb.store_id' // Needed if SIV_Store is not joined directly but want to show store context
            )
            ->whereNotNull('p.reorderlevel') // Only products with a reorder level
            ->whereColumn('psb.quantity', '<=', 'p.reorderlevel'); // Core logic

        if ($storeId) {
            $lowStockQuery->where('psb.store_id', $storeId);
        }
        if ($categoryId) {
            $lowStockQuery->where('p.category_id', $categoryId);
        }
        // If you want to show store names, join with siv_stores
        $lowStockQuery->join('siv_stores as s', 'psb.store_id', '=', 's.id')
                      ->addSelect('s.name as store_name');


        $lowStockItems = $lowStockQuery->orderBy('p.name')->get();

        return Inertia::render('Reports/Inventory/ReorderLevel', [
            'lowStockItems' => $lowStockItems,
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'categories' => SIV_ProductCategory::orderBy('name')->get(['id', 'name']),
            'filters' => $validated,
        ]);
    }

    /**
     * Expiring Items Report
     */
    public function expiringItems(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:siv_stores,id',
            'days_to_expiry' => 'nullable|integer|min:0', // e.g., show items expiring in next X days
            'product_id' => 'nullable|exists:siv_products,id',
        ]);

        $storeId = $validated['store_id'] ?? null;
        $daysToExpiry = $validated['days_to_expiry'] ?? 30; // Default to 30 days
        $productId = $validated['product_id'] ?? null;

        $expiryDateThreshold = Carbon::today()->addDays($daysToExpiry);

        $expiringQuery = BILProductExpiryDates::with(['product:id,name', 'store:id,name'])
            ->where('quantity', '>', 0) // Only items with stock
            ->whereDate('expirydate', '<=', $expiryDateThreshold) // Expiring on or before threshold
            ->whereDate('expirydate', '>=', Carbon::today()); // Not yet expired

        if ($storeId) {
            $expiringQuery->where('store_id', $storeId);
        }
        if ($productId) {
            $expiringQuery->where('product_id', $productId);
        }

        $expiringItems = $expiringQuery->orderBy('expirydate', 'asc')->get();

        return Inertia::render('Reports/Inventory/ExpiringItems', [
            'expiringItems' => $expiringItems,
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'productsList' => SIV_Product::orderBy('name')->get(['id', 'name']),
            'filters' => $validated + ['days_to_expiry_applied' => $daysToExpiry],
        ]);
    }

    /**
     * Slow Moving Stock Report
     * This requires analyzing sales data for products over a period.
     */
         

    public function slowMoving(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:siv_stores,id',
            'period_days' => 'nullable|integer|min:7',
            'max_sales_qty' => 'nullable|integer|min:0',
        ]);
        Log::info('SlowMoving Report - Validated Data:', $validated);

        $storeId = $validated['store_id'] ?? null;
        $periodDays = $validated['period_days'] ?? 90;
        $maxSalesQty = $validated['max_sales_qty'] ?? 5;

        $dateLimit = Carbon::today()->subDays($periodDays)->startOfDay();
        Log::info('SlowMoving Report - Effective Filters:', [
            'storeId' => $storeId, 'periodDays' => $periodDays, 'maxSalesQty' => $maxSalesQty, 'dateLimit' => $dateLimit->toDateString()
        ]);

        // 1. Get all products with current stock (using BILPhysicalStockBalance)
        $productsWithStockQuery = DB::table('iv_physicalstockbalances as psb')
            ->join('siv_products as p', 'psb.product_id', '=', 'p.id') // siv_products has the name
            ->where('psb.quantity', '>', 0)
            ->select('psb.product_id', 'p.name as product_name', 'psb.quantity as current_stock');

        if ($storeId) {
            $productsWithStockQuery->where('psb.store_id', $storeId);
        }
        $productsWithStock = $productsWithStockQuery->get()->keyBy('product_id');
        Log::info('SlowMoving Report - Products with Stock:', ['count' => $productsWithStock->count()]);


        // 2. Get sales quantities for products in the period
        // We need to join BILSaleItem with BLSItem to get to the siv_products.id
        $salesDataQuery = BILSaleItem::query()
            ->join('bil_sales', 'bil_saleitems.sale_id', '=', 'bil_sales.id')
            ->join('bls_items', 'bil_saleitems.item_id', '=', 'bls_items.id') // Join with bls_items
            ->where('bil_sales.transdate', '>=', $dateLimit)
            ->where('bil_sales.voided', '!=', 1)
            ->select(
                'bls_items.product_id as actual_product_id', // Select product_id from bls_items
                DB::raw('SUM(bil_saleitems.quantity) as total_sold')
            );

        if ($storeId) {
            // Assuming BILSale has store_id for filtering sales by store
            // If BILSaleItem has store_id, use that: ->where('bil_saleitems.store_id', $storeId)
            if (Schema::hasColumn('bil_sales', 'store_id')) {
                $salesDataQuery->where('bil_sales.store_id', $storeId);
            } else {
                Log::warning('SlowMoving Report: Store filter provided, but BILSale has no store_id. Sales data will not be store-specific.');
            }
        }
        $salesData = $salesDataQuery->groupBy('bls_items.product_id') // Group by product_id from bls_items
                                     ->pluck('total_sold', 'actual_product_id'); // Pluck using the aliased actual_product_id
        Log::info('SlowMoving Report - Sales Data in Period:', $salesData->toArray());


        // 3. Determine slow-moving items
        $slowMovingItems = [];
        foreach ($productsWithStock as $productId => $stockInfo) {
            $soldQty = $salesData->get($productId, 0); // Get sold quantity for this SIV_Product ID

            if ($soldQty <= $maxSalesQty) {
                // Fetch the last sale date for this specific product_id
                $lastSaleDate = BILSaleItem::join('bil_sales', 'bil_saleitems.sale_id', '=', 'bil_sales.id')
                                        ->join('bls_items', 'bil_saleitems.item_id', '=', 'bls_items.id')
                                        ->where('bls_items.product_id', $productId) // Filter by product_id from bls_items
                                        ->where('bil_sales.voided', '!=', 1)
                                        ->where('bil_sales.transdate', '>=', $dateLimit); // Consider sales within the period for last sale date too

                if ($storeId && Schema::hasColumn('bil_sales', 'store_id')) {
                    $lastSaleDate->where('bil_sales.store_id', $storeId);
                }

                $lastSaleDateFormatted = $lastSaleDate->orderBy('bil_sales.transdate', 'desc')
                                                      ->value('bil_sales.transdate');

                $slowMovingItems[] = [
                    'product_id' => $productId,
                    'product_name' => $stockInfo->product_name, // Name from siv_products via physical stock balance query
                    'current_stock' => $stockInfo->current_stock,
                    'quantity_sold_in_period' => (int) $soldQty,
                    'last_sale_date' => $lastSaleDateFormatted ? Carbon::parse($lastSaleDateFormatted)->toDateString() : null,
                ];
            }
        }
        Log::info('SlowMoving Report - Identified Slow Moving Items:', ['count' => count($slowMovingItems)]);

        return Inertia::render('Reports/Inventory/SlowMoving', [
            'slowMovingItems' => $slowMovingItems,
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'filters' => $validated + ['period_days_applied' => $periodDays, 'max_sales_qty_applied' => $maxSalesQty],
        ]);
    }
   
    /**
     * Custom Inventory Report (Placeholder)
     * Similar to custom sales report, but focused on inventory tables.
     */
    public function customInventoryReport(Request $request)
    {
        // This would be a complex builder allowing selection of fields from:
        // siv_products, iv_physicalstockbalances, bil_productexpirydates, iv_productcontrol, etc.
        // With filters on various attributes.
        Log::info('Custom Inventory Report - Incoming Request:', $request->all());

        // For now, return a placeholder view or a very simplified version
        return Inertia::render('Reports/Inventory/CustomBuilder', [
            'reportData' => ['message' => 'Custom Inventory Report Builder is a complex feature. This is a placeholder.'],
            'filters' => $request->all(),
            // Pass available columns/filters for inventory tables
            'availableProductColumns' => SIV_Product::first() ? array_keys(SIV_Product::first()->getAttributes()) : [],
            'availableStockBalanceColumns' => BILPhysicalStockBalance::first() ? array_keys(BILPhysicalStockBalance::first()->getAttributes()) : [],
        ]);
    }
}