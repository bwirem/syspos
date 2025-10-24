<?php

namespace App\Http\Controllers;

use App\Enums\StoreType;
use App\Http\Controllers\Traits\ManagesItems;
use App\Models\IVNormalAdjustment;
use App\Models\SIV_AdjustmentReason;
use App\Models\SIV_Store;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class IVNormalAdjustmentController extends Controller
{
    // Use our trait for handling the create/update/delete of related items
    use ManagesItems;

    /**
     * Display a listing of normal adjustments.
     */
    public function index(Request $request)
    {
        $query = IVNormalAdjustment::with(['normaladjustmentitems', 'store']);

        if ($request->filled('search')) {
            $query->whereHas('store', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        } else {
            // By default, only show drafts and posted records that need processing.
            // You can change this to <= 2 if you have more stages.
            $query->where('stage', '<=', 2);
        }

        $normaladjustments = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('IvReconciliation/NormalAdjustment/Index', [
            'normaladjustments' => $normaladjustments,
            'filters' => $request->only(['search', 'stage']),
        ]);
    }

    /**
     * Show the form for creating a new NormalAdjustment.
     */
    public function create()
    {
        return inertia('IvReconciliation/NormalAdjustment/Create', [
            'stores' => SIV_Store::all(['id', 'name']),
            'adjustmentreasons' => SIV_AdjustmentReason::all(['id', 'name', 'action']),
        ]);
    }

    /**
     * Store a newly created NormalAdjustment in storage.
     */
    public function store(Request $request, InventoryService $inventoryService)
    {
        $validated = $request->validate([
            'store_id' => 'required|exists:siv_stores,id',
            'adjustment_reason_id' => 'required|exists:siv_adjustmentreasons,id',
            'stage' => 'required|integer|in:1,2', // Can be created as draft or posted
            'normaladjustmentitems' => 'required|array|min:1',
            'normaladjustmentitems.*.item_id' => 'required|exists:siv_products,id',
            'normaladjustmentitems.*.quantity' => 'required|numeric|min:0.01',
            'normaladjustmentitems.*.price' => 'required|numeric|min:0',
        ]);

        $adjustment = null;

        DB::beginTransaction();
        try {
            // Step 1: Create the main adjustment document
            $adjustment = IVNormalAdjustment::create([
                'transdate' => now(),
                'store_id' => $validated['store_id'],
                'adjustmentreason_id' => $validated['adjustment_reason_id'],
                'stage' => 1, // Always create as a draft first
                'total' => 0, // Will be calculated below
                'user_id' => Auth::id(),
            ]);

            // Step 2: Save the document details and items
            $this->processAdjustmentUpdate($adjustment, $validated);

            // Step 3: If the user chose to post immediately, process the stock movement
            if ((int) $validated['stage'] === 2) {
                $this->processStockAdjustment($adjustment, $inventoryService);
                // Finalize the stage
                $adjustment->update(['stage' => 2]);
            }

            DB::commit();

            return redirect()->route('inventory3.normal-adjustment.index')
                ->with('success', 'Normal Adjustment created successfully.');

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Normal Adjustment creation failed: ' . $e->getMessage());
            return back()->withInput()->with('error', 'Failed to create adjustment.');
        }
    }

    /**
     * Show the form for editing the specified normaladjustment.
     */
    public function edit(IVNormalAdjustment $normaladjustment)
    {
        $normaladjustment->load(['store', 'adjustmentreason', 'normaladjustmentitems.item']);

        return inertia('IvReconciliation/NormalAdjustment/Edit', [
            'normaladjustment' => $normaladjustment,
            'stores' => SIV_Store::all(['id', 'name']),
            'adjustmentreasons' => SIV_AdjustmentReason::all(['id', 'name', 'action']),
        ]);
    }

    /**
     * Update the specified normaladjustment in storage.
     */
    public function update(Request $request, IVNormalAdjustment $normaladjustment, InventoryService $inventoryService)
    {
        $validated = $request->validate([
            'store_id' => 'required|exists:siv_stores,id',
            'adjustment_reason_id' => 'required|exists:siv_adjustmentreasons,id',
            'stage' => 'required|integer|in:1,2', // Can be saved as draft or posted
            'normaladjustmentitems' => 'required|array|min:1',
            'normaladjustmentitems.*.id' => 'nullable|exists:iv_normaladjustmentitems,id',
            'normaladjustmentitems.*.item_id' => 'required|exists:siv_products,id',
            'normaladjustmentitems.*.quantity' => 'required|numeric|min:0.01',
            'normaladjustmentitems.*.price' => 'required|numeric|min:0',  
        ]);

        $newStage = (int) $validated['stage'];
        $originalStage = $normaladjustment->stage;

        DB::beginTransaction();
        try {
            // Step 1: Save the document changes (items, reason, etc.)
            $this->processAdjustmentUpdate($normaladjustment, $validated);

            // Step 2: If promoting from draft to posted, process the stock movement
            if ($newStage === 2 && $originalStage < 2) {
                $this->processStockAdjustment($normaladjustment, $inventoryService);
                // Finalize the stage
                $normaladjustment->update(['stage' => 2]);
            }

            DB::commit();
            return redirect()->route('inventory3.normal-adjustment.index')
                ->with('success', 'Normal Adjustment updated successfully.');
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Normal Adjustment update failed: ' . $e->getMessage());
            return back()->withInput()->with('error', 'Failed to update adjustment.');
        }
    }

    /**
     * Helper method to save the main record and sync its items.
     */
    private function processAdjustmentUpdate(IVNormalAdjustment $adjustment, array $validatedData): void
    {
        // Use the trait to handle creating, updating, and deleting items.
        $this->syncItems($adjustment, $validatedData['normaladjustmentitems'], 'normaladjustmentitems');

        // Reload the relationship to get an accurate total.
        $adjustment->load('normaladjustmentitems');
        $calculatedTotal = $adjustment->normaladjustmentitems->sum(fn($item) => $item->quantity * $item->price);

        // Update the main document record.
        $adjustment->update([
            'store_id' => $validatedData['store_id'],
            'adjustmentreason_id' => $validatedData['adjustment_reason_id'],
            'total' => $calculatedTotal,
            'user_id' => Auth::id(),
            'stage' => $validatedData['stage'], // Persist the intended stage
        ]);
    }

    /**
     * Helper method to call the InventoryService for stock movement.
     */
    

    private function processStockAdjustment(IVNormalAdjustment $adjustment, InventoryService $inventoryService): void
    {
        $adjustment->load(['adjustmentreason', 'normaladjustmentitems']);

        $reason = $adjustment->adjustmentreason;
        $storeId = $adjustment->store_id;

        $items = $adjustment->normaladjustmentitems->map(fn($item) => [
            'product_id' => $item->product_id,
            'quantity' => $item->quantity,
            'price' => $item->price,
        ])->all();

        if ($reason->action === "Add") {
            // --- USE THE ENUM FOR CONSISTENCY ---
            $inventoryService->receive(
                $storeId,
                $reason->id,
                // BEFORE: SIV_AdjustmentReason::class
                // AFTER:
                StoreType::AdjustmentReason->value, // Provides the integer 4
                $reason->name,
                $items
            );
        } elseif ($reason->action === "Deduct") {
            // --- USE THE ENUM FOR CONSISTENCY ---
            $inventoryService->issue(
                $storeId,
                $reason->id,
                // BEFORE: SIV_AdjustmentReason::class
                // AFTER:
                StoreType::AdjustmentReason->value, // Provides the integer 4
                $reason->name,
                $items
            );
        }
    }

    /**
     * Remove the specified normaladjustment from storage.
     */
    public function destroy(IVNormalAdjustment $normaladjustment)
    {
        // Prevent deletion of already posted adjustments
        if ($normaladjustment->stage >= 2) {
            return back()->with('error', 'Cannot delete an adjustment that has already been posted.');
        }

        $normaladjustment->delete(); // This should cascade delete items via DB constraints or model events

        return redirect()->route('inventory3.normal-adjustment.index')
            ->with('success', 'Adjustment deleted successfully.');
    }
}