<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\GeneratesUniqueNumbers;
use App\Models\FacilityOption;
use App\Models\IVRequistion;
use App\Services\InventoryService; 

use App\Models\IVRequistionItem;
use App\Models\IVReceive;
use App\Models\IVIssue;

use App\Models\BILProductControl;
use App\Models\BILProductExpiryDates;
use App\Models\BILProductTransactions;
use App\Models\SIV_Product;
use App\Models\SIV_Store;
use App\Models\BLSCustomer;

use App\Enums\StoreType;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException; // Ensure this is imported

use Carbon\Carbon;
use Exception;
use Throwable;

class IVIssueController extends Controller
{
    use GeneratesUniqueNumbers;

    const TRANSACTION_TYPE_ISSUE = 'Issue';
    const TRANSACTION_TYPE_RECEIVE = 'Receive';

    /**
     * Display a listing of requistions.
     */
    public function index(Request $request)
    {
        $query = IVRequistion::with(['requistionitems', 'fromstore']);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->orWhere(function ($sub) use ($request) {
                    $sub->where('tostore_type', StoreType::Store->value)
                        ->whereIn('tostore_id', function ($query) use ($request) {
                            $query->select('id')
                                  ->from((new SIV_Store())->getTable())
                                  ->where('name', 'like', '%' . $request->search . '%');
                        });
                });
    
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
    
        if ($request->filled('fromstore')) {
            $query->where('fromstore_id', $request->fromstore);
        }   

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        $query->whereBetween('stage', [2, 3]);

        $requistions = $query->orderBy('created_at', 'desc')->paginate(10);

        $requistions->getCollection()->transform(function ($requistion) {
            switch ($requistion->tostore_type->value) {
                case StoreType::Store->value:
                    $requistion->setRelation('tostore', SIV_Store::find($requistion->tostore_id));
                    break;
                case StoreType::Customer->value:
                    $requistion->setRelation('tostore', BLSCustomer::find($requistion->tostore_id));
                    break;
                default:
                    $requistion->setRelation('tostore', null);
            }
            return $requistion;
        });

        return inertia('IvIssue/Index', [
            'requistions' => $requistions,
            'filters' => $request->only(['search', 'stage', 'fromstore']),
            'fromstore' => SIV_Store::all(['id', 'name']),
        ]);
    }

    /**
     * Show the form for editing the specified requistion.
     */
    public function edit(IVRequistion $requistion)
    {
        $requistion->load(['fromstore', 'requistionitems.item', 'history']);

        $tostoreData = [];
        $tostoreTypeValue = $requistion->tostore_type->value;

        switch ($tostoreTypeValue) {
            case StoreType::Store->value:
                $store = SIV_Store::find($requistion->tostore_id);
                $requistion->setRelation('tostore', $store);
                $tostoreData = SIV_Store::all();
                break;
            case StoreType::Customer->value:
                $customer = BLSCustomer::find($requistion->tostore_id);
                $requistion->setRelation('tostore', $customer);
                $tostoreData = BLSCustomer::all();
                break;
            default:
                $requistion->setRelation('tostore', null);
                break;
        }

        if ($requistion->stage == 2) {
            return inertia('IvIssue/Approve', [
                'requistion' => $requistion,
                'fromstore' => SIV_Store::all(),
                'tostore' => $tostoreData,
            ]);
        } else {
            return inertia('IvIssue/Issue', [
                'requistion' => $requistion,
                'fromstore' => SIV_Store::all(),
                'tostore' => $tostoreData,
            ]);
        }
    }

    /**
     * Update the specified requistion in storage.
     */
    public function update(Request $request, IVRequistion $requistion, InventoryService $inventoryService)
    {
        if ($requistion->stage == 2) {
            return $this->handleApprovalAction($request, $requistion);
        }

        if ($requistion->stage == 3) {
            return $this->handleIssuanceAction($request, $requistion, $inventoryService);
        }

        return back()->with('error', 'Invalid action for the current requisition stage.');
    }
    
    /**
     * Handles the 'Approve' or 'Return' action for a requisition awaiting approval.
     */
    private function handleApprovalAction(Request $request, IVRequistion $requistion)
    {
        $validated = $request->validate([
            'action_type' => ['required', Rule::in(['approve', 'return'])],
            'remarks' => 'required|string|min:5',
        ]);

        $action = $validated['action_type'];
        $newStage = ($action === 'approve') ? 3 : 1; 

        DB::transaction(function () use ($requistion, $validated, $newStage) {
            $requistion->update(['stage' => $newStage]);

            $requistion->history()->create([
                'stage'   => $newStage,
                'remarks' => $validated['remarks'],
                'user_id' => Auth::id(),
            ]);
        });
        
        $message = ($action === 'approve') ? 'Requisition approved successfully.' : 'Requisition has been returned to drafts.';
        return redirect()->route('inventory1.index')->with('success', $message);
    }

