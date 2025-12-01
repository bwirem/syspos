<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\ManagesItems;
use App\Models\IVRequistion;
use App\Models\IVRequistionItem;

use App\Models\SIV_Store;
use App\Models\BLSCustomer;
use App\Models\FacilityOption; // +++ IMPORTED
use App\Enums\StoreType;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException; // +++ IMPORTED

use Illuminate\Support\Facades\Log;

class IVRequistionController extends Controller
{
    use ManagesItems;

    /**
     * Display a listing of requistions.
     */
    public function index(Request $request)
    {
        $query = IVRequistion::with(['requistionitems', 'fromstore']);

        // General search (only for tostore and customer/store names)
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                // Add condition for SIV_Store tostore
                $q->orWhere(function ($sub) use ($request) {
                    $sub->where('tostore_type', StoreType::Store->value)
                        ->whereIn('tostore_id', function ($query) use ($request) {
                            $query->select('id')
                                  ->from((new SIV_Store())->getTable())
                                  ->where('name', 'like', '%' . $request->search . '%');
                        });
                });

                // Add condition for BLSCustomer tostore
                $q->orWhere(function ($sub) use ($request) {
                    $sub->where('tostore_type', StoreType::Customer->value)
                        ->whereIn('tostore_id', function ($query) use ($request) {
                            $query->select('id')
                                  ->from((new BLSCustomer())->getTable())
                                  ->where(function ($q) use ($request) {
                                      $q->where('first_name', 'like', '%' . $request->search . '%')
                                        ->orWhere('surname', 'like', '%' . $request->search . '%')
                                        ->orWhere('other_names', 'like', '%' . $request->search . '%')
                                        ->orWhere('company_name', 'like', '%' . $request->search . '%');
                                  });
                        });
                });
            });
        }

        // Separate filter for fromstore (by ID)
        if ($request->filled('fromstore')) {
            $query->where('fromstore_id', $request->fromstore);
        }

        $query->where('stage', '=', 1);

        $requisitions = $query->orderBy('created_at', 'desc')->paginate(10);

        // Dynamically load the tostore relation
        $requisitions->getCollection()->transform(function ($requisition) {
            switch ($requisition->tostore_type->value) {
                case StoreType::Store->value:
                    $requisition->setRelation('tostore', SIV_Store::find($requisition->tostore_id));
                    break;
                case StoreType::Customer->value:
                    $requisition->setRelation('tostore', BLSCustomer::find($requisition->tostore_id));
                    break;
                default:
                    $requisition->setRelation('tostore', null);
            }

            return $requisition;
        });

        return inertia('IvRequisition/Index', [
            'requisitions' => $requisitions,
            'fromstore' => SIV_Store::all(),
            'filters' => $request->only(['search', 'fromstore']),
            'fromstoreList' => SIV_Store::select('id', 'name')->get(),
        ]);
    }


    /**
     * Show the form for creating a new requistion.
     */
    public function create()
    {
        return inertia('IvRequisition/Create', [
            'fromstore' => SIV_Store::all(), 
            'tostore' => SIV_Store::all(), 
            // +++ Pass options to frontend for client-side validation
            'facilityOptions' => FacilityOption::first(), 
        ]);
    }

    /**
     * Store a newly created requistion in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'to_store_id' => 'required|exists:siv_stores,id',
            'from_store_id' => 'required|exists:siv_stores,id',
            'stage' => 'required|integer|min:1',
            'remarks' => 'nullable|string|required_if:stage,2',
            'requistionitems' => 'required|array',
            'requistionitems.*.item_id' => 'required|exists:siv_products,id',
            'requistionitems.*.quantity' => 'required|numeric|min:1',
            'requistionitems.*.price' => 'required|numeric|min:0',
        ]);

        // +++ STOCK VALIDATION +++
        $this->validateStockAvailability($validated['from_store_id'], $validated['requistionitems']);

        $requistion = DB::transaction(function () use ($validated) {
            // 1. Create the main requisition record
            $requistion = IVRequistion::create([
                'transdate' => now(),
                'tostore_id' => $validated['to_store_id'],
                'tostore_type' => StoreType::Store->value,
                'fromstore_id' => $validated['from_store_id'],
                'stage' => $validated['stage'],
                'total' => 0,
                'user_id' => Auth::id(),
            ]);

            // 2. Create associated items
            $requistion->requistionitems()->createMany(
                collect($validated['requistionitems'])->map(fn($item) => [
                    'product_id' => $item['item_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                ])->all()
            );

            // 3. Recalculate and update total
            $requistion->load('requistionitems');
            $calculatedTotal = $requistion->requistionitems->sum(fn($item) => $item->quantity * $item->price);
            $requistion->update(['total' => $calculatedTotal]);

            // 4. If submitted, create a history record
            if ($validated['stage'] == 2 && !empty($validated['remarks'])) {
                $requistion->history()->create([
                    'stage' => 2,
                    'remarks' => $validated['remarks'],
                    'user_id' => Auth::id(),
                ]);
            }

            return $requistion;
        });

        return redirect()->route('inventory0.index')->with('success', 'Requisition created successfully.');
    }

    /**
     * Show the form for editing the specified requistion.
     */
    public function edit(IVRequistion $requistion)
    {
        // Load necessary relationships
        $requistion->load(['fromstore', 'requistionitems.item']);
       
        // 1. Resolve Polymorphic "To Store" Relationship
        switch ($requistion->tostore_type->value) {
            case StoreType::Store->value:
                $store = SIV_Store::find($requistion->tostore_id);
                $requistion->setRelation('tostore', $store);                
                break;

            case StoreType::Customer->value:
                $customer = BLSCustomer::find($requistion->tostore_id);                
                $requistion->setRelation('tostore', $customer);                   
                break;          

            default:
                $requistion->setRelation('tostore', null);               
                break;
        }

        // 2. Inject Stock Quantity for each item based on 'fromstore_id'
        // Construct the dynamic column name (e.g., 'qty_1', 'qty_5')
        $qtyColumn = 'qty_' . (int) $requistion->fromstore_id;

        $requistion->requistionitems->each(function ($reqItem) use ($qtyColumn) {
            // Default stock to 0
            $reqItem->stock_quantity = 0;

            // Determine Product ID (handle cases where it might be stored as item_id or product_id)
            $productId = $reqItem->item_id ?? $reqItem->product_id ?? ($reqItem->item ? $reqItem->item->id : null);

            if ($productId) {
                // Fetch the specific stock level from iv_productcontrol
                $stock = DB::table('iv_productcontrol')
                    ->where('product_id', $productId)
                    ->value($qtyColumn);
                
                $reqItem->stock_quantity = (float) ($stock ?? 0);
            }
        });
             
        return inertia('IvRequisition/Edit', [
            'requistion' => $requistion,
            'fromstore' => SIV_Store::all(),
            'tostore' => SIV_Store::all(),
            // Pass options to frontend for client-side validation
            'facilityOptions' => FacilityOption::first(), 
        ]);
    }

    /**
     * Update the specified requistion in storage.
     */
    public function update(Request $request, IVRequistion $requistion)
    {
        $validated = $request->validate([
            'to_store_id' => 'required|exists:siv_stores,id',
            'from_store_id' => 'required|exists:siv_stores,id',
            'stage' => 'required|integer|min:1',
            'remarks' => 'nullable|string|required_if:stage,2',
            'requistionitems' => 'required|array',
            'requistionitems.*.id' => 'nullable|exists:iv_requistionitems,id',
            'requistionitems.*.item_id' => 'required|exists:siv_products,id',
            'requistionitems.*.quantity' => 'required|numeric|min:1',
            'requistionitems.*.price' => 'required|numeric|min:0',
        ]);

        // +++ STOCK VALIDATION +++
        $this->validateStockAvailability($validated['from_store_id'], $validated['requistionitems']);

        DB::transaction(function () use ($validated, $requistion) {
            // 1. Sync items
            $this->syncItems($requistion, $validated['requistionitems'], 'requistionitems');

            // 2. Recalculate total
            $requistion->load('requistionitems');
            $calculatedTotal = $requistion->requistionitems->sum(fn($item) => $item->quantity * $item->price);

            // 3. Update the main requisition record
            $requistion->update([
                'tostore_id' => $validated['to_store_id'],
                'fromstore_id' => $validated['from_store_id'],
                'stage' => $validated['stage'],
                'total' => $calculatedTotal,
            ]);

            // 4. If being submitted, create a NEW history record
            if ($validated['stage'] == 2 && !empty($validated['remarks'])) {
                $requistion->history()->create([
                    'stage' => 2,
                    'remarks' => $validated['remarks'],
                    'user_id' => Auth::id(),
                ]);
            }
        });

        return redirect()->route('inventory0.index')->with('success', 'Requisition updated successfully.');
    }
     
    /**
     * Remove the specified requistion from storage.
     */
    public function destroy(IVRequistion $requistion)
    {
        $requistion->requistionitems()->delete();
        $requistion->delete();

        return redirect()->route('inventory0.index')
            ->with('success', 'Requistion deleted successfully.');
    }

    /**
     * Helper: Validates stock availability for the given items against a specific store.
     * Checks FacilityOption to see if negative stock is allowed.
     */
    private function validateStockAvailability($storeId, $items)
    {
        // 1. Check Global Setting
        $facilityOption = FacilityOption::first();
        $allowNegative = $facilityOption?->allownegativestock ?? false;

        // If negative stock is allowed, skip validation
        if ($allowNegative) {
            return;
        }

        // 2. Group items by item_id (product_id)
        // This handles cases where the same item appears multiple times in the list
        $groupedItems = collect($items)->groupBy('item_id');

        // 3. Check stock for each group
        foreach ($groupedItems as $itemId => $group) {
            $totalRequestedQty = $group->sum('quantity');
            
            // Construct dynamic column name (e.g., qty_1, qty_5)
            $qtyColumn = 'qty_' . (int)$storeId;

            // Fetch current stock
            $stockRecord = DB::table('iv_productcontrol')
                ->where('product_id', $itemId)
                ->select($qtyColumn)
                ->first();

            $currentStock = $stockRecord ? (float) $stockRecord->$qtyColumn : 0;

            if ($totalRequestedQty > $currentStock) {
                // Fetch item name for a friendly error message
                // Try to get it from input first, otherwise query DB
                $itemName = $group->first()['item_name'] ?? 
                            DB::table('siv_products')->where('id', $itemId)->value('productname') ?? 
                            'Unknown Item';

                throw ValidationException::withMessages([
                    'requistionitems' => ["Insufficient stock for '{$itemName}'. Available: {$currentStock}, Requested Total: {$totalRequestedQty}."]
                ]);
            }
        }
    }
}