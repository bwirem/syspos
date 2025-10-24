<?php

namespace App\Http\Controllers;

use App\Models\IVRequistion;
use App\Services\InventoryService; // Import the service

use App\Models\IVRequistionItem;
use App\Models\IVReceive;
use App\Models\IVIssue;

use App\Models\BILProductControl;
use App\Models\BILProductExpiryDates;
use App\Models\BILProductTransactions;
use App\Models\SIV_Product; // Assuming you have this Product model
use App\Models\SIV_Store;    // Assuming you have a Store Model
use App\Models\BLSCustomer;  // Assuming you have a Customer Model

use App\Enums\StoreType;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\Rules\Enum;

use Carbon\Carbon;
use Exception;
use Throwable;

class IVIssueController extends Controller
{
    // Constants for transaction types.  MUCH better than hardcoding strings.
    const TRANSACTION_TYPE_ISSUE = 'Issue';
    const TRANSACTION_TYPE_RECEIVE = 'Receive';

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

        

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        $query->whereBetween('stage', [2, 3]);

        $requistions = $query->orderBy('created_at', 'desc')->paginate(10);

        // Dynamically load the appropriate tostore relation
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
            'filters' => $request->only(['search', 'stage', 'fromstore']), // <-- ADDED
            'fromstore' => SIV_Store::all(['id', 'name']), // or wherever your store list comes from
        ]);
        
    }


    /**
     * Show the form for editing the specified requistion.
     */
    public function edit(IVRequistion $requistion)
    {
       
        $requistion->load(['fromstore', 'requistionitems.item']); // Eager load necessary relationships
        $tostoreData = [];
        
        // Ensure to access the value of the enum when comparing
        $tostoreTypeValue = $requistion->tostore_type->value; // Get the value of the enum       
       
        
        switch ($tostoreTypeValue) {
            case StoreType::Store->value:
                // Find the store based on tostore_id
                $store = SIV_Store::find($requistion->tostore_id);
                
                // Set the tostore relation for the requistion model
                $requistion->setRelation('tostore', $store);
                
                
                // Load all SIV stores for the store type
                $tostoreData = SIV_Store::all();
                break;
        
            case StoreType::Customer->value:
                // Find the customer based on tostore_id
                $store = BLSCustomer::find($requistion->tostore_id);                
                
                // Set the tostore relation for the requistion model
                $requistion->setRelation('tostore', $store);   
        
               
                // Load all BLS customers for the customer type
                $tostoreData = BLSCustomer::all();           
                break;          
        
            default:
                // Set null if the tostore_type doesn't match any case
                $requistion->setRelation('tostore', null);   
                break;
        }
        
        
        // Return the view with the requisition and the correct store data

        if($requistion->stage ==2){

            return inertia('IvIssue/Approve', [           
                'requistion' => $requistion,
                'fromstore' => SIV_Store::all(), // Pass the correct data to the view
                'tostore' => $tostoreData, // Pass the correct data to the view
            ]);

        }else{

            return inertia('IvIssue/Issue', [
                'requistion' => $requistion,
                'fromstore' => SIV_Store::all(), // Pass the correct data to the view
                'tostore' => $tostoreData, // Pass the correct data to the view
            ]);

        }    
                
    }

    /**
     * Update the specified requistion in storage.
     */ 

    public function update(Request $request, IVRequistion $requistion, InventoryService $inventoryService)
    {
        if ($requistion->stage == 1) {
            return redirect()->route('inventory1.index')->with('success', 'Requisition returned to draft.');
        }elseif ($requistion->stage == 2) {
            $requistion->update(['stage' => 3]);
            return redirect()->route('inventory1.edit', ['requistion' => $requistion->id])->with('success', 'Requisition approved successfully.');
        }
        
        // --- START: MODIFIED VALIDATION LOGIC ---

        // 1. Define the base validation rules
        $rules = [
            'tostore_type' => ['required', new Enum(StoreType::class)],
            'from_store_id' => 'required|exists:siv_stores,id',
            'total' => 'required|numeric|min:0',
            'stage' => 'required|integer|min:1',
            'requistionitems' => 'required|array',
            'requistionitems.*.id' => 'nullable|exists:iv_requistionitems,id',
            'requistionitems.*.item_id' => 'required|exists:siv_products,id',
            'requistionitems.*.quantity' => 'required|numeric|min:0',
            'requistionitems.*.price' => 'required|numeric|min:0',
            'delivery_no' => 'nullable|string',
            'expiry_date' => 'nullable|date',
            'double_entry' => 'boolean',
        ];

        // 2. Conditionally add the rule for `to_store_id` based on the input from the request
        switch ($request->input('tostore_type')) {
            case StoreType::Store->value:
                $rules['to_store_id'] = 'required|exists:siv_stores,id';
                break;
            case StoreType::Customer->value:
                $rules['to_store_id'] = 'required|exists:bls_customers,id';
                break;
        }
        
        // 3. Now validate the request with the complete set of rules
        $validated = $request->validate($rules);

        // --- END: MODIFIED VALIDATION LOGIC ---

        $StoreToStore = $validated['tostore_type'] === StoreType::Store->value;
        $doubleEntry = $validated['double_entry'] ?? true;

        DB::beginTransaction();
        try {
            $items = collect($validated['requistionitems'])->map(fn($item) => [
                'product_id' => $item['item_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
            ])->all();

            // Perform the issuance. This happens in all cases.
            $inventoryService->issue(
                $validated['from_store_id'],
                $validated['to_store_id'],
                $validated['tostore_type'],
                $this->getToStoreName($validated['to_store_id'], $validated['tostore_type']),
                $items,
                $validated['delivery_no'] ?? null,
                $validated['expiry_date'] ?? null
            );

            // --- MODIFIED LOGIC FOR RECEPTION ---

            // Scenario 1: Store-to-store transfer WITH double entry.
            // This automatically receives the stock.
            if ($StoreToStore) {
                if ($doubleEntry) {

                    $inventoryService->createReceiveRecord(
                        $validated['to_store_id'],
                        $validated['from_store_id'],
                        StoreType::Store->value,
                        $items,
                        4, // Stage 4: Posted/Completed
                        'Auto-created from double-entry issue.' // System-generated remark
                    );

                    $inventoryService->receive(
                        $validated['to_store_id'],
                        $validated['from_store_id'],
                        StoreType::Store->value,
                        SIV_Store::find($validated['from_store_id'])->name,
                        $items,
                        $validated['delivery_no'] ?? null,
                        $validated['expiry_date'] ?? null
                    );

                }else {
                // Scenario 2: Store-to-store transfer WITHOUT double entry.
                // This creates a pending reception record for manual processing later.
                   
                    $inventoryService->createReceiveRecord(
                        $validated['to_store_id'],
                        $validated['from_store_id'],
                        StoreType::Store->value,
                        $items,
                        2, // Explicitly set the stage to 2 (Pending)
                        'Pending reception from store-to-store transfer.' // Optional remark
                    );
                   
                }
            }
            
            // --- END MODIFIED LOGIC ---

            $requistion->update(['stage' => 4]); // Mark requisition as completed

            DB::commit();
            return redirect()->route('inventory1.index')->with('success', 'Items issued successfully.');

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Stock transaction failed: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine());
            return back()->with('error', 'An error occurred while processing the stock transaction.');
        }
    }
        
    private function getToStoreName(int $id, string|int $type): string
    {
        // Use strict comparison as we confirmed the types match.
        if ($type === StoreType::Store->value) {
            $store = SIV_Store::find($id);
            // Return the store name or a fallback if not found or if the name is null.
            return $store->name ?? 'Unknown Store';
        }

        if ($type === StoreType::Customer->value) {
            $customer = BLSCustomer::find($id);

            if ($customer) {
                // Prioritize company_name if it exists, otherwise build the full name.
                return $customer->company_name ?? trim("{$customer->first_name} {$customer->surname}");
            }

            // Fallback if the customer ID doesn't exist.
            return 'Unknown Customer';
        }

        // Default fallback if the type doesn't match any case.
        return 'Unknown';
    }
    
    public function return(IVRequistion $requistion)
    { 
        // // Check if the current stage is greater than 0
        // if ($requistion->stage > 1) {
        //     // Decrease the requistion stage by 1
        //     $requistion->update(['stage' => $requistion->stage - 1]);
        // } else {
        //     // Optionally, you can log or handle the case where the stage is already 0
        //     // Log::warning('Attempted to decrease requistion stage below zero for requistion ID: ' . $requistion->id);
        // }
    
        // // Redirect to the 'edit' route for the current requistion
        // return redirect()->route('inventory1.edit', ['requistion' => $requistion->id]);
    }    

}