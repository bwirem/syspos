<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\BILSale;          // For Sales Data
use App\Models\PROPurchase;       // For Procurement Data
use App\Models\SPR_Supplier;      // For Procurement Data
use App\Models\SIV_Product;       // For Inventory Data
use App\Models\BILPhysicalStockBalance; // For Inventory Data
use Carbon\Carbon;
use Illuminate\Support\Facades\DB; // For more complex queries if needed

class DashboardController extends Controller
{
    public function __invoke(Request $request) // Using __invoke for single action controller
    {
        // --- Sales Data ---
        $today = Carbon::today();
        $salesTodayCount = BILSale::whereDate('transdate', $today)->where('voided', '!=', 1)->count();
        $salesTodayValue = BILSale::whereDate('transdate', $today)->where('voided', '!=', 1)->sum(DB::raw('totalpaid')); // Or totaldue - discount

        // --- Procurement Data ---
        // Example: Pending Purchase Orders (stage 1 might be pending)
        $pendingPOCount = PROPurchase::where('stage', 1)->count(); // Adjust stage logic as needed
        $activeSuppliersCount = SPR_Supplier::count(); // Or add an 'is_active' flag to your SPR_Supplier model

        // --- Inventory Data ---
        // This assumes BILPhysicalStockBalance is your current stock source
        // If using SIV_Product.reorderlevel, and BILPhysicalStockBalance.quantity
        $lowStockItemCountQuery = DB::table('siv_products as p')
            ->join('iv_physicalstockbalances as psb', 'p.id', '=', 'psb.product_id')
            ->whereNotNull('p.reorderlevel')
            ->whereColumn('psb.quantity', '<=', 'p.reorderlevel');
        $lowStockItemCount = $lowStockItemCountQuery->count(DB::raw('DISTINCT p.id'));


        $totalStockValue = DB::table('iv_physicalstockbalances as psb')
            ->join('siv_products as p', 'psb.product_id', '=', 'p.id')
            ->sum(DB::raw('psb.quantity * p.costprice')); // Assuming SIV_Product has costprice

        return Inertia::render('Dashboard', [
            'salesTodayCount' => $salesTodayCount,
            'salesTodayValue' => (float) $salesTodayValue,
            'pendingPOCount' => $pendingPOCount,
            'activeSuppliersCount' => $activeSuppliersCount,
            'lowStockItemCount' => $lowStockItemCount,
            'totalStockValue' => (float) $totalStockValue,
            // You can add more summarized data points as needed
        ]);
    }
}
