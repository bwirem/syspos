<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\BILSale;
use App\Models\BILSaleItem; // Not strictly needed if using relationships, but good for clarity
use App\Models\BLSItemGroup; // For grouping
use App\Models\BLSPaymentType; // For payment types
use App\Models\BILCollection; // For payment collections

use App\Models\BLSItem; // For item details
use App\Models\BLSCustomer; // For customer details
use App\Models\SIV_Store; // Assuming this is the model for stores
use App\Models\User; // For cashier/user details

use Carbon\Carbon;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // For logging purposes
use Illuminate\Support\Facades\Schema; // For checking column existence
// Ensure you have the necessary models imported
use Carbon\CarbonPeriod; // For handling date ranges and periods


class SalesReportsController extends Controller
{
    public function daily(Request $request)
    {       

        // Validate the date input, default to today if not provided or invalid
        $validated = $request->validate([
            'report_date' => 'nullable|date_format:Y-m-d',
        ]);

        $reportDate = Carbon::parse($validated['report_date'] ?? Carbon::today())->startOfDay();

        // Fetch sales for the selected date
        // Eager load necessary relationships for efficiency
        $salesQuery = BILSale::with([
                'items.item.itemgroup', // BILSale -> BILSaleItem -> BLSItem -> BLSItemGroup
                'customer'              // BILSale -> BLSCustomer
            ])
            ->whereDate('transdate', $reportDate) // Filter by the specific date part of transdate
            ->where('voided', '!=', 1) // Exclude voided sales (assuming 1 means voided)
            ->orderBy('transdate', 'asc'); // Optional: order by transaction time

        $salesForDay = $salesQuery->get();

        // --- Calculate Summaries ---
        $totalSalesAmount = $salesForDay->sum('totalpaid'); // Or 'totaldue' depending on what "sales" means
        $numberOfTransactions = $salesForDay->count();
        $totalDiscount = $salesForDay->sum('discount');

        // --- Aggregate Item Sales ---
        // We need to iterate through all sale items to get a consolidated list
        $aggregatedItems = [];
        foreach ($salesForDay as $sale) {
            foreach ($sale->items as $saleItem) {
                $itemId = $saleItem->item->id; // Assuming BLSItem ID
                $itemName = $saleItem->item->name;
                $itemGroupName = $saleItem->item->itemgroup->name ?? 'Uncategorized';
                $quantity = (float) $saleItem->quantity;
                $price = (float) $saleItem->price;
                $subtotal = $quantity * $price;

                if (!isset($aggregatedItems[$itemId])) {
                    $aggregatedItems[$itemId] = [
                        'item_id' => $itemId,
                        'item_name' => $itemName,
                        'item_group' => $itemGroupName,
                        'total_quantity' => 0,
                        'total_amount' => 0,
                        'individual_sales' => [] // To store each sale detail if needed
                    ];
                }
                $aggregatedItems[$itemId]['total_quantity'] += $quantity;
                $aggregatedItems[$itemId]['total_amount'] += $subtotal;
                // Optionally store individual sale details for this item if report needs drill-down
                // $aggregatedItems[$itemId]['individual_sales'][] = [
                //     'receipt_no' => $sale->receiptno,
                //     'quantity' => $quantity,
                //     'price' => $price,
                //     'subtotal' => $subtotal,
                // ];
            }
        }
        // Sort aggregated items, e.g., by name or total amount
        // usort($aggregatedItems, fn($a, $b) => $b['total_amount'] <=> $a['total_amount']); // Sort by amount desc

        // --- Aggregate Sales by Item Group ---
        $salesByItemGroup = [];
        foreach ($aggregatedItems as $item) {
            $groupName = $item['item_group'];
            if (!isset($salesByItemGroup[$groupName])) {
                $salesByItemGroup[$groupName] = [
                    'name' => $groupName,
                    'total_quantity' => 0,
                    'total_amount' => 0,
                ];
            }
            $salesByItemGroup[$groupName]['total_quantity'] += $item['total_quantity'];
            $salesByItemGroup[$groupName]['total_amount'] += $item['total_amount'];
        }
        // Sort by group name or amount
        // ksort($salesByItemGroup); // Sort by group name asc


        // Prepare data for the view
        $reportData = [
            'report_date_formatted' => $reportDate->format('F d, Y'), // e.g., January 01, 2023
            'report_date_input' => $reportDate->format('Y-m-d'), // For date picker re-population
            'total_sales_amount' => $totalSalesAmount,
            'number_of_transactions' => $numberOfTransactions,
            'total_discount' => $totalDiscount,
            'detailed_sales' => $salesForDay->map(function ($sale) { // For a detailed list of transactions
                return [
                    'id' => $sale->id,
                    'receipt_no' => $sale->receiptno,
                    'invoice_no' => $sale->invoiceno,
                    'transdate' => Carbon::parse($sale->transdate)->format('Y-m-d H:i:s'),
                    'customer_name' => $sale->customer ? ($sale->customer->customer_type === 'individual' ? trim($sale->customer->first_name . ' ' . $sale->customer->other_names . ' ' . $sale->customer->surname) : $sale->customer->company_name) : 'N/A',
                    'total_due' => (float) $sale->totaldue,
                    'total_paid' => (float) $sale->totalpaid,
                    'discount' => (float) $sale->discount,
                    'items_summary' => $sale->items->map(fn($item) => "{$item->item->name} (Qty: {$item->quantity})")->implode(', '),
                ];
            }),
            'aggregated_items' => array_values($aggregatedItems), // Convert from associative to indexed for easier frontend iteration
            'sales_by_item_group' => array_values($salesByItemGroup),
        ];

        return Inertia::render('Reports/Sales/Daily', [
            'reportData' => $reportData,
            'filters' => ['report_date' => $reportDate->format('Y-m-d')] // Pass back the active filter
        ]);
    }

  
    public function summary(Request $request)
    {
        // Validate date inputs, default to the current month if not provided
        $validated = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'group_by'   => 'nullable|string|in:day,week,month,item_group,product', // Example grouping options
        ]);

        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->startOfMonth())->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now()->endOfMonth())->endOfDay();
        $groupBy   = $validated['group_by'] ?? 'day'; // Default grouping by day

        // Base query for sales within the date range, excluding voided
        $salesQueryBase = BILSale::whereBetween('transdate', [$startDate, $endDate])
                               ->where('voided', '!=', 1); // Assuming 1 means voided

        // --- Overall Summary ---
        $totalSalesAmount     = (clone $salesQueryBase)->sum('totalpaid'); // Or 'totaldue'
        $numberOfTransactions = (clone $salesQueryBase)->count();
        $totalDiscount        = (clone $salesQueryBase)->sum('discount');

        // --- Data for Charts/Tables based on Grouping ---
        $groupedSalesData = [];
        $chartLabels = [];
        $chartData = [];

        switch ($groupBy) {
            case 'day':
                $period = CarbonPeriod::create($startDate, $endDate);
                $dailySales = (clone $salesQueryBase)
                    ->select(
                        DB::raw('DATE(transdate) as sale_date'),
                        DB::raw('SUM(totalpaid) as daily_total_sales'),
                        DB::raw('COUNT(id) as daily_transactions')
                    )
                    ->groupBy('sale_date')
                    ->orderBy('sale_date', 'asc')
                    ->get()
                    ->keyBy(fn($item) => Carbon::parse($item->sale_date)->format('Y-m-d')); // Key by date for easy lookup

                foreach ($period as $date) {
                    $dateString = $date->format('Y-m-d');
                    $chartLabels[] = $date->format('M d'); // e.g., Jan 01
                    $saleForDate = $dailySales->get($dateString);
                    $chartData[] = $saleForDate ? (float) $saleForDate->daily_total_sales : 0;
                    $groupedSalesData[] = [
                        'period_label' => $date->format('D, M d, Y'),
                        'total_sales' => $saleForDate ? (float) $saleForDate->daily_total_sales : 0,
                        'transactions' => $saleForDate ? (int) $saleForDate->daily_transactions : 0,
                    ];
                }
                break;

            case 'week': // More complex, might need Carbon's weekOfYear or similar logic
                $weeklySales = (clone $salesQueryBase)
                    ->select(
                        DB::raw(config('database.default') === 'sqlite' ? "strftime('%Y-%W', transdate) as sale_week" : "DATE_FORMAT(transdate, '%x-%v') as sale_week"), // Year-WeekNumber
                        DB::raw('SUM(totalpaid) as weekly_total_sales'),
                        DB::raw('COUNT(id) as weekly_transactions')
                    )
                    ->groupBy('sale_week')
                    ->orderBy('sale_week', 'asc')
                    ->get();
                foreach($weeklySales as $sale) {
                    // Convert 'YYYY-WW' to a more readable format if needed for label
                    $year = substr($sale->sale_week, 0, 4);
                    $week = substr($sale->sale_week, 5);
                    $weekStartDate = Carbon::now()->setISODate($year, $week)->startOfWeek();
                    $label = "Week of " . $weekStartDate->format('M d, Y');
                    $chartLabels[] = $label;
                    $chartData[] = (float) $sale->weekly_total_sales;
                    $groupedSalesData[] = [
                        'period_label' => $label,
                        'total_sales' => (float) $sale->weekly_total_sales,
                        'transactions' => (int) $sale->weekly_transactions,
                    ];
                }
                break;

            case 'month':
                $monthlySales = (clone $salesQueryBase)
                    ->select(
                        DB::raw(config('database.default') === 'sqlite' ? "strftime('%Y-%m', transdate) as sale_month" : "DATE_FORMAT(transdate, '%Y-%m') as sale_month"),
                        DB::raw('SUM(totalpaid) as monthly_total_sales'),
                        DB::raw('COUNT(id) as monthly_transactions')
                    )
                    ->groupBy('sale_month')
                    ->orderBy('sale_month', 'asc')
                    ->get();
                foreach($monthlySales as $sale) {
                    $label = Carbon::createFromFormat('Y-m', $sale->sale_month)->format('M Y');
                    $chartLabels[] = $label;
                    $chartData[] = (float) $sale->monthly_total_sales;
                    $groupedSalesData[] = [
                        'period_label' => $label,
                        'total_sales' => (float) $sale->monthly_total_sales,
                        'transactions' => (int) $sale->monthly_transactions,
                    ];
                }
                break;

            case 'item_group':
            case 'product': // For product, we join through BILSaleItem and BLSItem
                $itemsQuery = BILSaleItem::query()
                    ->join('bil_sales', 'bil_saleitems.sale_id', '=', 'bil_sales.id')
                    ->join('bls_items', 'bil_saleitems.item_id', '=', 'bls_items.id')
                    ->whereBetween('bil_sales.transdate', [$startDate, $endDate])
                    ->where('bil_sales.voided', '!=', 1);

                if ($groupBy === 'item_group') {
                    $itemsQuery->join('bls_itemgroups', 'bls_items.itemgroup_id', '=', 'bls_itemgroups.id')
                        ->select(
                            'bls_itemgroups.name as group_name',
                            DB::raw('SUM(bil_saleitems.quantity * bil_saleitems.price) as total_sales'),
                            DB::raw('SUM(bil_saleitems.quantity) as total_quantity')
                        )
                        ->groupBy('bls_itemgroups.name')
                        ->orderBy('group_name');
                } else { // product
                    $itemsQuery->select(
                            'bls_items.name as product_name',
                            'bls_items.id as product_id',
                            DB::raw('SUM(bil_saleitems.quantity * bil_saleitems.price) as total_sales'),
                            DB::raw('SUM(bil_saleitems.quantity) as total_quantity')
                        )
                        ->groupBy('bls_items.id', 'bls_items.name') // Group by ID and name
                        ->orderBy('product_name');
                }

                $aggregatedItems = $itemsQuery->get();
                foreach ($aggregatedItems as $item) {
                    $label = $item->group_name ?? $item->product_name;
                    $chartLabels[] = $label;
                    $chartData[] = (float) $item->total_sales;
                    $groupedSalesData[] = [
                        'period_label' => $label, // Or specific item/group name
                        'total_sales' => (float) $item->total_sales,
                        'total_quantity' => (float) $item->total_quantity,
                        'product_id' => $item->product_id ?? null, // For product grouping
                    ];
                }
                break;
        }

        $reportData = [
            'report_title' => "Sales Summary (" . $startDate->format('M d, Y') . " - " . $endDate->format('M d, Y') . ")",
            'start_date_input' => $startDate->format('Y-m-d'),
            'end_date_input'   => $endDate->format('Y-m-d'),
            'group_by_selected' => $groupBy,
            'total_sales_amount'     => $totalSalesAmount,
            'number_of_transactions' => $numberOfTransactions,
            'total_discount'         => $totalDiscount,
            'grouped_data_title'     => "Sales by " . ucwords(str_replace('_', ' ', $groupBy)),
            'grouped_sales_data'     => $groupedSalesData,
            'chart_labels'           => $chartLabels,
            'chart_data'             => $chartData,
        ];

        return Inertia::render('Reports/Sales/Summary', [
            'reportData' => $reportData,
            'filters' => $request->only(['start_date', 'end_date', 'group_by'])
        ]);
    }
 
  
    public function cashierSession(Request $request)
    {
        Log::info('CashierSession Report - Incoming Query Params:', $request->query());

        $validated = $request->validate([
            'user_id'    => 'sometimes|required|exists:users,id',
            'store_id'   => 'nullable|exists:siv_stores,id',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
        ]);
        Log::info('CashierSession Report - Validated Data:', $validated);

        $cashierIdFromRequest = $validated['user_id'] ?? null;
        $storeIdFromRequest   = $validated['store_id'] ?? null; // This filter will now primarily affect collections
        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::today())->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::today())->endOfDay();

        $reportData = null;
        $cashierNameForReport = 'N/A';
        $storeNameForReport = 'N/A'; // Will be set if store filter applied or user has stores

        if ($storeIdFromRequest) {
            $selectedStore = SIV_Store::find($storeIdFromRequest);
            if ($selectedStore) {
                $storeNameForReport = $selectedStore->name;
            }
        }


        if ($cashierIdFromRequest) {
            $cashier = User::findOrFail($cashierIdFromRequest);
            $cashierNameForReport = $cashier->name;

            // Adjust store name if not specifically filtered by store but user has stores
            if (!$storeIdFromRequest && $cashier->stores()->exists()) {
                $firstStore = $cashier->stores()->first();
                $storeNameForReport = $firstStore ? $firstStore->name . " (User's Primary/First)" : 'User Assigned Stores';
            } elseif (!$storeIdFromRequest) {
                $storeNameForReport = 'All Stores (User)';
            }


            // --- Sales Data ---
            $salesQuery = BILSale::with(['items.item.itemgroup', 'customer'])
                ->where('user_id', $cashierIdFromRequest)
                ->whereBetween('transdate', [$startDate, $endDate])
                ->where('voided', '!=', 1);

            // IF BILSALE CANNOT BE FILTERED BY STORE_ID, REMOVE THIS BLOCK OR ADAPT
            // For now, commenting out as bil_sales does not have store_id
            /*
            if ($storeIdFromRequest) {
                // This assumes BILSale *could* have a store_id or be linked differently.
                // If BILSale truly has no store context, this filter here is problematic.
                // One would have to decide if a sale by a user in a date range should be
                // attributed to the selected store filter, even if the sale record doesn't explicitly say so.
                // This is a business logic decision.
                // For now, we assume sales are by user, and collections might be filtered by store.
                // $salesQuery->where('some_column_that_links_to_store', $storeIdFromRequest);
                Log::info("CashierSession: Store filter ($storeIdFromRequest) applied to sales (LOGIC PENDING).");
            }
            */
            $sessionSales = $salesQuery->orderBy('transdate', 'asc')->get();
            Log::info('CashierSession Report - Sales Fetched:', ['count' => $sessionSales->count()]);


            // ... (Sales summary calculations remain the same) ...
            $totalGrossSales    = $sessionSales->sum(fn($sale) => (float) $sale->totaldue);
            $totalDiscounts     = $sessionSales->sum(fn($sale) => (float) $sale->discount);
            $totalNetSales      = $totalGrossSales - $totalDiscounts;
            $totalPaidAmount    = $sessionSales->sum(fn($sale) => (float) $sale->totalpaid);
            $numberOfTransactions = $sessionSales->count();

            // ... (Aggregated items sold logic remains the same) ...
            $aggregatedItems = [];
            foreach ($sessionSales as $sale) {
                foreach ($sale->items as $saleItem) {
                    if (!$saleItem->item) {
                        Log::warning('CashierSession Report: SaleItem missing related BLSItem.', ['sale_item_id' => $saleItem->id, 'sale_id' => $sale->id]);
                        continue;
                    }
                    $itemId = $saleItem->item->id;
                    $itemName = $saleItem->item->name;
                    $itemGroupName = $saleItem->item->itemgroup->name ?? 'Uncategorized';
                    $quantity = (float) $saleItem->quantity;
                    $price = (float) $saleItem->price;
                    $subtotal = $quantity * $price;
                    if (!isset($aggregatedItems[$itemId])) {
                        $aggregatedItems[$itemId] = ['item_id' => $itemId, 'item_name' => $itemName, 'item_group' => $itemGroupName, 'total_quantity' => 0, 'total_amount' => 0];
                    }
                    $aggregatedItems[$itemId]['total_quantity'] += $quantity;
                    $aggregatedItems[$itemId]['total_amount'] += $subtotal;
                }
            }


            // --- Payments Breakdown from BILCollection ---
            $paymentTypes = BLSPaymentType::orderBy('name')->get();
            $paymentsBreakdown = [];

            $collectionsQuery = BILCollection::where('user_id', $cashierIdFromRequest)
                                        ->whereBetween('transdate', [$startDate, $endDate])
                                        ->where('refunded', '!=', 1);

            if ($storeIdFromRequest) {
                // ** CRITICAL: This is where store filtering for COLLECTIONS happens. **
                // Option 1: If BILCollection table has a 'store_id' column directly.
                // $collectionsQuery->where('store_id', $storeIdFromRequest); // Uncomment if 'bil_collections.store_id' exists

                // Option 2: If BILCollection links to BILSale (e.g., via receiptno)
                // AND BILSale has the store_id (which we now know it doesn't directly).
                // So this subquery needs BILSale to be filterable by store, or this link is indirect.
                // For now, let's assume if a store filter is applied, collections are also filtered by that store
                // through an assumed (but potentially missing) link.
                // This part is the most schema-dependent.
                Log::info('CashierSession Report: Applying store filter to collections based on $storeIdFromRequest.', ['store_id' => $storeIdFromRequest]);
                // If you have a way to link BILCollection to a store, implement it here.
                // Example (if BILCollection has receiptno and BILSale has store_id and receiptno):
                $collectionsQuery->whereIn('receiptno', function ($query) use ($storeIdFromRequest, $startDate, $endDate, $cashierIdFromRequest) {
                    $query->select('receiptno')->from('bil_sales')
                          // ->where('store_id', $storeIdFromRequest) // Cannot use this if bil_sales.store_id DNE
                          // If filtering sales by store is not possible on bil_sales,
                          // then this subquery cannot filter collections by store through sales.
                          // We'd have to rely on bil_collections.store_id if it exists.
                          // For now, this subquery will just get receipts for the user/date.
                          ->where('user_id', $cashierIdFromRequest) // Ensure user matches
                          ->where('voided', '!=', 1)
                          ->whereBetween('transdate', [$startDate, $endDate]);
                          // If BILSale had a store_id, this would be: ->where('store_id', $storeIdFromRequest)
                });
                // If `bil_collections` itself has a `store_id`, this is much simpler:
                // $collectionsQuery->where('store_id', $storeIdFromRequest);
            }

            $sessionCollections = $collectionsQuery->get();
            Log::info('CashierSession Report - Collections Fetched for Payment Breakdown:', ['count' => $sessionCollections->count()]);


            $definedPayTypeColumns = ['paytype000001', 'paytype000002', 'paytype000003', 'paytype000004']; // Update this list!

            if (!$sessionCollections->isEmpty()) {
                $firstCollectionSample = $sessionCollections->first();
                foreach ($paymentTypes as $pt) {
                    $paytypeColumn = 'paytype' . str_pad($pt->id, 6, '0', STR_PAD_LEFT);
                    if (in_array($paytypeColumn, $definedPayTypeColumns) && property_exists($firstCollectionSample, $paytypeColumn)) {
                        $amountForThisType = $sessionCollections->sum(fn ($collection) => (float) ($collection->{$paytypeColumn} ?? 0));
                        if ($amountForThisType > 0) {
                            $paymentsBreakdown[] = [
                                'payment_type_id' => $pt->id,
                                'payment_type' => $pt->name,
                                'total_amount' => $amountForThisType,
                                'transaction_count' => $sessionCollections->filter(fn ($collection) => ($collection->{$paytypeColumn} ?? 0) > 0)->count(),
                            ];
                        }
                    } else {
                         Log::debug("CashierSession Report: Skipped paytype column '{$paytypeColumn}'.");
                    }
                }
            }
            Log::info('CashierSession Report - Payments Breakdown Processed:', $paymentsBreakdown);

            $reportData = [ /* ... as before ... */
                'report_title' => "Cashier Session Report",
                'cashier_name' => $cashierNameForReport,
                'store_name'   => $storeNameForReport, // Updated store name logic
                'start_date_formatted' => $startDate->format('F d, Y H:i A'),
                'end_date_formatted'   => $endDate->format('F d, Y H:i A'),
                'total_gross_sales'    => $totalGrossSales,
                'total_discounts'      => $totalDiscounts,
                'total_net_sales'      => $totalNetSales,
                'total_paid_by_sale_record' => $totalPaidAmount,
                'number_of_transactions' => $numberOfTransactions,
                'detailed_transactions' => $sessionSales->map(function ($sale) {
                    $customerName = 'N/A';
                    if ($sale->customer) {
                        $customerName = $sale->customer->customer_type === 'individual'
                            ? trim("{$sale->customer->first_name} {$sale->customer->other_names} {$sale->customer->surname}")
                            : $sale->customer->company_name;
                        if (empty(trim($customerName))) $customerName = 'N/A';
                    }
                    return [
                        'id' => $sale->id,
                        'receipt_no' => $sale->receiptno,
                        'transdate' => Carbon::parse($sale->transdate)->format('H:i:s'),
                        'customer_name' => $customerName,
                        'total_due' => (float) $sale->totaldue,
                        'discount' => (float) $sale->discount,
                        'total_paid' => (float) $sale->totalpaid,
                        'items_count' => $sale->items->sum('quantity'),
                    ];
                }),
                'aggregated_items_sold' => array_values($aggregatedItems),
                'payments_by_type'     => $paymentsBreakdown,
            ];
        } else {
            Log::info('CashierSession Report: No cashier_id provided, reportData not generated.');
        }

        $users = User::orderBy('name')->get(['id', 'name']);
        $stores = SIV_Store::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Reports/Sales/CashierSession', [
            'reportData' => $reportData,
            'users' => $users,
            'stores' => $stores,
            'filters' => [
                'user_id'    => $cashierIdFromRequest,
                'store_id'   => $storeIdFromRequest,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date'   => $endDate->format('Y-m-d'),
            ]
        ]);
    }
   

    public function salesByItem(Request $request)
    {
        Log::info('SalesByItem Report - Incoming Query Params:', $request->query());

        $validated = $request->validate([
            'start_date'    => 'nullable|date_format:Y-m-d',
            'end_date'      => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'group_by'      => 'nullable|string|in:product,item_group', // Allow nullable, will default
            'store_id'      => 'nullable|exists:siv_stores,id',
            'item_id'       => 'nullable|exists:bls_items,id',
            'itemgroup_id'  => 'nullable|exists:bls_itemgroups,id',
        ]);
        Log::info('SalesByItem Report - Validated Data:', $validated);

        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->startOfMonth())->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now()->endOfMonth())->endOfDay();
        $groupBy   = $validated['group_by'] ?? 'product'; // Default to 'product'
        $storeId   = $validated['store_id'] ?? null;
        $itemId    = $validated['item_id'] ?? null;
        $itemGroupId = $validated['itemgroup_id'] ?? null;

        Log::info('SalesByItem Report - Effective Filters:', [
            'startDate' => $startDate->toDateString(),
            'endDate' => $endDate->toDateString(),
            'groupBy' => $groupBy,
            'storeId' => $storeId,
            'itemId' => $itemId,
            'itemGroupId' => $itemGroupId,
        ]);

        $reportData = null; // Initialize

        // Only proceed if we have a valid group_by (even if defaulted)
        if ($groupBy) {
            $query = BILSaleItem::query()
                ->join('bil_sales', 'bil_saleitems.sale_id', '=', 'bil_sales.id')
                ->join('bls_items', 'bil_saleitems.item_id', '=', 'bls_items.id')
                ->whereBetween('bil_sales.transdate', [$startDate, $endDate])
                ->where('bil_sales.voided', '!=', 1); // Ensure this matches your void logic

            if ($storeId) {
                // Ensure your sales or sale items table has store_id
                if (Schema::hasColumn('bil_sales', 'store_id')) {
                    $query->where('bil_sales.store_id', $storeId);
                } elseif (Schema::hasColumn('bil_saleitems', 'store_id')) {
                     $query->where('bil_saleitems.store_id', $storeId);
                }
            }

            if ($itemId && $groupBy === 'product') {
                $query->where('bil_saleitems.item_id', $itemId);
            }

            if ($itemGroupId) { // This filter can apply to both product and item_group groupings
                $query->where('bls_items.itemgroup_id', $itemGroupId);
            }

            if ($groupBy === 'product') {
                $query->select(
                    'bls_items.id as product_id',
                    'bls_items.name as product_name',
                    DB::raw('SUM(bil_saleitems.quantity) as total_quantity_sold'),
                    DB::raw('SUM(bil_saleitems.quantity * bil_saleitems.price) as total_sales_amount'),
                    DB::raw('CASE WHEN SUM(bil_saleitems.quantity) > 0 THEN SUM(bil_saleitems.quantity * bil_saleitems.price) / SUM(bil_saleitems.quantity) ELSE 0 END as average_price')
                )
                ->groupBy('bls_items.id', 'bls_items.name')
                ->orderBy('product_name', 'asc');

            } elseif ($groupBy === 'item_group') {
                $query->join('bls_itemgroups', 'bls_items.itemgroup_id', '=', 'bls_itemgroups.id')
                    ->select(
                        'bls_itemgroups.id as item_group_id',
                        'bls_itemgroups.name as item_group_name',
                        DB::raw('SUM(bil_saleitems.quantity) as total_quantity_sold'),
                        DB::raw('SUM(bil_saleitems.quantity * bil_saleitems.price) as total_sales_amount')
                    )
                    ->groupBy('bls_itemgroups.id', 'bls_itemgroups.name')
                    ->orderBy('item_group_name', 'asc');
            }

            $results = $query->get();
            Log::info('SalesByItem Query Results Count:', ['count' => $results->count()]);
            if ($results->isEmpty() && ($request->filled('start_date') || $request->filled('group_by')) ) { // Log SQL if filters applied but no results
                Log::info('SalesByItem Query SQL (No Results):', ['sql' => $query->toSql(), 'bindings' => $query->getBindings()]);
            }


            // Calculate overall total sales for percentage calculation
            // This should also respect the store_id filter if applied
            $overallTotalSalesQuery = BILSale::whereBetween('transdate', [$startDate, $endDate])
                                            ->where('voided', '!=', 1);
            if ($storeId && Schema::hasColumn('bil_sales', 'store_id')) {
                $overallTotalSalesQuery->where('store_id', $storeId);
            }
            // If itemGroupId is applied, the "overall total" should probably be for that group,
            // or if itemId is applied, overall total should be for that item.
            // For simplicity now, overallTotalSalesForPeriod is for the date range & store.
            // You might want to refine this if a specific item/group filter is active.
            // A simple way is to sum the 'total_sales_amount' from the $results if filters are specific.
            if ($itemId || $itemGroupId) {
                $overallTotalSalesForPeriod = $results->sum('total_sales_amount');
            } else {
                $overallTotalSalesForPeriod = $overallTotalSalesQuery->sum(DB::raw('totaldue - discount')); // Or totalpaid
            }


            $reportData = [
                'report_title' => "Sales by " . ($groupBy === 'product' ? "Product/Service" : "Item Category"),
                'start_date_formatted' => $startDate->format('F d, Y'),
                'end_date_formatted'   => $endDate->format('F d, Y'),
                'group_by_selected'    => $groupBy,
                'results' => $results->map(function ($item) use ($overallTotalSalesForPeriod) {
                    $percentageOfTotal = ($overallTotalSalesForPeriod > 0 && isset($item->total_sales_amount))
                                        ? (($item->total_sales_amount / $overallTotalSalesForPeriod) * 100)
                                        : 0;
                    return [
                        'id' => $item->product_id ?? $item->item_group_id,
                        'name' => $item->product_name ?? $item->item_group_name,
                        'total_quantity_sold' => (float) $item->total_quantity_sold,
                        'total_sales_amount' => (float) $item->total_sales_amount,
                        'average_price' => isset($item->average_price) ? (float) $item->average_price : null,
                        'percentage_of_total_sales' => round($percentageOfTotal, 2),
                    ];
                }),
                'overall_total_sales_for_period' => (float) $overallTotalSalesForPeriod,
            ];
        } else {
             Log::info('SalesByItem Report - No group_by provided, reportData not generated.');
        }


        // Data for filter dropdowns
        $stores = SIV_Store::orderBy('name')->get(['id', 'name']);
        $items = BLSItem::orderBy('name')->get(['id', 'name']);
        $itemGroups = BLSItemGroup::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Reports/Sales/ByItem', [
            'reportData' => $reportData, // Can be null if no group_by
            'stores' => $stores,
            'items' => $items,
            'itemGroups' => $itemGroups,
            'filters' => [ // Send back the effective filters for repopulation
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'group_by' => $groupBy,
                'store_id' => $storeId,
                'item_id' => $itemId,
                'itemgroup_id' => $itemGroupId,
            ]
        ]);
    }

   
    public function paymentMethods(Request $request)
    {
        Log::info('PaymentMethods Report - Incoming Query Params:', $request->query());

        $validated = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'store_id'   => 'nullable|exists:siv_stores,id',
            'user_id'    => 'nullable|exists:users,id',
        ]);
        Log::info('PaymentMethods Report - Validated Data:', $validated);

        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->startOfMonth())->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now()->endOfMonth())->endOfDay();
        $storeId   = $validated['store_id'] ?? null;
        $userId    = $validated['user_id'] ?? null;

        Log::info('PaymentMethods Report - Effective Filters:', [
            'startDate' => $startDate->toDateString(), 'endDate' => $endDate->toDateString(),
            'storeId' => $storeId, 'userId' => $userId,
        ]);

        $reportData = null; // Initialize

        $collectionsQuery = BILCollection::query()
            ->whereBetween('transdate', [$startDate, $endDate])
            ->where('refunded', '!=', 1); // Assuming 1 means refunded

        if ($userId) {
            $collectionsQuery->where('user_id', $userId);
        }

        if ($storeId) {
            // --- IMPORTANT: Adapt this store filtering logic ---
            // Option 1: If BILCollection has a direct store_id
            // $collectionsQuery->where('store_id', $storeId);

            // Option 2: If BILCollection links to BILSale (e.g., via receiptno) and BILSale has store_id
            // This is an example, verify your actual schema for linking.
            // Ensure 'bil_sales' and 'bil_collections' tables and 'receiptno', 'store_id' columns exist.
            $collectionsQuery->whereIn('receiptno', function ($query) use ($storeId, $startDate, $endDate, $userId) {
                $query->select('receiptno')->from('bil_sales')
                      ->where('store_id', $storeId) // Assumes bil_sales.store_id exists
                      ->where('voided', '!=', 1)
                      ->whereBetween('transdate', [$startDate, $endDate]);
                if ($userId) {
                    $query->where('user_id', $userId);
                }
            });
            // If neither of the above, you need to define how collections are tied to a store.
        }

        $sessionCollections = $collectionsQuery->get();
        Log::info('PaymentMethods Report - Collections Fetched:', ['count' => $sessionCollections->count()]);

        $allPaymentTypes = BLSPaymentType::orderBy('name')->get();
        $paymentSummary = [];
        $overallTotalCollected = 0;

        // ** CRITICAL: Define your actual paytype columns from `bil_collections` table **
        // This array should list ALL 'paytypeXXXXXX' columns that exist.
        $definedPayTypeColumns = [
            'paytype000001',
            'paytype000002',
            'paytype000003',
            'paytype000004',
            // Add any other 'paytypeXXXXXX' columns you have, e.g., 'paytype000005', etc.
        ];

        if (!$sessionCollections->isEmpty()) { // Optimization: only loop if there are collections
            $firstCollection = $sessionCollections->first(); // Get a sample to check properties

            foreach ($allPaymentTypes as $pt) {
                $paytypeColumn = 'paytype' . str_pad($pt->id, 6, '0', STR_PAD_LEFT);

                // Workaround: Check if the constructed column name is in our defined list
                // AND if the property actually exists on the fetched collection objects (more robust).
                // The `property_exists` check is a good safeguard if your $definedPayTypeColumns
                // list might be out of sync or if some collections don't have all paytype columns (though unlikely with DB schema).
                if (in_array($paytypeColumn, $definedPayTypeColumns) && property_exists($firstCollection, $paytypeColumn)) {
                    $amountForThisType = $sessionCollections->sum(function ($collection) use ($paytypeColumn) {
                        return (float) ($collection->{$paytypeColumn} ?? 0); // Safely access property
                    });

                    if ($amountForThisType > 0) {
                        $paymentSummary[] = [
                            'payment_type_id' => $pt->id,
                            'payment_type_name' => $pt->name,
                            'total_amount_collected' => $amountForThisType,
                            'transaction_count' => $sessionCollections->filter(function ($collection) use ($paytypeColumn) {
                                return ($collection->{$paytypeColumn} ?? 0) > 0;
                            })->count(),
                        ];
                        $overallTotalCollected += $amountForThisType;
                    }
                } else {
                     Log::debug("PaymentMethods Report: Skipped paytype column '{$paytypeColumn}' as it's not in defined list or not a property of fetched collections.");
                }
            }
        }
        Log::info('PaymentMethods Report - Payment Summary Processed:', $paymentSummary);


        $reportData = [
            'report_title' => "Payment Methods Summary",
            'start_date_formatted' => $startDate->format('F d, Y'),
            'end_date_formatted'   => $endDate->format('F d, Y'),
            'store_name' => $storeId ? (SIV_Store::find($storeId)->name ?? 'Selected Store N/A') : 'All Stores',
            'cashier_name' => $userId ? (User::find($userId)->name ?? 'Selected Cashier N/A') : 'All Cashiers',
            'payment_summary' => $paymentSummary,
            'overall_total_collected' => $overallTotalCollected,
        ];

        $stores = SIV_Store::orderBy('name')->get(['id', 'name']);
        $users = User::orderBy('name')->get(['id', 'name']); // Fetch all users, or filter by role/group if needed

        return Inertia::render('Reports/Sales/PaymentMethods', [
            'reportData' => $reportData,
            'stores' => $stores,
            'users' => $users,
            'filters' => $request->only(['start_date', 'end_date', 'store_id', 'user_id'])
        ]);
    }
  

    public function customerHistory(Request $request)
    {
        Log::info('CustomerSalesHistory Report - Incoming Query Params:', $request->query());

        $validated = $request->validate([
            'customer_id' => 'sometimes|required|exists:bls_customers,id', // ID from bls_customers table
            'start_date'  => 'nullable|date_format:Y-m-d',
            'end_date'    => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
        ]);
        Log::info('CustomerSalesHistory Report - Validated Data:', $validated);

        $customerId = $validated['customer_id'] ?? null;
        $startDate  = Carbon::parse($validated['start_date'] ?? Carbon::now()->subYear()->startOfDay())->startOfDay(); // Default to last 1 year
        $endDate    = Carbon::parse($validated['end_date']   ?? Carbon::now()->endOfDay())->endOfDay();

        Log::info('CustomerSalesHistory Report - Effective Filters:', [
            'customerId' => $customerId,
            'startDate' => $startDate->toDateString(),
            'endDate' => $endDate->toDateString(),
        ]);

        $reportData = null;
        $customerDetails = null;

        if ($customerId) {
            $customer = BLSCustomer::find($customerId);
            if (!$customer) {
                // Or redirect back with error if customer not found is critical
                Log::warning('CustomerSalesHistory Report: Customer not found.', ['customer_id' => $customerId]);
            } else {
                $customerDetails = [
                    'id' => $customer->id,
                    'name' => $customer->customer_type === 'individual'
                                ? trim("{$customer->first_name} {$customer->other_names} {$customer->surname}")
                                : $customer->company_name,
                    'type' => $customer->customer_type,
                    'email' => $customer->email, // Add other relevant details
                    'phone' => $customer->phone,
                ];

                $salesQuery = BILSale::with(['items.item.itemgroup']) // No need to load customer again, we already have it
                    ->where('customer_id', $customerId)
                    ->whereBetween('transdate', [$startDate, $endDate])
                    ->where('voided', '!=', 1) // Exclude voided sales
                    ->orderBy('transdate', 'desc'); // Show most recent sales first

                $customerSales = $salesQuery->get();
                Log::info('CustomerSalesHistory Report - Sales Fetched:', ['count' => $customerSales->count()]);

                $totalAmountSpent = $customerSales->sum(fn($sale) => (float) $sale->totalpaid);
                $numberOfTransactions = $customerSales->count();
                $totalDiscountReceived = $customerSales->sum(fn($sale) => (float) $sale->discount);


                $reportData = [
                    'report_title'           => "Sales History For: " . ($customerDetails['name'] ?? "Customer ID: {$customerId}"),
                    'customer_details'       => $customerDetails,
                    'start_date_formatted'   => $startDate->format('F d, Y'),
                    'end_date_formatted'     => $endDate->format('F d, Y'),
                    'total_amount_spent'     => $totalAmountSpent,
                    'number_of_transactions' => $numberOfTransactions,
                    'total_discount_received'=> $totalDiscountReceived,
                    'sales_history'          => $customerSales->map(function ($sale) {
                        return [
                            'id'           => $sale->id,
                            'transdate'    => Carbon::parse($sale->transdate)->format('Y-m-d H:i:s'),
                            'receipt_no'   => $sale->receiptno,
                            'invoice_no'   => $sale->invoiceno,
                            'total_due'    => (float) $sale->totaldue,
                            'discount'     => (float) $sale->discount,
                            'total_paid'   => (float) $sale->totalpaid,
                            'items_count'  => $sale->items->sum('quantity'),
                            'items_summary'=> $sale->items->map(fn($item) => ($item->item ? $item->item->name : 'Unknown Item') . " (Qty: {$item->quantity}, Price: {$item->price})")->implode('; '),
                            'items'        => $sale->items->map(function ($saleItem) {
                                return [
                                    'name' => $saleItem->item ? $saleItem->item->name : 'Unknown Item',
                                    'quantity' => (float) $saleItem->quantity,
                                    'price' => (float) $saleItem->price,
                                    'subtotal' => (float) $saleItem->quantity * (float) $saleItem->price,
                                ];
                            }),
                        ];
                    }),
                ];
            }
        } else {
            Log::info('CustomerSalesHistory Report: No customer_id provided.');
        }

        // For customer filter dropdown
        $customers = BLSCustomer::orderBy('company_name')->orderBy('first_name')->orderBy('surname')
                        ->get()
                        ->map(function ($customer) {
                            return [
                                'id' => $customer->id,
                                'display_name' => $customer->customer_type === 'individual'
                                    ? trim("{$customer->first_name} {$customer->other_names} {$customer->surname}") . ($customer->idno ? " (ID: {$customer->idno})" : "")
                                    : $customer->company_name . ($customer->tinnumber ? " (TIN: {$customer->tinnumber})" : ""),
                            ];
                        });


        return Inertia::render('Reports/Sales/CustomerHistory', [
            'reportData'      => $reportData, // Can be null
            'customers'       => $customers,  // For the customer selection dropdown
            'filters'         => [
                'customer_id' => $customerId,
                'start_date'  => $startDate->format('Y-m-d'),
                'end_date'    => $endDate->format('Y-m-d'),
            ]
        ]);
    }

    
    public function eodSummary(Request $request)
    {
        Log::info('EOD Report - Incoming Query Params:', $request->query());

        $validated = $request->validate([
            'report_date' => 'required|date_format:Y-m-d', // Date is required to generate an EOD
            'store_id'    => 'nullable|exists:siv_stores,id',
            'user_id'     => 'nullable|exists:users,id',
        ]);
        Log::info('EOD Report - Validated Data:', $validated);

        // report_date will always be present due to validation
        $reportDate = Carbon::parse($validated['report_date'])->startOfDay();
        $storeIdFromRequest    = $validated['store_id'] ?? null;
        $userIdFromRequest     = $validated['user_id'] ?? null;

        Log::info('EOD Report - Effective Filters:', [
            'reportDate' => $reportDate->toDateString(),
            'storeId' => $storeIdFromRequest,
            'userId' => $userIdFromRequest
        ]);

        // --- Entity Details for Display ---
        $storeNameForReport = $storeIdFromRequest
            ? (SIV_Store::find($storeIdFromRequest)->name ?? 'Unknown Store')
            : 'All Stores';

        $cashierNameForReport = $userIdFromRequest
            ? (User::find($userIdFromRequest)->name ?? 'Unknown Cashier')
            : 'All Cashiers';

        if (!$storeIdFromRequest && $userIdFromRequest) {
            $cashier = User::find($userIdFromRequest);
            if ($cashier && $cashier->stores()->exists()) {
                $firstStore = $cashier->stores()->first();
                if ($firstStore) $storeNameForReport = $firstStore->name . " (User's Assigned)";
            }
        }

        // --- Base Sales Query for the Day ---
        $salesQuery = BILSale::query()
            ->whereDate('transdate', $reportDate)
            ->where('voided', '!=', 1); // Ensure this matches your void logic

        if ($userIdFromRequest) {
            $salesQuery->where('user_id', $userIdFromRequest);
        }
        // BILSale has no store_id, so we cannot directly filter $salesQuery by $storeIdFromRequest here.
        // If store-specific sales are needed, this EOD report would be different or rely on other linking.
        // For now, sales are based on date and optionally user.

        $dailySales = $salesQuery->get();
        Log::info('EOD Report - Sales Fetched:', ['count' => $dailySales->count()]);

        // --- Sales Summary ---
        $totalGrossSales      = $dailySales->sum(fn($sale) => (float) $sale->totaldue);
        $totalDiscounts       = $dailySales->sum(fn($sale) => (float) $sale->discount);
        $totalNetSales        = $totalGrossSales - $totalDiscounts;
        $numberOfTransactions = $dailySales->count();
        $totalPaidFromSales   = $dailySales->sum(fn($sale) => (float) $sale->totalpaid);


        // --- Payments Received Summary from BILCollection ---
        $collectionsQuery = BILCollection::query()
            ->whereDate('transdate', $reportDate)
            ->where('refunded', '!=', 1);

        if ($userIdFromRequest) {
            $collectionsQuery->where('user_id', $userIdFromRequest);
        }
        if ($storeIdFromRequest) {
            // ** CRITICAL: Adapt this based on whether BILCollection has store_id **
            // Assuming BILCollection *does* have a store_id for this example path.
            // If not, this filter won't work as intended for collections.
            // if (Schema::hasColumn('bil_collections', 'store_id')) { // If this check causes issues, remove it
            //    $collectionsQuery->where('store_id', $storeIdFromRequest);
            //    Log::info('EOD Report: Applied direct store_id filter to BILCollection.');
            // } else {
            //    Log::warning('EOD Report: Store filter provided, but BILCollection has no store_id column (or check failed). Payment breakdown might not be store-specific.');
            // }
            // For now, let's assume you've verified `bil_collections` has `store_id` if you want this filter:
            // $collectionsQuery->where('store_id', $storeIdFromRequest);
             Log::warning('EOD Report: Store filter for BILCollection needs verification. If bil_collections.store_id exists, uncomment the ->where clause.');
        }
        $dailyCollections = $collectionsQuery->get();
        Log::info('EOD Report - Collections Fetched for Payment Breakdown:', ['count' => $dailyCollections->count()]);

        $allPaymentTypes = BLSPaymentType::orderBy('name')->get();
        $paymentMethodSummary = [];
        $overallTotalCollectedByPayments = 0;
        $cashCollected = 0;

        // ** CRITICAL: Define your actual paytype columns from `bil_collections` table **
        $definedPayTypeColumns = [
            'paytype000001', 'paytype000002', 'paytype000003', 'paytype000004',
            // Add all columns that actually exist in your 'bil_collections' table
        ];

        if (!$dailyCollections->isEmpty()) {
            $firstCollectionSample = $dailyCollections->first(); // For property_exists check
            foreach ($allPaymentTypes as $pt) {
                $paytypeColumn = 'paytype' . str_pad($pt->id, 6, '0', STR_PAD_LEFT);

                if (in_array($paytypeColumn, $definedPayTypeColumns) && property_exists($firstCollectionSample, $paytypeColumn)) {
                    $amountForThisType = $dailyCollections->sum(fn($collection) => (float) ($collection->{$paytypeColumn} ?? 0));
                    if ($amountForThisType > 0) {
                        $paymentMethodSummary[] = [
                            'payment_type_id'   => $pt->id,
                            'payment_type_name' => $pt->name,
                            'total_amount'      => $amountForThisType,
                            'transaction_count' => $dailyCollections->filter(fn($c) => ($c->{$paytypeColumn} ?? 0) > 0)->count(),
                        ];
                        $overallTotalCollectedByPayments += $amountForThisType;
                        if (stripos($pt->name, 'cash') !== false) { // Simple check for "Cash"
                            $cashCollected += $amountForThisType;
                        }
                    }
                } else {
                    Log::debug("EOD Report: Skipped paytype column '{$paytypeColumn}' as it's not in defined list or not a property of fetched collections.");
                }
            }
        }
        Log::info('EOD Report - Payment Summary Processed:', $paymentMethodSummary);

        // --- Cash Reconciliation Placeholders ---
        $openingFloat = 0.00;   // TODO: Fetch from actual cash session data
        $cashPayouts = 0.00;    // TODO: Fetch from actual payout/expense data for the till
        $expectedCashInDrawer = $openingFloat + $cashCollected - $cashPayouts;

        $reportData = [
            'report_title'           => "End of Day Report",
            'report_date_formatted'  => $reportDate->format('F d, Y'),
            'store_name'             => $storeNameForReport,
            'cashier_name'           => $cashierNameForReport,
            'total_gross_sales'      => $totalGrossSales,
            'total_discounts'        => $totalDiscounts,
            'total_net_sales'        => $totalNetSales,
            'number_of_transactions' => $numberOfTransactions,
            'payment_method_summary' => $paymentMethodSummary,
            'overall_total_collected'=> $overallTotalCollectedByPayments,
            'total_paid_from_sales'  => $totalPaidFromSales,
            'opening_float'          => $openingFloat,
            'cash_collected_sales'   => $cashCollected,
            'cash_payouts'           => $cashPayouts,
            'expected_cash_in_drawer'=> $expectedCashInDrawer,
        ];
        Log::info('EOD Report - Final Report Data Generated:', ['title' => $reportData['report_title'], 'transactions' => $reportData['number_of_transactions']]);

        $stores = SIV_Store::orderBy('name')->get(['id', 'name']);
        $users = User::orderBy('name')->get(['id', 'name']); // Or filter for actual cashiers

        return Inertia::render('Reports/Sales/EodSummary', [
            'reportData' => $reportData,
            'stores' => $stores,
            'users' => $users,
            'filters' => [ // Pass back the effective filters used
                'report_date' => $reportDate->format('Y-m-d'),
                'store_id'    => $storeIdFromRequest,
                'user_id'     => $userIdFromRequest,
            ]
        ]);
    }


    public function customBuilder(Request $request)
    {
        Log::info('CustomReport Builder - Incoming Request:', $request->all());

        // --- Define Whitelisted Options ---
        $availableSaleColumns = ['id', 'transdate', 'receiptno', 'invoiceno', 'totaldue', 'discount', 'totalpaid', 'user_id', 'customer_id']; // Add more from BILSale
        $availableSaleItemColumns = ['quantity', 'price']; // Add more from BILSaleItem
        $availableItemColumns = ['name AS item_name']; // From BLSItem
        $availableItemGroupColumns = ['name AS item_group_name']; // From BLSItemGroup
        $availableCustomerColumns = ['first_name AS customer_first_name', 'company_name AS customer_company_name']; // From BLSCustomer
        $availableUserColumns = ['name AS user_name']; // From User (Cashier)

        $availableFilters = ['customer_id', 'user_id', 'store_id', 'item_id', 'itemgroup_id'];
        $availableGroupings = ['bil_sales.user_id', 'bil_sales.customer_id', 'bls_items.itemgroup_id', 'bil_saleitems.item_id', DB::raw('DATE(bil_sales.transdate)')];
        $groupingAliases = [
            'bil_sales.user_id' => 'Cashier',
            'bil_sales.customer_id' => 'Customer',
            'bls_items.itemgroup_id' => 'Item Category',
            'bil_saleitems.item_id' => 'Product/Service',
            DB::raw('DATE(bil_sales.transdate)') => 'Date'
        ];
        $availableAggregations = ['SUM(bil_saleitems.quantity*bil_saleitems.price) as total_revenue', 'SUM(bil_saleitems.quantity) as total_quantity', 'COUNT(DISTINCT bil_sales.id) as transaction_count', 'SUM(bil_sales.totalpaid) as total_paid_sum'];


        $validated = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'columns_sale' => ['nullable', 'array'],
            'columns_sale.*' => ['string', Rule::in($availableSaleColumns)],
            'columns_sale_item' => ['nullable', 'array'],
            'columns_sale_item.*' => ['string', Rule::in($availableSaleItemColumns)],
            'columns_item' => ['nullable', 'array'],
            'columns_item.*' => ['string', Rule::in($availableItemColumns)],
            // Add validation for other column groups (item_group, customer, user)
            'filters'    => 'nullable|array',
            'filters.*.field' => ['required_with:filters', 'string', Rule::in($availableFilters)],
            'filters.*.operator' => ['required_with:filters', 'string', Rule::in(['=', '!=', '>', '<', '>=', '<=', 'like', 'in', 'not_in'])],
            'filters.*.value' => 'required_with:filters', // Value can be string or array for 'in'/'not_in'
            'group_by'   => ['nullable', 'array'],
            'group_by.*' => ['string', Rule::in($availableGroupings)],
            'aggregations' => ['nullable', 'array'],
            'aggregations.*' => ['string', Rule::in($availableAggregations)],
            'report_title' => 'nullable|string|max:255',
        ]);
        Log::info('CustomReport Builder - Validated Data:', $validated);

        $reportData = null;
        $queryResults = collect();
        $selectedColumnsForDisplay = [];

        // Only build report if form submitted (e.g., by checking if specific fields like 'columns_sale' are present or a submit flag)
        // For simplicity, we'll generate if start_date or columns are provided, indicating an attempt.
        if ($request->has('columns_sale') || $request->has('start_date')) {
            $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->startOfMonth())->startOfDay();
            $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now()->endOfMonth())->endOfDay();

            // --- Build The Query Dynamically ---
            // This is a simplified example. A real builder would be much more robust.
            // We'll focus on a BILSaleItem centric query for now.
            $query = DB::table('bil_saleitems')
                ->join('bil_sales', 'bil_saleitems.sale_id', '=', 'bil_sales.id')
                ->join('bls_items', 'bil_saleitems.item_id', '=', 'bls_items.id')
                ->leftJoin('bls_itemgroups', 'bls_items.itemgroup_id', '=', 'bls_itemgroups.id')
                ->leftJoin('users', 'bil_sales.user_id', '=', 'users.id')
                ->leftJoin('bls_customers', 'bil_sales.customer_id', '=', 'bls_customers.id')
                ->whereBetween('bil_sales.transdate', [$startDate, $endDate])
                ->where('bil_sales.voided', '!=', 1);

            // --- Apply Selected Columns ---
            $selects = [];
            if (!empty($validated['columns_sale'])) {
                foreach ($validated['columns_sale'] as $col) $selects[] = 'bil_sales.' . $col;
            }
            if (!empty($validated['columns_sale_item'])) {
                foreach ($validated['columns_sale_item'] as $col) $selects[] = 'bil_saleitems.' . $col;
            }
            if (!empty($validated['columns_item'])) {
                foreach ($validated['columns_item'] as $col) $selects[] = 'bls_items.' . $col; // Assumes no alias needed or alias is in $col
            }
            // Add other column groups similarly...
            $selectedColumnsForDisplay = $selects; // Basic list for display, aliasing needs careful handling

            // --- Apply Filters ---
            if (!empty($validated['filters'])) {
                foreach ($validated['filters'] as $filter) {
                    $field = $filter['field'];
                    $operator = $filter['operator'];
                    $value = $filter['value'];

                    // Map frontend field names to actual DB columns carefully
                    $dbField = '';
                    if (in_array($field, ['customer_id', 'user_id'])) $dbField = 'bil_sales.' . $field;
                    elseif ($field === 'store_id' && Schema::hasColumn('bil_sales', 'store_id')) $dbField = 'bil_sales.store_id'; // If BILSale has store_id
                    elseif ($field === 'item_id') $dbField = 'bil_saleitems.item_id';
                    elseif ($field === 'itemgroup_id') $dbField = 'bls_items.itemgroup_id';

                    if ($dbField) {
                        if (in_array($operator, ['in', 'not_in'])) {
                            $query->whereIn($dbField, is_array($value) ? $value : explode(',', $value));
                        } elseif ($operator === 'like') {
                            $query->where($dbField, 'like', '%' . $value . '%');
                        } else {
                            $query->where($dbField, $operator, $value);
                        }
                    }
                }
            }

            // --- Apply Groupings and Aggregations ---
            if (!empty($validated['group_by'])) {
                foreach ($validated['group_by'] as $groupCol) {
                    // Need to handle DB::raw for grouping by DATE(transdate)
                    if (str_contains(strtolower($groupCol), 'date(')) {
                         $query->groupBy(DB::raw($groupCol)); // This might need to be added to select too
                         if(!in_array(DB::raw($groupCol . ' as grouped_date'), $selects)) $selects[] = DB::raw($groupCol . ' as grouped_date');
                    } else {
                        $query->groupBy($groupCol);
                        if(!in_array($groupCol, $selects)) $selects[] = $groupCol; // Ensure grouped columns are selected
                    }
                }
                // If grouping, aggregations are usually required
                if (!empty($validated['aggregations'])) {
                    foreach ($validated['aggregations'] as $agg) {
                        $selects[] = DB::raw($agg);
                    }
                } else { // Default aggregation if grouping
                    $selects[] = DB::raw('COUNT(*) as count_records');
                }
            } elseif (!empty($validated['aggregations'])) {
                 // Aggregations without grouping (e.g., overall SUM)
                 // This query structure might need to change if only aggregations are selected without grouping
                 // For simplicity, we assume if aggregations are present, grouping is intended or it's a full table aggregate.
                 // If no grouping, selecting raw columns + aggregations is often not standard SQL unless all non-aggregated are in GROUP BY
                 Log::warning('CustomReport: Aggregations selected without explicit grouping. Results might be unexpected.');
                 foreach ($validated['aggregations'] as $agg) $selects[] = DB::raw($agg);
            }


            if (empty($selects)) { // Default select if nothing chosen
                $selects = ['bil_sales.id as sale_id', 'bil_sales.transdate', 'bls_items.name as item_name', 'bil_saleitems.quantity', 'bil_saleitems.price'];
                $selectedColumnsForDisplay = $selects;
            }

            $query->select($selects);
            $queryResults = $query->get();
            Log::info('CustomReport Builder - Query Executed:', ['sql' => $query->toSql(), 'bindings' => $query->getBindings(), 'count' => $queryResults->count()]);


            $reportData = [
                'report_title'           => $validated['report_title'] ?? 'Custom Generated Report',
                'start_date_formatted'   => $startDate->format('F d, Y'),
                'end_date_formatted'     => $endDate->format('F d, Y'),
                'results'                => $queryResults,
                'headers'                => $this->determineHeaders($queryResults, $selects, $groupingAliases, $validated['group_by'] ?? []),
            ];
        }


        return Inertia::render('Reports/Sales/CustomBuilder', [
            'reportData'       => $reportData, // Can be null on initial load
            'availableSaleColumns' => $availableSaleColumns,
            'availableSaleItemColumns' => $availableSaleItemColumns,
            'availableItemColumns' => $availableItemColumns,
            'availableFilters' => $availableFilters, // For building filter UI
            'availableGroupings' => $groupingAliases, // Send alias map for display
            'availableAggregations' => $availableAggregations,
            'customers' => BLSCustomer::orderBy('company_name')->orderBy('first_name')->get(['id', 'first_name', 'surname', 'company_name', 'customer_type']),
            'users' => User::orderBy('name')->get(['id', 'name']),
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'items' => BLSItem::orderBy('name')->get(['id', 'name']),
            'itemGroups' => BLSItemGroup::orderBy('name')->get(['id', 'name']),
            'filters'          => $request->all() // Pass back all request params for form repopulation
        ]);
    }

    private function determineHeaders($results, $selects, $groupingAliases, $groupByFields)
    {
        if ($results->isEmpty()) {
            // Attempt to derive headers from select statements if no results
            return collect($selects)->map(function ($select) use ($groupingAliases) {
                if ($select instanceof \Illuminate\Database\Query\Expression) {
                    $strSelect = $select->getValue(DB::connection()->getQueryGrammar());
                } else {
                    $strSelect = $select;
                }

                // Attempt to extract alias
                if (stripos($strSelect, ' as ') !== false) {
                    return trim(substr($strSelect, stripos($strSelect, ' as ') + 4));
                }
                // Check if it's a grouping alias
                if (isset($groupingAliases[$strSelect])) {
                    return $groupingAliases[$strSelect];
                }
                // Fallback to column name (remove table prefix)
                return last(explode('.', $strSelect));
            })->unique()->values()->all();
        }
        // If results exist, use keys from the first result (more reliable for aliased/raw columns)
        return array_keys((array) $results->first());
    }



}
