<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\ManagesItems;
use App\Models\IVPhysicalInventory;
use App\Models\SIV_Store;
use App\Services\PhysicalInventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class IVPhysicalInventoryController extends Controller
{
    use ManagesItems;

    const STAGE_CLOSED = 3;

    public function index(Request $request)
    {
        $query = IVPhysicalInventory::with(['physicalinventoryitems', 'store']);

        if ($request->filled('search')) {
            $query->whereHas('store', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        } else {
            $query->where('stage', '<', self::STAGE_CLOSED);
        }

        $inventories = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('IvReconciliation/PhysicalInventory/Index', [
            'physicalinventorys' => $inventories, // Match view prop name
            'filters' => $request->only(['search', 'stage']),
        ]);
    }

    public function create()
    {
        return inertia('IvReconciliation/PhysicalInventory/Create', [
            'stores' => SIV_Store::all(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'required|exists:siv_stores,id',
            'description' => 'nullable|string|max:255',
            'stage' => 'required|integer|min:1',           
            'physicalinventoryitems' => 'required|array|min:1',
            'physicalinventoryitems.*.item_id' => 'required|exists:siv_products,id',
            'physicalinventoryitems.*.countedqty' => 'required|numeric|min:0',
            'physicalinventoryitems.*.expectedqty' => 'required|numeric',
            'physicalinventoryitems.*.price' => 'required|numeric|min:0',
        ]);
        
        $inventory = null;
        DB::transaction(function () use ($validated, &$inventory) {
            $inventory = IVPhysicalInventory::create([
                'transdate' => now(),
                'store_id' => $validated['store_id'],
                'description' => $validated['description'],
                'stage' => $validated['stage'],
                'user_id' => Auth::id(),
            ]);

            // Use trait to create items
            $this->syncItems($inventory, $validated['physicalinventoryitems'], 'physicalinventoryitems');
        });

        return redirect()->route('inventory3.physical-inventory.edit', $inventory->id)
            ->with('success', 'Physical Inventory draft created successfully.');
    }

    public function edit(IVPhysicalInventory $physicalinventory)
    {
        $physicalinventory->load(['store', 'physicalinventoryitems.item']);

        return inertia('IvReconciliation/PhysicalInventory/Edit', [
            'physicalinventory' => $physicalinventory,
            'stores' => SIV_Store::all(['id', 'name']),
        ]);
    }

    public function update(Request $request, IVPhysicalInventory $physicalinventory)
    {
        $validated = $request->validate([
            'store_id' => 'required|exists:siv_stores,id',
            'description' => 'nullable|string|max:255',
            'stage' => 'required|integer|min:1',           
            'physicalinventoryitems' => 'required|array|min:1',
            'physicalinventoryitems.*.id' => 'nullable|exists:iv_physicalinventoryitems,id', // For existing items
            'physicalinventoryitems.*.item_id' => 'required|exists:siv_products,id',
            'physicalinventoryitems.*.countedqty' => 'required|numeric|min:0',
            'physicalinventoryitems.*.expectedqty' => 'required|numeric',
            'physicalinventoryitems.*.price' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated, $physicalinventory) {
            // Use trait to update items
            $this->syncItems($physicalinventory, $validated['physicalinventoryitems'], 'physicalinventoryitems');
            
            // Update main document details
            $physicalinventory->update([
                'store_id' => $validated['store_id'],
                'description' => $validated['description'],
                'stage' => $validated['stage'],
                'user_id' => Auth::id(),
            ]);
        });
        
        return redirect()->route('inventory3.physical-inventory.index')
            ->with('success', 'Physical Inventory updated successfully.');
    }
    
    /**
     * Commits the physical inventory count, finalizing it and updating stock levels.
     */
    public function commit(Request $request, IVPhysicalInventory $physicalinventory, PhysicalInventoryService $service)
    {
        // 1. Authorization & Status Check
        if ($physicalinventory->stage >= self::STAGE_CLOSED) {
            return back()->with('error', 'This inventory count has already been closed.');
        }
        
        // (Optional) Add validation for any data submitted with the commit request
        // $request->validate([...]);

        try {
            // 2. Delegate all complex logic to the service
            $service->commit($physicalinventory);

            // 3. Redirect with success message
            return redirect()->route('inventory3.physical-inventory.index')
                ->with('success', 'Physical Inventory committed successfully and stock levels have been updated.');

        } catch (Throwable $e) {
            Log::error('Physical Inventory commit failed: ' . $e->getMessage() . ' Trace: ' . $e->getTraceAsString());
            return back()->with('error', 'A critical error occurred while committing the inventory.');
        }
    }
}