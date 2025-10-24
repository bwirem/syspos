<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\BILSale;
use App\Models\BILSaleItem;
use App\Models\BLSItemGroup;
use App\Models\BLSPaymentType;
use App\Models\BILCollection;
use App\Models\BLSItem;
use App\Models\BLSCustomer;
use App\Models\SIV_Store;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class SalesReportsController extends Controller
{
    /**
     * Generate a detailed sales report for a single day.
     */
    public function daily(Request $request): InertiaResponse
    {
        $validated = $request->validate([
            'report_date' => 'nullable|date_format:Y-m-d',
        ]);
        $reportDate = Carbon::parse($validated['report_date'] ?? Carbon::today())->startOfDay();

        $baseSalesQuery = BILSale::whereDate('transdate', $reportDate)->where('voided', '!=', 1);

        $summaries = (clone $baseSalesQuery)->select(
            DB::raw('SUM(totalpaid) as total_sales'),
            DB::raw('COUNT(id) as transaction_count'),
            DB::raw('SUM(discount) as total_discount')
        )->first();

        $aggregatedItems = BILSaleItem::query()
            ->join('bil_sales', 'bil_saleitems.sale_id', '=', 'bil_sales.id')
            ->join('bls_items', 'bil_saleitems.item_id', '=', 'bls_items.id')
            ->leftJoin('bls_itemgroups', 'bls_items.itemgroup_id', '=', 'bls_itemgroups.id')
            ->whereDate('bil_sales.transdate', $reportDate)
            ->where('bil_sales.voided', '!=', 1)
            ->select(
                'bls_items.id as item_id', 'bls_items.name as item_name',
                DB::raw("COALESCE(bls_itemgroups.name, 'Uncategorized') as item_group"),
                DB::raw('SUM(bil_saleitems.quantity) as total_quantity'),
                DB::raw('SUM(bil_saleitems.quantity * bil_saleitems.price) as total_amount')
            )->groupBy('bls_items.id', 'bls_items.name', 'item_group')->orderBy('item_name')->get();

        $salesByItemGroup = $aggregatedItems->groupBy('item_group')
            ->map(fn ($items, $group) => [
                'name' => $group,
                'total_quantity' => $items->sum('total_quantity'),
                'total_amount' => $items->sum('total_amount'),
            ])->values();

        $detailedSales = (clone $baseSalesQuery)->with(['items.item', 'customer'])->orderBy('transdate', 'asc')->get();

        return Inertia::render('Reports/Sales/Daily', [
            'reportData' => [
                'report_date_formatted' => $reportDate->format('F d, Y'),
                'report_date_input' => $reportDate->format('Y-m-d'),
                'total_sales_amount' => (float) $summaries->total_sales,
                'number_of_transactions' => (int) $summaries->transaction_count,
                'total_discount' => (float) $summaries->total_discount,
                'detailed_sales' => $detailedSales->map(function ($sale) {
                    $customerName = 'N/A';
                    if ($sale->customer) {
                         $customerName = $sale->customer->customer_type === 'individual'
                            ? trim("{$sale->customer->first_name} {$sale->customer->other_names} {$sale->customer->surname}")
                            : $sale->customer->company_name;
                    }
                    return [
                        'id' => $sale->id, 'receipt_no' => $sale->receiptno, 'invoice_no' => $sale->invoiceno,
                        'transdate' => Carbon::parse($sale->transdate)->format('Y-m-d H:i:s'),
                        'customer_name' => $customerName ?: 'N/A',
                        'total_due' => (float) $sale->totaldue, 'total_paid' => (float) $sale->totalpaid,
                        'items_summary' => $sale->items->map(fn($item) => $item->item ? "{$item->item->name} (Qty: {$item->quantity})" : 'Unknown Item')->implode(', '),
                    ];
                }),
                'aggregated_items' => $aggregatedItems,
                'sales_by_item_group' => $salesByItemGroup,
            ],
            'filters' => ['report_date' => $reportDate->format('Y-m-d')]
        ]);
    }

    /**
     * Generate a sales summary report over a date range, with various grouping options.
     */
    public function summary(Request $request): InertiaResponse
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'group_by'   => 'nullable|string|in:day,week,month,item_group,product',
        ]);

        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->startOfMonth())->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now()->endOfMonth())->endOfDay();
        $groupBy   = $validated['group_by'] ?? 'day';

        $baseSalesQuery = BILSale::whereBetween('transdate', [$startDate, $endDate])->where('voided', '!=', 1);

        $summaries = (clone $baseSalesQuery)->select(
            DB::raw('SUM(totalpaid) as total_sales'),
            DB::raw('COUNT(id) as transaction_count'),
            DB::raw('SUM(discount) as total_discount')
        )->first();

        $groupedSalesData = []; $chartLabels = []; $chartData = [];

        switch ($groupBy) {
            case 'day':
                $period = CarbonPeriod::create($startDate, $endDate);
                $dailySales = (clone $baseSalesQuery)
                    ->select(DB::raw('DATE(transdate) as sale_date'), DB::raw('SUM(totalpaid) as daily_total'), DB::raw('COUNT(id) as daily_transactions'))
                    ->groupBy('sale_date')->orderBy('sale_date', 'asc')->get()->keyBy(fn($item) => Carbon::parse($item->sale_date)->format('Y-m-d'));
                foreach ($period as $date) {
                    $dateString = $date->format('Y-m-d');
                    $saleForDate = $dailySales->get($dateString);
                    $chartLabels[] = $date->format('M d');
                    $chartData[] = $saleForDate ? (float) $saleForDate->daily_total : 0;
                    $groupedSalesData[] = ['period_label' => $date->format('D, M d, Y'), 'total_sales' => $saleForDate ? (float) $saleForDate->daily_total : 0, 'transactions' => $saleForDate ? (int) $saleForDate->daily_transactions : 0];
                }
                break;
            case 'week':
                $weeklySales = (clone $baseSalesQuery)
                    ->select(DB::raw(config('database.default') === 'sqlite' ? "strftime('%Y-%W', transdate) as sale_week" : "DATE_FORMAT(transdate, '%x-%v') as sale_week"), DB::raw('SUM(totalpaid) as weekly_total'), DB::raw('COUNT(id) as weekly_transactions'))
                    ->groupBy('sale_week')->orderBy('sale_week', 'asc')->get();
                foreach($weeklySales as $sale) {
                    $year = substr($sale->sale_week, 0, 4); $week = substr($sale->sale_week, 5);
                    $label = "Week of " . Carbon::now()->setISODate($year, $week)->startOfWeek()->format('M d, Y');
                    $chartLabels[] = $label; $chartData[] = (float) $sale->weekly_total;
                    $groupedSalesData[] = ['period_label' => $label, 'total_sales' => (float) $sale->weekly_total, 'transactions' => (int) $sale->weekly_transactions];
                }
                break;
            case 'month':
                 $monthlySales = (clone $baseSalesQuery)
                    ->select(DB::raw(config('database.default') === 'sqlite' ? "strftime('%Y-%m', transdate) as sale_month" : "DATE_FORMAT(transdate, '%Y-%m') as sale_month"), DB::raw('SUM(totalpaid) as monthly_total'), DB::raw('COUNT(id) as monthly_transactions'))
                    ->groupBy('sale_month')->orderBy('sale_month', 'asc')->get();
                foreach($monthlySales as $sale) {
                    $label = Carbon::createFromFormat('Y-m', $sale->sale_month)->format('M Y');
                    $chartLabels[] = $label; $chartData[] = (float) $sale->monthly_total;
                    $groupedSalesData[] = ['period_label' => $label, 'total_sales' => (float) $sale->monthly_total, 'transactions' => (int) $sale->monthly_transactions];
                }
                break;
            case 'item_group': case 'product':
                $itemsQuery = BILSaleItem::query()->join('bil_sales', 'bil_saleitems.sale_id', '=', 'bil_sales.id')->join('bls_items', 'bil_saleitems.item_id', '=', 'bls_items.id')->whereBetween('bil_sales.transdate', [$startDate, $endDate])->where('bil_sales.voided', '!=', 1);
                if ($groupBy === 'item_group') {
                    $itemsQuery->join('bls_itemgroups', 'bls_items.itemgroup_id', '=', 'bls_itemgroups.id')->select('bls_itemgroups.name as group_name', DB::raw('SUM(bil_saleitems.quantity * bil_saleitems.price) as total_sales'), DB::raw('SUM(bil_saleitems.quantity) as total_quantity'))->groupBy('bls_itemgroups.name')->orderBy('group_name');
                } else {
                    $itemsQuery->select('bls_items.name as product_name', 'bls_items.id as product_id', DB::raw('SUM(bil_saleitems.quantity * bil_saleitems.price) as total_sales'), DB::raw('SUM(bil_saleitems.quantity) as total_quantity'))->groupBy('bls_items.id', 'bls_items.name')->orderBy('product_name');
                }
                $aggregatedItems = $itemsQuery->get();
                foreach ($aggregatedItems as $item) {
                    $label = $item->group_name ?? $item->product_name;
                    $chartLabels[] = $label; $chartData[] = (float) $item->total_sales;
                    $groupedSalesData[] = ['period_label' => $label, 'total_sales' => (float) $item->total_sales, 'total_quantity' => (float) $item->total_quantity, 'product_id' => $item->product_id ?? null];
                }
                break;
        }

        return Inertia::render('Reports/Sales/Summary', [
            'reportData' => [
                'report_title' => "Sales Summary ({$startDate->format('M d, Y')} - {$endDate->format('M d, Y')})",
                'start_date_input' => $startDate->format('Y-m-d'), 'end_date_input'   => $endDate->format('Y-m-d'), 'group_by_selected' => $groupBy,
                'total_sales_amount' => (float) $summaries->total_sales, 'number_of_transactions' => (int) $summaries->transaction_count, 'total_discount' => (float) $summaries->total_discount,
                'grouped_data_title' => "Sales by " . ucwords(str_replace('_', ' ', $groupBy)),
                'grouped_sales_data' => $groupedSalesData, 'chart_labels' => $chartLabels, 'chart_data' => $chartData,
            ],
            'filters' => $request->only(['start_date', 'end_date', 'group_by'])
        ]);
    }

    /**
     * Generate a session report for a specific cashier.
     */
    
    public function cashierSession(Request $request): InertiaResponse
    {
        $validated = $request->validate([
            'user_id'    => 'sometimes|required|exists:users,id',
            'store_id'   => 'nullable|exists:siv_stores,id',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
        ]);
        $cashierId = $validated['user_id'] ?? null;
        $storeId = $validated['store_id'] ?? null;
        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::today())->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::today())->endOfDay();
        $reportData = null;

        if ($cashierId) {
            $cashier = User::findOrFail($cashierId);
            $salesQuery = BILSale::where('user_id', $cashierId)
                ->whereBetween('transdate', [$startDate, $endDate])
                ->where('voided', '!=', 1);

            $salesSummaries = (clone $salesQuery)->select(DB::raw('SUM(totaldue) as total_gross'), DB::raw('SUM(discount) as total_disc'), DB::raw('SUM(totalpaid) as total_paid'), DB::raw('COUNT(id) as transaction_count'))->first();
            $paymentsBreakdown = $this->getDynamicPaymentBreakdown($startDate, $endDate, $cashierId, $storeId);

            $reportData = [
                'cashier_name' => $cashier->name,
                'start_date_formatted' => $startDate->format('F d, Y H:i A'),
                'end_date_formatted' => $endDate->format('F d, Y H:i A'),
                'total_gross_sales' => (float) $salesSummaries->total_gross,
                'total_discounts' => (float) $salesSummaries->total_disc,
                'total_net_sales' => (float) $salesSummaries->total_gross - (float) $salesSummaries->total_disc,
                'number_of_transactions' => (int) $salesSummaries->transaction_count,
                'payments_by_type' => $paymentsBreakdown,
                
                // --- FIX IS HERE: Restored the mapping logic and added 'items' to with() ---
                'detailed_transactions' => (clone $salesQuery)->with(['customer', 'items'])->orderBy('transdate', 'asc')->get()->map(function($sale) {
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
            ];
        }

        return Inertia::render('Reports/Sales/CashierSession', [
            'reportData' => $reportData,
            'users' => User::orderBy('name')->get(['id', 'name']),
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'filters' => ['user_id' => $cashierId, 'store_id' => $storeId, 'start_date' => $startDate->format('Y-m-d'), 'end_date' => $endDate->format('Y-m-d')]
        ]);
    }

    /**
     * Generate a report of sales broken down by item or item category.
     */
    
    public function salesByItem(Request $request): InertiaResponse
    {
        $validated = $request->validate([
            'start_date'    => 'nullable|date_format:Y-m-d',
            'end_date'      => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'group_by'      => 'nullable|string|in:product,item_group',
            'store_id'      => 'nullable|exists:siv_stores,id',
            'item_id'       => 'nullable|exists:bls_items,id',
            'itemgroup_id'  => 'nullable|exists:bls_itemgroups,id',
        ]);

        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->startOfMonth())->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now()->endOfMonth())->endOfDay();
        $groupBy   = $validated['group_by'] ?? 'product';
        $storeId   = $validated['store_id'] ?? null;
        $itemId    = $validated['item_id'] ?? null;
        $itemGroupId = $validated['itemgroup_id'] ?? null;

        $salesColumns = $this->getSafeColumnListing('bil_sales');

        $query = BILSaleItem::query()
            ->join('bil_sales', 'bil_saleitems.sale_id', '=', 'bil_sales.id')
            ->join('bls_items', 'bil_saleitems.item_id', '=', 'bls_items.id')
            ->whereBetween('bil_sales.transdate', [$startDate, $endDate])
            ->where('bil_sales.voided', '!=', 1)
            ->when($storeId && in_array('store_id', $salesColumns), fn($q) => $q->where('bil_sales.store_id', $storeId))
            ->when($itemId && $groupBy === 'product', fn($q) => $q->where('bil_saleitems.item_id', $itemId))
            ->when($itemGroupId, fn($q) => $q->where('bls_items.itemgroup_id', $itemGroupId));

        if ($groupBy === 'product') {
            $query->select(
                'bls_items.id as product_id', 'bls_items.name as product_name',
                DB::raw('SUM(bil_saleitems.quantity) as total_quantity_sold'),
                DB::raw('SUM(bil_saleitems.quantity * bil_saleitems.price) as total_sales_amount'),
                DB::raw('CASE WHEN SUM(bil_saleitems.quantity) > 0 THEN SUM(bil_saleitems.quantity * bil_saleitems.price) / SUM(bil_saleitems.quantity) ELSE 0 END as average_price')
            )->groupBy('bls_items.id', 'bls_items.name')->orderBy('product_name', 'asc');
        } else { // item_group
            $query->join('bls_itemgroups', 'bls_items.itemgroup_id', '=', 'bls_itemgroups.id')
                ->select(
                    'bls_itemgroups.id as item_group_id', 'bls_itemgroups.name as item_group_name',
                    DB::raw('SUM(bil_saleitems.quantity) as total_quantity_sold'),
                    DB::raw('SUM(bil_saleitems.quantity * bil_saleitems.price) as total_sales_amount')
                )->groupBy('bls_itemgroups.id', 'bls_itemgroups.name')->orderBy('item_group_name', 'asc');
        }

        $results = $query->get();
        
        if ($itemId || $itemGroupId) {
            $overallTotalSalesForPeriod = $results->sum('total_sales_amount');
        } else {
            $overallTotalSalesQuery = BILSale::whereBetween('transdate', [$startDate, $endDate])->where('voided', '!=', 1);
            if ($storeId && in_array('store_id', $salesColumns)) {
                $overallTotalSalesQuery->where('store_id', $storeId);
            }
            $overallTotalSalesForPeriod = $overallTotalSalesQuery->sum('totalpaid');
        }

        $reportData = [
            'report_title' => "Sales by " . ($groupBy === 'product' ? "Product/Service" : "Item Category"),
            'start_date_formatted' => $startDate->format('F d, Y'), 'end_date_formatted' => $endDate->format('F d, Y'),
            'group_by_selected'    => $groupBy,
            'results' => $results->map(function ($item) use ($overallTotalSalesForPeriod) {
                $percentageOfTotal = ($overallTotalSalesForPeriod > 0) ? (($item->total_sales_amount / $overallTotalSalesForPeriod) * 100) : 0;
                return [
                    'id' => $item->product_id ?? $item->item_group_id, 'name' => $item->product_name ?? $item->item_group_name,
                    'total_quantity_sold' => (float) $item->total_quantity_sold, 'total_sales_amount' => (float) $item->total_sales_amount,
                    'average_price' => isset($item->average_price) ? (float) $item->average_price : null,
                    'percentage_of_total_sales' => round($percentageOfTotal, 2),
                ];
            }),
            'overall_total_sales_for_period' => (float) $overallTotalSalesForPeriod,
        ];

        return Inertia::render('Reports/Sales/ByItem', [
            'reportData' => $reportData,
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'items' => BLSItem::orderBy('name')->get(['id', 'name']),
            'itemGroups' => BLSItemGroup::orderBy('name')->get(['id', 'name']),
            'filters' => [
                'start_date' => $startDate->format('Y-m-d'), 'end_date' => $endDate->format('Y-m-d'),
                'group_by' => $groupBy, 'store_id' => $storeId,
                'item_id' => $itemId, 'itemgroup_id' => $itemGroupId,
            ]
        ]);
    }

    /**
     * Generate a summary of payments received, broken down by payment method.
     */
    public function paymentMethods(Request $request): InertiaResponse
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d', 'end_date' => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'store_id' => 'nullable|exists:siv_stores,id', 'user_id' => 'nullable|exists:users,id',
        ]);
        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->startOfMonth())->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now()->endOfMonth())->endOfDay();
        $storeId   = $validated['store_id'] ?? null;
        $userId    = $validated['user_id'] ?? null;

        // This now calls the fully corrected helper method.
        $paymentsSummary = $this->getDynamicPaymentBreakdown($startDate, $endDate, $userId, $storeId);
        $overallTotalCollected = collect($paymentsSummary)->sum('total_amount_collected');

        return Inertia::render('Reports/Sales/PaymentMethods', [
            'reportData' => [
                'report_title' => "Payment Methods Summary", 'start_date_formatted' => $startDate->format('F d, Y'), 'end_date_formatted' => $endDate->format('F d, Y'),
                'store_name' => $storeId ? (SIV_Store::find($storeId)->name ?? 'N/A') : 'All Stores',
                'cashier_name' => $userId ? (User::find($userId)->name ?? 'N/A') : 'All Cashiers',
                'payment_summary' => $paymentsSummary,
                'overall_total_collected' => $overallTotalCollected,
            ],
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'users' => User::orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['start_date', 'end_date', 'store_id', 'user_id'])
        ]);
    }

    /**
     * Generate a detailed sales history for a specific customer.
     */
    public function customerHistory(Request $request): InertiaResponse
    {
        $validated = $request->validate([
            'customer_id' => 'sometimes|required|exists:bls_customers,id',
            'start_date'  => 'nullable|date_format:Y-m-d', 'end_date' => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
        ]);
        $customerId = $validated['customer_id'] ?? null;
        $startDate  = Carbon::parse($validated['start_date'] ?? Carbon::now()->subYear())->startOfDay();
        $endDate    = Carbon::parse($validated['end_date'] ?? Carbon::now())->endOfDay();
        $reportData = null;

        if ($customerId) {
            $customer = BLSCustomer::findOrFail($customerId);
            $salesQuery = BILSale::where('customer_id', $customerId)->whereBetween('transdate', [$startDate, $endDate])->where('voided', '!=', 1);

            $summaries = (clone $salesQuery)->select(DB::raw('SUM(totalpaid) as total_spent'), DB::raw('COUNT(id) as transaction_count'), DB::raw('SUM(discount) as total_discount'))->first();
            
            $reportData = [
                'customer_details' => ['id' => $customer->id, 'name' => $customer->customer_type === 'individual' ? trim("{$customer->first_name} {$customer->surname}") : $customer->company_name, 'type' => $customer->customer_type, 'email' => $customer->email, 'phone' => $customer->phone,],
                'start_date_formatted' => $startDate->format('F d, Y'), 'end_date_formatted' => $endDate->format('F d, Y'),
                'total_amount_spent' => (float) $summaries->total_spent, 'number_of_transactions' => (int) $summaries->transaction_count, 'total_discount_received'=> (float) $summaries->total_discount,
                'sales_history' => (clone $salesQuery)->with('items.item')->orderBy('transdate', 'desc')->get()->map(function ($sale) {
                    return [
                        'id' => $sale->id, 'transdate' => Carbon::parse($sale->transdate)->format('Y-m-d H:i:s'),
                        'receipt_no' => $sale->receiptno, 'invoice_no' => $sale->invoiceno,
                        'total_due' => (float) $sale->totaldue, 'discount' => (float) $sale->discount, 'total_paid' => (float) $sale->totalpaid,
                        'items_count' => $sale->items->sum('quantity'),
                        'items_summary' => $sale->items->map(fn($item) => ($item->item ? $item->item->name : 'Unknown Item') . " (Qty: {$item->quantity})")->implode('; '),
                        'items' => $sale->items->map(fn ($saleItem) => ['name' => $saleItem->item ? $saleItem->item->name : 'Unknown Item', 'quantity' => (float) $saleItem->quantity, 'price' => (float) $saleItem->price, 'subtotal' => (float) $saleItem->quantity * (float) $saleItem->price]),
                    ];
                }),
            ];
        }

        return Inertia::render('Reports/Sales/CustomerHistory', [
            'reportData' => $reportData,
            'customers' => BLSCustomer::orderBy('company_name')->orderBy('first_name')->get()
                ->map(fn($c) => ['id' => $c->id, 'display_name' => $c->customer_type === 'individual' ? trim("{$c->first_name} {$c->surname}") : $c->company_name]),
            'filters' => ['customer_id' => $customerId, 'start_date' => $startDate->format('Y-m-d'), 'end_date' => $endDate->format('Y-m-d')]
        ]);
    }
    
    /**
     * Generate an End of Day (EOD) summary report.
     */
    
    public function eodSummary(Request $request): InertiaResponse
    {
        $validated = $request->validate([
            'report_date' => 'nullable|date_format:Y-m-d',
            'store_id'    => 'nullable|exists:siv_stores,id',
            'user_id'     => 'nullable|exists:users,id',
        ]);
        $reportDate = Carbon::parse($validated['report_date'] ?? Carbon::today())->startOfDay();
        $storeId    = $validated['store_id'] ?? null;
        $userId     = $validated['user_id'] ?? null;

        $salesColumns = $this->getSafeColumnListing('bil_sales');

        $salesQuery = BILSale::query()->whereDate('transdate', $reportDate)->where('voided', '!=', 1);
        if ($userId) $salesQuery->where('user_id', $userId);
        if ($storeId && in_array('store_id', $salesColumns)) {
            $salesQuery->where('store_id', $storeId);
        }
        
        $summaries = (clone $salesQuery)->select(DB::raw('SUM(totaldue) as total_gross'), DB::raw('SUM(discount) as total_disc'), DB::raw('SUM(totalpaid) as total_paid'), DB::raw('COUNT(id) as transaction_count'))->first();
        $paymentMethodSummary = $this->getDynamicPaymentBreakdown($reportDate, $reportDate->copy()->endOfDay(), $userId, $storeId);
        $overallTotalCollected = collect($paymentMethodSummary)->sum('total_amount_collected');
        $cashCollected = collect($paymentMethodSummary)->firstWhere('payment_type_name', 'Cash')['total_amount_collected'] ?? 0;

        $reportData = [
            'report_title'           => "End of Day Report",
            'report_date_formatted'  => $reportDate->format('F d, Y'),
            'store_name'             => $storeId ? (SIV_Store::find($storeId)->name ?? 'N/A') : 'All Stores',
            'cashier_name'           => $userId ? (User::find($userId)->name ?? 'N/A') : 'All Cashiers',
            'total_gross_sales'      => (float) $summaries->total_gross,
            'total_discounts'        => (float) $summaries->total_disc,
            'total_net_sales'        => (float) $summaries->total_gross - (float) $summaries->total_disc,
            'number_of_transactions' => (int) $summaries->transaction_count,
            'payment_method_summary' => $paymentMethodSummary,
            'overall_total_collected'=> $overallTotalCollected,
            'total_paid_from_sales'  => (float) $summaries->total_paid,
            'cash_collected_sales'   => $cashCollected,
            'opening_float'          => 0.00,
            'cash_payouts'           => 0.00,
            'expected_cash_in_drawer'=> $cashCollected,
        ];

        return Inertia::render('Reports/Sales/EodSummary', [
            'reportData' => $reportData,
            'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'users' => User::orderBy('name')->get(['id', 'name']),
            'filters' => [
                'report_date' => $reportDate->format('Y-m-d'),
                'store_id'    => $storeId,
                'user_id'     => $userId,
            ],
        ]);
    }

    /**
     * A flexible report builder for creating custom sales reports.
     */
    public function customBuilder(Request $request): InertiaResponse
    {
        // --- Define Whitelisted Options ---
        $availableSaleColumns = ['id', 'transdate', 'receiptno', 'invoiceno', 'totaldue', 'discount', 'totalpaid', 'user_id', 'customer_id'];
        $availableSaleItemColumns = ['quantity', 'price'];
        $availableItemColumns = ['name AS item_name'];
        $availableCustomerColumns = ['first_name AS customer_first_name', 'company_name AS customer_company_name'];
        $availableUserColumns = ['name AS user_name'];

        $availableFilters = ['customer_id', 'user_id', 'store_id', 'item_id', 'itemgroup_id'];
        $availableGroupings = ['bil_sales.user_id', 'bil_sales.customer_id', 'bls_items.itemgroup_id', 'bil_saleitems.item_id', 'date_group'];
        $groupingAliases = [
            'bil_sales.user_id' => 'Cashier', 'bil_sales.customer_id' => 'Customer', 'bls_items.itemgroup_id' => 'Item Category',
            'bil_saleitems.item_id' => 'Product/Service', 'date_group' => 'Date'
        ];
        $availableAggregations = ['SUM(bil_saleitems.quantity*bil_saleitems.price) as total_revenue', 'SUM(bil_saleitems.quantity) as total_quantity', 'COUNT(DISTINCT bil_sales.id) as transaction_count', 'SUM(bil_sales.totalpaid) as total_paid_sum'];

        $validated = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d', 'end_date' => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'columns_sale' => ['nullable', 'array'], 'columns_sale.*' => ['string', Rule::in($availableSaleColumns)],
            'columns_sale_item' => ['nullable', 'array'], 'columns_sale_item.*' => ['string', Rule::in($availableSaleItemColumns)],
            'columns_item' => ['nullable', 'array'], 'columns_item.*' => ['string', Rule::in($availableItemColumns)],
            'filters' => 'nullable|array',
            'filters.*.field' => ['required_with:filters', 'string', Rule::in($availableFilters)],
            'filters.*.operator' => ['required_with:filters', 'string', Rule::in(['=', '!=', '>', '<', '>=', '<=', 'like', 'in', 'not_in'])],
            'filters.*.value' => 'required_with:filters',
            'group_by' => ['nullable', 'array'], 'group_by.*' => ['string', Rule::in($availableGroupings)],
            'aggregations' => ['nullable', 'array'], 'aggregations.*' => ['string', Rule::in($availableAggregations)],
            'report_title' => 'nullable|string|max:255',
        ]);

        $reportData = null;
        $queryResults = collect();

        if ($request->has('columns_sale') || $request->has('start_date')) {
            $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->startOfMonth())->startOfDay();
            $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now()->endOfMonth())->endOfDay();
            
            $salesColumns = $this->getSafeColumnListing('bil_sales');

            $query = DB::table('bil_saleitems')
                ->join('bil_sales', 'bil_saleitems.sale_id', '=', 'bil_sales.id')
                ->join('bls_items', 'bil_saleitems.item_id', '=', 'bls_items.id')
                ->leftJoin('bls_itemgroups', 'bls_items.itemgroup_id', '=', 'bls_itemgroups.id')
                ->leftJoin('users', 'bil_sales.user_id', '=', 'users.id')
                ->leftJoin('bls_customers', 'bil_sales.customer_id', '=', 'bls_customers.id')
                ->whereBetween('bil_sales.transdate', [$startDate, $endDate])
                ->where('bil_sales.voided', '!=', 1);

            $selects = [];
            if (!empty($validated['columns_sale'])) foreach ($validated['columns_sale'] as $col) $selects[] = 'bil_sales.' . $col;
            if (!empty($validated['columns_sale_item'])) foreach ($validated['columns_sale_item'] as $col) $selects[] = 'bil_saleitems.' . $col;
            if (!empty($validated['columns_item'])) foreach ($validated['columns_item'] as $col) $selects[] = 'bls_items.' . str_replace(' AS ', ' as ', $col);
            
            if (!empty($validated['filters'])) {
                foreach ($validated['filters'] as $filter) {
                    $field = $filter['field']; $operator = $filter['operator']; $value = $filter['value'];
                    $dbField = match ($field) {
                        'customer_id', 'user_id' => 'bil_sales.' . $field,
                        'store_id' => in_array('store_id', $salesColumns) ? 'bil_sales.store_id' : null,
                        'item_id' => 'bil_saleitems.item_id',
                        'itemgroup_id' => 'bls_items.itemgroup_id',
                        default => null,
                    };

                    if ($dbField) {
                        if (in_array($operator, ['in', 'not_in'])) $query->whereIn($dbField, is_array($value) ? $value : explode(',', $value));
                        elseif ($operator === 'like') $query->where($dbField, 'like', '%' . $value . '%');
                        else $query->where($dbField, $operator, $value);
                    }
                }
            }

            if (!empty($validated['group_by'])) {
                foreach ($validated['group_by'] as $groupCol) {
                    $groupExpression = ($groupCol === 'date_group') ? DB::raw('DATE(bil_sales.transdate)') : $groupCol;
                    $query->groupBy($groupExpression);
                    if(!in_array($groupExpression, $selects)) $selects[] = $groupCol === 'date_group' ? DB::raw('DATE(bil_sales.transdate) as date_group') : $groupCol;
                }
                if (!empty($validated['aggregations'])) {
                    foreach ($validated['aggregations'] as $agg) $selects[] = DB::raw($agg);
                } else {
                    $selects[] = DB::raw('COUNT(*) as count_records');
                }
            }
            
            if (empty($selects)) $selects = ['bil_sales.id as sale_id', 'bil_sales.transdate', 'bls_items.name as item_name', 'bil_saleitems.quantity', 'bil_saleitems.price'];
            
            $query->select($selects);
            $queryResults = $query->get();

            $reportData = [
                'report_title' => $validated['report_title'] ?? 'Custom Generated Report',
                'start_date_formatted' => $startDate->format('F d, Y'), 'end_date_formatted' => $endDate->format('F d, Y'),
                'results' => $queryResults,
                'headers' => $this->determineHeaders($queryResults, $selects),
            ];
        }

        return Inertia::render('Reports/Sales/CustomBuilder', [
            'reportData' => $reportData,
            'availableSaleColumns' => $availableSaleColumns, 'availableSaleItemColumns' => $availableSaleItemColumns,
            'availableItemColumns' => $availableItemColumns, 'availableFilters' => $availableFilters,
            'availableGroupings' => $groupingAliases, 'availableAggregations' => $availableAggregations,
            'customers' => BLSCustomer::orderBy('company_name')->orderBy('first_name')->get(),
            'users' => User::orderBy('name')->get(['id', 'name']), 'stores' => SIV_Store::orderBy('name')->get(['id', 'name']),
            'items' => BLSItem::orderBy('name')->get(['id', 'name']), 'itemGroups' => BLSItemGroup::orderBy('name')->get(['id', 'name']),
            'filters' => $request->all()
        ]);
    }

    //--------------------------------------------------------------------------
    // PRIVATE HELPER METHODS
    //--------------------------------------------------------------------------

    /**
     * A reusable, dynamic, and efficient method to get a payment breakdown summary.
     */
    private function getDynamicPaymentBreakdown(Carbon $startDate, Carbon $endDate, ?int $userId, ?int $storeId): array
    {
        $paymentTypes = BLSPaymentType::orderBy('name')->get();
        if ($paymentTypes->isEmpty()) return [];

        // --- FIX: Use the safe helper method to get columns ---
        $collectionColumns = $this->getSafeColumnListing('bil_collections');
        if (empty($collectionColumns)) {
            // The helper will log the error, so we just return.
            return [];
        }
        
        $selectClause = []; $columnMap = [];

        foreach ($paymentTypes as $pt) {
            $colName = 'paytype' . str_pad($pt->id, 6, '0', STR_PAD_LEFT);
            if (in_array($colName, $collectionColumns)) {
                $selectClause[] = DB::raw("SUM({$colName}) as sum_{$pt->id}");
                $selectClause[] = DB::raw("COUNT(CASE WHEN {$colName} > 0 THEN 1 END) as count_{$pt->id}");
                $columnMap[$pt->id] = $pt->name;
            }
        }

        if (empty($selectClause)) {
            Log::warning('Payment Breakdown Report: No valid paytypeXXXXXX columns found in bil_collections table.');
            return [];
        }

        $collectionsQuery = BILCollection::query()
            ->whereBetween('transdate', [$startDate, $endDate])->where('refunded', '!=', 1)
            ->when($userId, fn(Builder $q) => $q->where('user_id', $userId))
            ->when($storeId, function (Builder $q) use ($storeId, $collectionColumns) {
                if (in_array('store_id', $collectionColumns)) return $q->where('store_id', $storeId);
                Log::warning('Payment Breakdown Report: store_id filter applied, but no store_id on bil_collections table.');
                return $q;
            });
            
        $totals = $collectionsQuery->select($selectClause)->first();
        if (!$totals) return [];

        $summary = [];
        foreach ($columnMap as $id => $name) {
            $sumColumn = "sum_{$id}"; $countColumn = "count_{$id}";
            $amount = (float)($totals->{$sumColumn} ?? 0);
            
            if ($amount > 0) {
                $summary[] = [
                    'payment_type_id' => $id,
                    'payment_type_name' => $name,
                    'total_amount_collected' => $amount,
                    'transaction_count' => (int)($totals->{$countColumn} ?? 0),
                ];
            }
        }
        
        Log::info('Generated Payment Breakdown Summary:', $summary);
        return $summary;
    }

    /**
     * Gets a table's column listing in a way that is safe for older DB versions.
     * This avoids the 'generation_expression' error.
     *
     * @param string $tableName
     * @return array
     */
    private function getSafeColumnListing(string $tableName): array
    {
        try {
            // This simpler query is compatible with older MySQL/MariaDB versions.
            $columns = DB::select("SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?", [
                DB::getDatabaseName(),
                $tableName
            ]);

            return array_map('current', $columns);
        } catch (\Exception $e) {
            Log::error("Could not get a safe column listing for table '{$tableName}'.", ['error' => $e->getMessage()]);
            return [];
        }
    }
}
