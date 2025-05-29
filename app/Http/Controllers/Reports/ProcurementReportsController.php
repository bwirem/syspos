<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PROPurchase;
use App\Models\PROPurchaseItem;
use App\Models\SPR_Supplier;
use App\Models\SIV_Product;
use App\Models\FacilityOption; // Assuming PROPurchase has facilityoption_id
use App\Models\SIV_ProductCategory; // Assuming SIV_Product links to categories
use Carbon\Carbon;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcurementReportsController extends Controller
{
    /**
     * Purchase Order History Report
     */
    public function purchaseOrderHistory(Request $request)
    {
        $validated = $request->validate([
            'start_date'  => 'nullable|date_format:Y-m-d',
            'end_date'    => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'supplier_id' => 'nullable|exists:siv_suppliers,id',
            'stage'       => 'nullable|integer', // Or string if stages are like 'pending', 'approved'
            'facilityoption_id' => 'nullable|exists:facility_options,id', // Assuming table name
        ]);

        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->subMonth())->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now())->endOfDay();

        $query = PROPurchase::with(['supplier:id,company_name,first_name,surname', 'facilityoption:id,name', 'purchaseitems'])
                    ->whereBetween('transdate', [$startDate, $endDate]);

        if (!empty($validated['supplier_id'])) {
            $query->where('supplier_id', $validated['supplier_id']);
        }
        if (!empty($validated['stage'])) {
            $query->where('stage', $validated['stage']);
        }
        if (!empty($validated['facilityoption_id'])) {
            $query->where('facilityoption_id', $validated['facilityoption_id']);
        }

        $purchaseOrders = $query->orderBy('transdate', 'desc')->paginate(25)->withQueryString();

        return Inertia::render('Reports/Procurement/PurchaseOrderHistory', [
            'purchaseOrders' => $purchaseOrders,
            'suppliers' => SPR_Supplier::orderBy('company_name')->orderBy('first_name')->get(['id', 'company_name', 'first_name', 'surname']),
            'facilityOptions' => FacilityOption::orderBy('name')->get(['id', 'name']),
            'filters' => $validated,
        ]);
    }

    /**
     * Supplier Performance Report (Basic Version)
     */
    public function supplierPerformance(Request $request)
    {
        $validated = $request->validate([
            'start_date'  => 'nullable|date_format:Y-m-d',
            'end_date'    => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'supplier_id' => 'nullable|exists:siv_suppliers,id',
        ]);

        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->subMonths(3))->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now())->endOfDay();

        $query = SPR_Supplier::query()->withCount(['purchaseorders' => function ($q) use ($startDate, $endDate) {
                $q->whereBetween('transdate', [$startDate, $endDate])
                  ->where('stage', '>=', 2); // Example: Count only approved/completed POs
            }])
            ->withSum(['purchaseorders' => function ($q) use ($startDate, $endDate) {
                $q->whereBetween('transdate', [$startDate, $endDate])
                  ->where('stage', '>=', 2);
            }], 'total'); // Sum of 'total' column from PROPurchase

        if (!empty($validated['supplier_id'])) {
            $query->where('id', $validated['supplier_id']);
        }

        $suppliersPerformance = $query->orderBy('purchaseorders_count', 'desc')->paginate(25)->withQueryString();
        // Note: PROPurchase model needs a 'purchaseorders' relationship defined in SPR_Supplier model:
        // public function purchaseorders() { return $this->hasMany(PROPurchase::class, 'supplier_id'); }


        return Inertia::render('Reports/Procurement/SupplierPerformance', [
            'suppliersPerformance' => $suppliersPerformance,
            'suppliers' => SPR_Supplier::orderBy('company_name')->orderBy('first_name')->get(['id', 'company_name', 'first_name', 'surname']),
            'filters' => $validated,
        ]);
    }

    /**
     * Item Purchase History Report
     */
    public function itemPurchaseHistory(Request $request)
    {
        $validated = $request->validate([
            'start_date'  => 'nullable|date_format:Y-m-d',
            'end_date'    => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'product_id'  => 'nullable|exists:siv_products,id',
            'supplier_id' => 'nullable|exists:siv_suppliers,id',
        ]);

        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->subMonths(3))->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now())->endOfDay();

        $query = PROPurchaseItem::with(['purchase.supplier:id,company_name,first_name,surname', 'item:id,name'])
            ->join('pro_purchase', 'pro_purchaseitems.purchase_id', '=', 'pro_purchase.id') // Join for date filtering
            ->whereBetween('pro_purchase.transdate', [$startDate, $endDate])
            ->where('pro_purchase.stage', '>=', 2); // Example: only consider items from approved/completed POs

        if (!empty($validated['product_id'])) {
            $query->where('pro_purchaseitems.product_id', $validated['product_id']);
        }
        if (!empty($validated['supplier_id'])) {
            $query->where('pro_purchase.supplier_id', $validated['supplier_id']);
        }

        $itemHistory = $query->select('pro_purchaseitems.*') // Select all from items after join
                              ->orderBy('pro_purchase.transdate', 'desc')
                              ->paginate(25)
                              ->withQueryString();

        return Inertia::render('Reports/Procurement/ItemPurchaseHistory', [
            'itemHistory' => $itemHistory,
            'products' => SIV_Product::orderBy('name')->get(['id', 'name']),
            'suppliers' => SPR_Supplier::orderBy('company_name')->orderBy('first_name')->get(['id', 'company_name', 'first_name', 'surname']),
            'filters' => $validated,
        ]);
    }

    /**
     * Spend Analysis Report
     */
    public function spendAnalysis(Request $request)
    {
        $validated = $request->validate([
            'start_date'  => 'nullable|date_format:Y-m-d',
            'end_date'    => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'supplier_id' => 'nullable|exists:siv_suppliers,id',
            'category_id' => 'nullable|exists:siv_productcategories,id', // Assuming SIV_Product has category_id
            'group_by'    => 'nullable|string|in:supplier,category,product',
        ]);

        $startDate = Carbon::parse($validated['start_date'] ?? Carbon::now()->subMonths(6))->startOfDay();
        $endDate   = Carbon::parse($validated['end_date']   ?? Carbon::now())->endOfDay();
        $groupBy   = $validated['group_by'] ?? 'supplier'; // Default grouping

        $query = PROPurchaseItem::query()
            ->join('pro_purchase', 'pro_purchaseitems.purchase_id', '=', 'pro_purchase.id')
            ->join('siv_products', 'pro_purchaseitems.product_id', '=', 'siv_products.id')
            ->whereBetween('pro_purchase.transdate', [$startDate, $endDate])
            ->where('pro_purchase.stage', '>=', 2); // Consider approved/completed POs

        if (!empty($validated['supplier_id'])) {
            $query->where('pro_purchase.supplier_id', $validated['supplier_id']);
        }
        if (!empty($validated['category_id'])) {
            $query->where('siv_products.category_id', $validated['category_id']);
        }

        $selectFields = [DB::raw('SUM(pro_purchaseitems.quantity * pro_purchaseitems.price) as total_spend')];
        $groupByFields = [];

        if ($groupBy === 'supplier') {
            $query->join('siv_suppliers', 'pro_purchase.supplier_id', '=', 'siv_suppliers.id');
            $selectFields[] = 'siv_suppliers.id as entity_id';
            $selectFields[] = 'siv_suppliers.company_name as entity_name_company';
            $selectFields[] = 'siv_suppliers.first_name as entity_name_first';
            $selectFields[] = 'siv_suppliers.surname as entity_name_last';
            $groupByFields = ['siv_suppliers.id', 'siv_suppliers.company_name', 'siv_suppliers.first_name', 'siv_suppliers.surname'];
        } elseif ($groupBy === 'category') {
            $query->leftJoin('siv_productcategories', 'siv_products.category_id', '=', 'siv_productcategories.id');
            $selectFields[] = 'siv_productcategories.id as entity_id';
            $selectFields[] = DB::raw('IFNULL(siv_productcategories.name, "Uncategorized") as entity_name');
            $groupByFields = ['siv_productcategories.id', 'siv_productcategories.name'];
        } elseif ($groupBy === 'product') {
            $selectFields[] = 'siv_products.id as entity_id';
            $selectFields[] = 'siv_products.name as entity_name';
            $groupByFields = ['siv_products.id', 'siv_products.name'];
        }

        $query->select($selectFields)->groupBy($groupByFields)->orderBy('total_spend', 'desc');
        $spendAnalysis = $query->get()->map(function ($item) use ($groupBy) {
            if ($groupBy === 'supplier') {
                $item->entity_name = $item->entity_name_company ?: trim(($item->entity_name_first ?? '') . ' ' . ($item->entity_name_last ?? ''));
            }
            return $item;
        });

        return Inertia::render('Reports/Procurement/SpendAnalysis', [
            'spendAnalysis' => $spendAnalysis,
            'suppliers' => SPR_Supplier::orderBy('company_name')->orderBy('first_name')->get(['id', 'company_name', 'first_name', 'surname']),
            'categories' => SIV_ProductCategory::orderBy('name')->get(['id', 'name']),
            'filters' => $validated,
        ]);
    }


    // --- Conceptual / Placeholder Reports (requiring more schema details or complex logic) ---

    public function grnSummary(Request $request)
    {
        // CONCEPTUAL: Assumes PROPurchase.stage indicates receipt (e.g., stage 3 = "Received")
        // Or you would query a dedicated GRN table if it exists.
        $validated = $request->validate([
            'start_date'  => 'nullable|date_format:Y-m-d',
            'end_date'    => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'supplier_id' => 'nullable|exists:siv_suppliers,id',
            'po_id'       => 'nullable|exists:pro_purchase,id', // Filter by specific PO
        ]);
        // ... Logic to query PROPurchase where stage = "Received" or query your GRN table ...
        Log::warning('GRN Summary Report: Placeholder. Implement based on GRN table or PO stages.');
        return Inertia::render('Reports/Procurement/GrnSummary', [
            'grnData' => [], // Placeholder
            'message' => 'Goods Received Note (GRN) Summary report needs to be implemented based on your specific GRN tracking mechanism (e.g., a dedicated GRN table or specific Purchase Order stages).',
            'filters' => $validated,
            'suppliers' => SPR_Supplier::orderBy('company_name')->get(['id', 'company_name', 'first_name', 'surname']),
            'purchaseOrders' => PROPurchase::orderBy('id', 'desc')->limit(100)->get(['id', 'transdate']), // Example for PO dropdown
        ]);
    }

    public function invoicePaymentReport(Request $request)
    {
        // CONCEPTUAL: Requires a supplier_invoices table and a supplier_payments table,
        // linked to PROPurchase.
        Log::warning('Invoice & Payment Report: Placeholder. Requires supplier invoice and payment tables.');
        return Inertia::render('Reports/Procurement/InvoicePayment', [
            'invoicePaymentData' => [], // Placeholder
            'message' => 'Supplier Invoice & Payment report requires dedicated tables for tracking supplier invoices and payments against purchase orders.',
            'filters' => $request->all(),
        ]);
    }

    public function cycleTimeReport(Request $request)
    {
        // CONCEPTUAL: Requires timestamps on PROPurchase for:
        // created_at, approved_at, goods_received_at, invoice_received_at, paid_at
        Log::warning('Procurement Cycle Time Report: Placeholder. Requires detailed timestamping across procurement stages.');
        return Inertia::render('Reports/Procurement/CycleTime', [
            'cycleTimeData' => [], // Placeholder
            'message' => 'Procurement Cycle Time analysis requires detailed timestamping of various stages (PO creation, approval, GRN, invoice, payment).',
            'filters' => $request->all(),
        ]);
    }

    public function customProcurementReport(Request $request)
    {
        Log::info('Custom Procurement Report - Incoming Request:', $request->all());
        return Inertia::render('Reports/Procurement/CustomBuilder', [
            'reportData' => null, // Initially no data
            'message' => 'This is a placeholder for a custom procurement report builder. Define available fields and filters based on PROPurchase, PROPurchaseItem, SPR_Supplier etc.',
            'filters' => $request->all(),
            // Pass available columns for procurement tables
            'availablePurchaseColumns' => PROPurchase::first() ? array_keys(PROPurchase::first()->getAttributes()) : [],
            'availablePurchaseItemColumns' => PROPurchaseItem::first() ? array_keys(PROPurchaseItem::first()->getAttributes()) : [],
            'availableSupplierColumns' => SPR_Supplier::first() ? array_keys(SPR_Supplier::first()->getAttributes()) : [],
        ]);
    }
}
