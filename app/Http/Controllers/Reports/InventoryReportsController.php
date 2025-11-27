<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\BILProductControl;
use App\Models\BILProductExpiryDates;
use App\Models\BILProductTransactions;
use App\Models\BILSale;
use App\Models\SIV_Product;
use App\Models\SIV_ProductCategory;
use App\Models\BLSPriceCategory;
use App\Models\SIV_Store;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\ProductsExport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class InventoryReportsController extends Controller
{
    /**
     * Stock on Hand Report
     * REFACTORED: Uses BILProductControl as the single source of truth for current stock.
     */
    public function stockOnHand(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:siv_stores,id',
            'category_id' => 'nullable|exists:siv_productcategories,id',
            'product_id' => 'nullable|exists:siv_products,id',
        ]);

        $storeId = $validated['store_id'] ?? null;

        if (!$storeId) {
            $storeIds = SIV_Store::pluck('id');
            $sumColumns = $storeIds->map(fn($id) => "pc.qty_$id")->join(' + ');

            $stockQuery = DB::table('iv_productcontrol as pc')
                ->join('siv_products as p', 'pc.product_id', '=', 'p.id')
                ->leftJoin('siv_productcategories as cat', 'p.category_id', '=', 'cat.id')
                ->select(
                    'p.id as product_id',
                    'p.name as product_name',
                    'p.costprice',
                    'cat.name as category_name',
                    DB::raw("($sumColumns) as current_quantity")
                )
                ->where(DB::raw($sumColumns), '>', 0);
        } else {
            $qtyColumn = 'pc.qty_' . $storeId;

            $stockQuery = DB::table('iv_productcontrol as pc')
                ->join('siv_products as p', 'pc.product_id', '=', 'p.id')
                ->leftJoin('siv_productcategories as cat', 'p.category_id', '=', 'cat.id')
                ->select(
                    'p.id as product_id',
                    'p.name as product_name',
                    'p.costprice',
                    'cat.name as category_name',
                    DB::raw("$qtyColumn as current_quantity")
                )
                ->where($qtyColumn, '>', 0); // Only show items with stock in the selected store
        }

        if ($request->filled('category_id')) {
            $stockQuery->where('p.category_id', $request->category_id);
        }
        if ($request->filled('product_id')) {
            $stockQuery->where('p.id', $request->product_id);
        }

        $stockOnHand = $stockQuery->orderBy('cat.name')->orderBy('p.name')->get();

        $totalValueSOH = $stockOnHand->sum(function ($item) {
            return (float)$item->current_quantity * (float)$item->costprice;
        });

        return Inertia::render('Reports/Inventory/StockOnHand', [
            'stockOnHand' => $stockOnHand,
            'totalValueSOH' => $totalValueSOH,
            'selectedStoreName' => $storeId ? (SIV_Store::find($storeId)->name ?? 'N/A') : 'All Stores',
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'categories' => SIV_ProductCategory::orderBy('name')->get(['id', 'name']),
            'productsList' => SIV_Product::orderBy('name')->get(['id', 'name']),
            'filters' => $validated,
        ]);
    }

    /**
     * Inventory Valuation Report
     * REFACTORED: Also uses BILProductControl for current valuation.
     */
    public function valuation(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:siv_stores,id',
        ]);

        $storeId = $validated['store_id'] ?? null;

        if (is_null($storeId)) {
            $storeIds = SIV_Store::pluck('id');
            $sumColumns = $storeIds->map(fn($id) => "pc.qty_$id")->join(' + ');
            $valuationQuery = DB::table('iv_productcontrol as pc')
                ->join('siv_products as p', 'pc.product_id', '=', 'p.id')
                ->select(
                    'p.name as product_name',
                    'p.costprice',
                    DB::raw("($sumColumns) as quantity"),
                    DB::raw("($sumColumns) * p.costprice as item_total_value")
                )
                ->where(DB::raw($sumColumns), '>', 0);
        } else {
            $validated['store_id'] = $storeId;
            $qtyColumn = 'pc.qty_' . $storeId;
            $valuationQuery = DB::table('iv_productcontrol as pc')
                ->join('siv_products as p', 'pc.product_id', '=', 'p.id')
                ->select(
                    'p.name as product_name',
                    'p.costprice',
                    DB::raw("$qtyColumn as quantity"),
                    DB::raw("$qtyColumn * p.costprice as item_total_value")
                )
                ->where($qtyColumn, '>', 0);
        }

        $valuedItems = $valuationQuery->orderBy('p.name')->get();
        $totalInventoryValue = $valuedItems->sum('item_total_value');

        return Inertia::render('Reports/Inventory/Valuation', [
            'valuedItems' => $valuedItems,
            'totalInventoryValue' => $totalInventoryValue,
            'selectedStoreName' => $storeId ? (SIV_Store::find($storeId)->name ?? 'N/A') : 'All Stores',
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'filters' => $validated,
        ]);
    }

    /**
     * Stock Movement History / Audit Trail
     * REFACTORED: Updated to use the correct transaction types from our new system.
     */
    public function movementHistory(Request $request)
    {
        $validated = $request->validate([
            'store_id'   => 'nullable|exists:siv_stores,id',
            'product_id' => 'nullable|exists:siv_products,id',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'transtype'  => 'nullable|string',
        ]);

        $storeId = $validated['store_id'] ?? null;

        $movementsQuery = BILProductTransactions::with('product:id,name')
            ->whereBetween('transdate', [
                Carbon::parse($request->start_date ?? '30 days ago')->startOfDay(),
                Carbon::parse($request->end_date ?? 'today')->endOfDay(),
            ]);

        if ($storeId) {
            $qtyInColumn = 'qtyin_' . $storeId;
            $qtyOutColumn = 'qtyout_' . $storeId;
            // This clause finds any transaction where either the in or out column for the store is not zero.
            $movementsQuery->where(function ($query) use ($qtyInColumn, $qtyOutColumn) {
                $query->where($qtyInColumn, '>', 0)
                      ->orWhere($qtyOutColumn, '>', 0);
            });
        }

        if ($request->filled('product_id')) {
            $movementsQuery->where('product_id', $request->product_id);
        }
        if ($request->filled('transtype')) {
            $movementsQuery->where('transtype', $request->transtype);
        }

        $movements = $movementsQuery->orderBy('transdate', 'desc')->orderBy('id', 'desc')->paginate(50)->withQueryString();

        return Inertia::render('Reports/Inventory/MovementHistory', [
            'movements' => $movements,
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'productsList' => SIV_Product::orderBy('name')->get(['id', 'name']),
            'transactionTypes' => BILProductTransactions::select('transtype')->distinct()->pluck('transtype'),
            'filters' => $validated,
        ]);
    }

    /**
     * Reorder Level Report
     * REFACTORED: Uses BILProductControl and a selected store.
     */
    public function reorderLevel(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:siv_stores,id',
            'category_id' => 'nullable|exists:siv_productcategories,id',
        ]);

        $storeId = $validated['store_id'] ?? null;

        if (is_null($storeId)) {
            $storeIds = SIV_Store::pluck('id');
            $sumColumns = $storeIds->map(fn($id) => "pc.qty_$id")->join(' + ');

            $lowStockQuery = DB::table('iv_productcontrol as pc')
                ->join('siv_products as p', 'pc.product_id', '=', 'p.id')
                ->leftJoin('siv_productcategories as cat', 'p.category_id', '=', 'cat.id')
                ->select(
                    'p.id', 'p.name as product_name', 'cat.name as category_name',
                    DB::raw("($sumColumns) as current_quantity"),
                    'p.reorderlevel as reorder_level'
                )
                ->whereNotNull('p.reorderlevel')
                ->where(DB::raw($sumColumns), '<=', DB::raw('p.reorderlevel'))
                ->where(DB::raw($sumColumns), '>', 0);
        } else {
            $validated['store_id'] = $storeId;
            $qtyColumn = 'pc.qty_' . $storeId;
            $lowStockQuery = DB::table('iv_productcontrol as pc')
                ->join('siv_products as p', 'pc.product_id', '=', 'p.id')
                ->leftJoin('siv_productcategories as cat', 'p.category_id', '=', 'cat.id')
                ->select(
                    'p.id', 'p.name as product_name', 'cat.name as category_name',
                    DB::raw("$qtyColumn as current_quantity"),
                    'p.reorderlevel as reorder_level'
                )
                ->whereNotNull('p.reorderlevel')
                ->where($qtyColumn, '<=', DB::raw('p.reorderlevel'))
                ->where($qtyColumn, '>', 0); // Optionally, only show items that are not yet out of stock
        }


        if ($request->filled('category_id')) {
            $lowStockQuery->where('p.category_id', $request->category_id);
        }

        $lowStockItems = $lowStockQuery->orderBy('p.name')->get();

        return Inertia::render('Reports/Inventory/ReorderLevel', [
            'lowStockItems' => $lowStockItems,
            'selectedStoreName' => $storeId ? (SIV_Store::find($storeId)->name ?? 'N/A') : 'All Stores',
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'categories' => SIV_ProductCategory::orderBy('name')->get(['id', 'name']),
            'filters' => $validated,
        ]);
    }

    /**
     * Expiring Items Report
     * This was already well-structured and needs no major changes.
     */
    public function expiringItems(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:siv_stores,id',
            'days_to_expiry' => 'nullable|integer|min:0', // e.g., show items expiring in next X days
            'product_id' => 'nullable|exists:siv_products,id',
        ]);

        $storeId = $validated['store_id'] ?? null;
        
        // --- FIX: Cast the input value to an integer ---
        $daysToExpiry = (int)($validated['days_to_expiry'] ?? 30); // Default to 30 days
        
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

        // Also ensure the value passed back to the view is the integer we used
        $validated['days_to_expiry'] = $daysToExpiry;

        return Inertia::render('Reports/Inventory/ExpiringItems', [
            'expiringItems' => $expiringItems,
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'productsList' => SIV_Product::orderBy('name')->get(['id', 'name']),
            'filters' => $validated + ['days_to_expiry_applied' => $daysToExpiry],
        ]);
    }


    /**
     * Slow Moving Stock Report
     * REFACTORED: Uses BILProductControl for current stock and simplifies the sales query.
     */
    public function slowMoving(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:siv_stores,id',
            'period_days' => 'nullable|integer|min:7',
            'max_sales_qty' => 'nullable|integer|min:0',
        ]);

        $storeId = $validated['store_id'] ?? null;
        
        $periodDays = $request->input('period_days', 90);
        $maxSalesQty = $request->input('max_sales_qty', 5);
        $dateLimit = Carbon::today()->subDays($periodDays)->startOfDay();

        // 1. Get products with stock
        if (is_null($storeId)) {
            $storeIds = SIV_Store::pluck('id');
            $sumColumns = $storeIds->map(fn($id) => "pc.qty_$id")->join(' + ');

            $productsWithStock = DB::table('iv_productcontrol as pc')
                ->join('siv_products as p', 'pc.product_id', '=', 'p.id')
                ->where(DB::raw($sumColumns), '>', 0)
                ->select('p.id as product_id', 'p.name as product_name', DB::raw("($sumColumns) as current_stock"))
                ->get()->keyBy('product_id');
        } else {
            $validated['store_id'] = $storeId;
            $qtyColumn = 'pc.qty_' . $storeId;
            $productsWithStock = DB::table('iv_productcontrol as pc')
                ->join('siv_products as p', 'pc.product_id', '=', 'p.id')
                ->where($qtyColumn, '>', 0)
                ->select('p.id as product_id', 'p.name as product_name', DB::raw("$qtyColumn as current_stock"))
                ->get()->keyBy('product_id');
        }

        if ($productsWithStock->isEmpty()) {
            return Inertia::render('Reports/Inventory/SlowMoving', [/* ... empty state ... */]);
        }

        // --- REFACTORED SALES QUERY ---
        // 2. Get sales quantities for these products from the correct store
        $salesQuery = BILSale::query()
            ->where('transdate', '>=', $dateLimit)
            ->where('voided', '!=', 1);

        if ($storeId) {
            $salesQuery->whereHas('inventoryRequisition', function ($query) use ($storeId) {
                $query->where('fromstore_id', $storeId);
            });
        }

        $salesData = $salesQuery->join('bil_saleitems', 'bil_sales.id', '=', 'bil_saleitems.sale_id')
            ->join('bls_items', 'bil_saleitems.item_id', '=', 'bls_items.id')
            ->whereIn('bls_items.product_id', $productsWithStock->keys())
            ->select('bls_items.product_id', DB::raw('SUM(bil_saleitems.quantity) as total_sold'))
            ->groupBy('bls_items.product_id')
            ->pluck('total_sold', 'bls_items.product_id');
        // --- END REFACTORED SALES QUERY ---

        // 3. Determine slow-moving items (this part is now more accurate)
        $slowMovingItems = $productsWithStock->filter(function ($stockInfo, $productId) use ($salesData, $maxSalesQty) {
            $soldQty = $salesData->get($productId, 0);
            return $soldQty <= $maxSalesQty;
        })->map(function ($stockInfo, $productId) use ($salesData, $storeId) {
            // Sub-query for the last sale date
            $lastSaleQuery = BILSale::query()
                ->where('voided', '!=', 1)
                ->whereHas('items.item.product', fn($q) => $q->where('id', $productId));

            if ($storeId) {
                $lastSaleQuery->whereHas('inventoryRequisition', fn($q) => $q->where('fromstore_id', $storeId));
            }
            
            $lastSaleDate = $lastSaleQuery->latest('transdate')->value('transdate');
            
            return [
                'product_id' => $productId,
                'product_name' => $stockInfo->product_name,
                'current_stock' => $stockInfo->current_stock,
                'quantity_sold_in_period' => (int) $salesData->get($productId, 0),
                'last_sale_date' => $lastSaleDate ? Carbon::parse($lastSaleDate)->toDateString() : null,
            ];
        })->values();

        return Inertia::render('Reports/Inventory/SlowMoving', [
            'slowMovingItems' => $slowMovingItems,
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'filters' => $validated,
        ]);
    }

    /**
     * Inventory Ageing Report (Placeholder)
     * A true ageing report requires detailed batch/lot tracking from goods reception.
     * This method serves as a placeholder to prevent errors until it's fully implemented.
     */
    public function ageing(Request $request)
    {
        // This is a complex report. For now, we return a view with a message
        // explaining that the feature is conceptual.
        return Inertia::render('Reports/Inventory/Ageing', [
            'reportData' => [
                'message' => 'Inventory Ageing Report is a complex feature that requires detailed batch/lot tracking for accurate implementation. This feature is not yet available.'
            ],
            'filters' => $request->all(),
        ]);
    }

    // You can also add back the custom report placeholder if you have a route for it
    /*
    public function customInventoryReport(Request $request)
    {
        return Inertia::render('Reports/Inventory/CustomBuilder', [
            'reportData' => ['message' => 'Custom Inventory Report Builder is a complex feature. This is a placeholder.'],
            'filters' => $request->all(),
        ]);
    }
     */

    private function getActivePriceConfigs()
    {
        $activePriceCategories = [];
        $priceCategorySettings = BLSPriceCategory::first();

        if ($priceCategorySettings) {
            for ($i = 1; $i <= 4; $i++) {
                if ($priceCategorySettings->{'useprice' . $i}) {
                    $activePriceCategories[] = [
                        'key' => 'price' . $i,
                        'label' => $priceCategorySettings->{'price' . $i},
                    ];
                }
            }
        }
        if (empty($activePriceCategories)) {
            $activePriceCategories[] = ['key' => 'price1', 'label' => 'Price'];
        }
        return $activePriceCategories;
    }

    // ... Helper to build the query ...
    private function getProductQuery(Request $request)
    {
        $query = SIV_Product::with(['category:id,name', 'unit:id,name', 'blsItem']);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('displayname', 'like', '%' . $request->search . '%');
            });
        }
        
        return $query->orderBy('name');
    }

    public function productList(Request $request)
    {
        $activePriceCategories = $this->getActivePriceConfigs();
        
        // Use paginate for the view
        $products = $this->getProductQuery($request)->paginate(50)->withQueryString();

        return Inertia::render('Reports/Inventory/ProductList', [
            'products'   => $products,
            'categories' => SIV_ProductCategory::orderBy('name')->get(['id', 'name']),
            'activePriceCategories' => $activePriceCategories,
            'filters'    => $request->only(['search', 'category_id']),
        ]);
    }

    public function exportProductListPdf(Request $request)
    {
        $activePriceCategories = $this->getActivePriceConfigs();
        
        // Use get() for export (all records)
        $products = $this->getProductQuery($request)->get();
        
        $categoryName = $request->category_id 
            ? SIV_ProductCategory::find($request->category_id)?->name 
            : 'All Categories';

        $pdf = Pdf::loadView('pdfs.product_list', [
            'products' => $products,
            'activePriceCategories' => $activePriceCategories,
            'categoryName' => $categoryName
        ]);

        return $pdf->download('product_list_' . date('Y_m_d') . '.pdf');
    }

    public function exportProductListExcel(Request $request)
    {
        $activePriceCategories = $this->getActivePriceConfigs();
        $products = $this->getProductQuery($request)->get();

        return Excel::download(
            new ProductsExport($products, $activePriceCategories), 
            'product_list_' . date('Y_m_d') . '.xlsx'
        );
    }

}