    /**
     * Handles the stock issuance process for an approved requisition.
     */
    private function handleIssuanceAction(Request $request, IVRequistion $requistion, InventoryService $inventoryService)
    {      
        // 1. Define and run validation
        $rules = [
            'tostore_type' => ['required', new Enum(StoreType::class)],
            'from_store_id' => 'required|exists:siv_stores,id',
            'total' => 'required|numeric|min:0',
            'stage' => 'required|integer|min:1',
            'remarks' => 'required|string|min:5',
            'requistionitems' => 'required|array',
            'requistionitems.*.id' => 'nullable|exists:iv_requistionitems,id',
            'requistionitems.*.product_id' => 'required|exists:siv_products,id', 
            'requistionitems.*.quantity' => 'required|numeric|min:0',
            'requistionitems.*.price' => 'required|numeric|min:0',            
        ];

        switch ($request->input('tostore_type')) {
            case StoreType::Store->value:
                $rules['to_store_id'] = 'required|exists:siv_stores,id';
                break;
            case StoreType::Customer->value:
                $rules['to_store_id'] = 'required|exists:bls_customers,id';
                break;
        }

        $validated = $request->validate($rules);

        // Get Global Options
        $facilityOptions = FacilityOption::first();
        $allowNegative = $facilityOptions?->allownegativestock ?? false;
        $doubleEntry = $facilityOptions?->doubleentryissuing ?? true;

        // =========================================================
        // START: Backend Stock Validation (Simulated from BilPost)
        // =========================================================
        if (!$allowNegative) {
            $storeId = (int) $validated['from_store_id'];
            $items = collect($validated['requistionitems']);

            // 1. Group items by product_id and sum the quantities
            $aggregatedItems = $items->groupBy('product_id')->map(function ($group) {
                return [
                    'product_id' => $group->first()['product_id'],
                    // Note: 'item_name' is not in the request, we fetch it below if needed
                    'total_qty'  => $group->sum('quantity')
                ];
            });

            // 2. Validate the aggregated totals
            foreach ($aggregatedItems as $aggItem) {
                $productId = $aggItem['product_id'];

                if (!$productId) {
                    continue;
                }

                $qtyColumn = 'qty_' . $storeId;
                
                // Fetch current stock from control table
                $currentStock = DB::table('iv_productcontrol')
                    ->where('product_id', $productId)
                    ->value($qtyColumn);

                $currentStock = (float)($currentStock ?? 0);
                $requestedQty = (float)$aggItem['total_qty'];

                if ($requestedQty > $currentStock) {
                    // Fetch product name for the error message using the correct column 'name'
                    $productName = DB::table('siv_products')->where('id', $productId)->value('name') ?? 'Unknown Item';

                    throw ValidationException::withMessages([
                        'requistionitems' => ["Insufficient stock for '{$productName}'. Available: {$currentStock}, Requested Total: {$requestedQty}."]
                    ]);
                }
            }
        }
        // =========================================================
        // END: Backend Stock Validation
        // =========================================================

        // Generate a unique delivery number
        $deliveryNo = $this->generateUniqueNumber(IVIssue::class, 'delivery_no', 'ISS');
        $StoreToStore = $validated['tostore_type'] === StoreType::Store->value;

        DB::beginTransaction();
        try {
            // Map items for service
            $items = collect($validated['requistionitems'])->map(fn($item) => [
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
            ])->all();

            // Perform the issuance
            $inventoryService->issue(
                $validated['from_store_id'],
                $validated['to_store_id'],
                $validated['tostore_type'],
                $this->getToStoreName($validated['to_store_id'], $validated['tostore_type']),
                $items,
                $deliveryNo,
                null 
            );

            if ($StoreToStore) {
                if ($doubleEntry) {
                    $inventoryService->createReceiveRecord(
                        $validated['to_store_id'],
                        $validated['from_store_id'],
                        StoreType::Store->value,
                        $items,
                        $deliveryNo,
                        4,                        
                        'Auto-created from double-entry issue.'
                    );

                    $inventoryService->receive(
                        $validated['to_store_id'],
                        $validated['from_store_id'],
                        StoreType::Store->value,
                        SIV_Store::find($validated['from_store_id'])->name,
                        $items,
                        $deliveryNo,
                        null
                    );
                } else {
                    $inventoryService->createReceiveRecord(
                        $validated['to_store_id'],
                        $validated['from_store_id'],
                        StoreType::Store->value,
                        $items,
                        $deliveryNo,
                        2,
                        'Pending reception from store-to-store transfer.'
                    );
                }
            }

            $requistion->update(['stage' => 4, 'delivery_no' => $deliveryNo]);

            $requistion->history()->create([
                'stage'   => 4,
                'remarks' => $validated['remarks'],
                'user_id' => Auth::id(),
            ]);

            DB::commit();
            return redirect()->route('inventory1.index')->with('success', "Items issued successfully under Delivery No: {$deliveryNo}.");

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Stock transaction failed: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine());
            return back()->with('error', 'An error occurred while processing the stock transaction.');
        }
    }

    private function getToStoreName(int $id, string|int $type): string
    {
        if ($type === StoreType::Store->value) {
            $store = SIV_Store::find($id);
            return $store->name ?? 'Unknown Store';
        }

        if ($type === StoreType::Customer->value) {
            $customer = BLSCustomer::find($id);
            if ($customer) {
                return $customer->company_name ?? trim("{$customer->first_name} {$customer->surname}");
            }
            return 'Unknown Customer';
        }

        return 'Unknown';
    }   
}