<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\BILSale;          // For Sales Data
use App\Models\PROPurchase;       // For Procurement Data
use App\Models\SPR_Supplier;      // For Procurement Data
use App\Models\SIV_Store;         // For Inventory Data
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

        $storeIds = SIV_Store::pluck('id'); // Get all store IDs

        // Low stock still can be per store or across all stores
        $lowStockItemCount = DB::table('iv_productcontrol as pc')
            ->join('siv_products as p', 'pc.product_id', '=', 'p.id')
            ->whereNotNull('p.reorderlevel')
            ->where(function($query) use ($storeIds) {
                foreach ($storeIds as $id) {
                    $query->orWhereColumn("pc.qty_$id", '<=', 'p.reorderlevel');
                }
            })
            ->count(DB::raw('DISTINCT p.id'));

        // Total stock across all stores
        $sumColumns = $storeIds->map(fn($id) => "pc.qty_$id")->join(' + ');

        $totalStockValue = DB::table('iv_productcontrol as pc')
            ->join('siv_products as p', 'pc.product_id', '=', 'p.id')
            ->select(DB::raw("SUM(($sumColumns) * p.costprice) as total_value"))
            ->value('total_value');


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
