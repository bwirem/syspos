<?php

namespace App\Http\Controllers;

use App\Services\InventoryService;
use App\Http\Controllers\Traits\ManagesItems;


use App\Models\IVReceive;
use App\Models\IVIssue;

use App\Models\BILProductControl;
use App\Models\BILProductExpiryDates;
use App\Models\BILProductTransactions;
use App\Models\SIV_Product; // Assuming you have this Product model
use App\Models\SIV_Store;    // Assuming you have a Store Model


use App\Models\SPR_Supplier; // Assuming you have a Supplier model
use App\Enums\StoreType; // Assuming you have an Enum for StoreType
use App\Models\IVReceiveItem;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\Rules\Enum;
use Carbon\Carbon;
use Exception;
use Throwable;


class IVReceiveController extends Controller
{
    use ManagesItems;
    
    /**
     * Display a listing of receives.
     */
    
     public function index(Request $request)
     {
         $query = IVReceive::with(['receiveitems', 'tostore']);
     
         // General search (only for fromstore and supplier/store names)
         if ($request->filled('search')) {
             $query->where(function ($q) use ($request) {
                 // Add condition for SIV_Store fromstore
                 $q->orWhere(function ($sub) use ($request) {
                     $sub->where('fromstore_type', StoreType::Store->value)
                         ->whereIn('fromstore_id', function ($query) use ($request) {
                             $query->select('id')
                                   ->from((new SIV_Store())->getTable())
                                   ->where('name', 'like', '%' . $request->search . '%');
                         });
                 });
     
                 // Add condition for BLSSupplier fromstore
                 $q->orWhere(function ($sub) use ($request) {
                     $sub->where('fromstore_type', StoreType::Supplier->value)
                         ->whereIn('fromstore_id', function ($query) use ($request) {
                             $query->select('id')
                                   ->from((new SPR_Supplier())->getTable())
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
     
         // Separate filter for tostore (by ID)
        if ($request->filled('tostore')) {
             $query->where('tostore_id', $request->tostore);
        }
        
     
        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        } else {
            $query->whereIn('stage', [1, 2]);
        }
     
         $receives = $query->orderBy('created_at', 'desc')->paginate(10);
     
         // Dynamically load the fromstore relation
         $receives->getCollection()->transform(function ($receive) {
             switch ($receive->fromstore_type->value) {
                 case StoreType::Store->value:
                     $receive->setRelation('fromstore', SIV_Store::find($receive->fromstore_id));
                     break;
                 case StoreType::Supplier->value:
                     $receive->setRelation('fromstore', SPR_Supplier::find($receive->fromstore_id));
                     break;
                 default:
                     $receive->setRelation('fromstore', null);
             }
     
             return $receive;
         });
     
         return inertia('IvReceive/Index', [
             'receives' => $receives,
             'tostore' => SIV_Store::all(),
             'filters' => $request->only(['search', 'fromstore']),
             'tostoreList' => SIV_Store::select('id', 'name')->get(),
         ]);
     }


      /**
     * Show the form for creating a new receive.
     */
    public function create()
    {
        return inertia('IvReceive/Create', [
            'fromstore' => SPR_Supplier::all(), // Pass the correct data to the view
            'tostore' => SIV_Store::all(), // Pass the correct data to the view
        ]);
    }

    /**
     * Store a newly created receive in storage.
     */
         
   
    public function store(Request $request, InventoryService $inventoryService) // Inject the service
    {
        // 1. Validation logic remains exactly the same.
        $rules = [
            'fromstore_type' => ['required', new Enum(StoreType::class)],      
            'to_store_id'   => 'required|exists:siv_stores,id',          
            'stage'         => 'required|integer|in:1',
            'remarks'       => 'nullable|string|max:1000',
            'receiveitems'  => 'required|array|min:1',
            'receiveitems.*.item_id' => 'required|exists:siv_products,id',
            'receiveitems.*.quantity'=> 'required|numeric|min:0.01',
            'receiveitems.*.price'   => 'required|numeric|min:0',
        ];

        switch ($request->input('fromstore_type')) {
            case StoreType::Store->value:
                $rules['from_store_id'] = 'required|exists:siv_stores,id';
                break;
            case StoreType::Supplier->value:
                $rules['from_store_id'] = 'required|exists:siv_suppliers,id';
                break;
        }
        
        $validated = $request->validate($rules);

        try {
            // 2. Call the new service method to do all the work
            $receive = $inventoryService->createReceiveRecord(
                $validated['to_store_id'],
                $validated['from_store_id'],
                $validated['fromstore_type'],
                $validated['receiveitems'],
                $validated['stage'], // This will be 1
                $validated['remarks'] ?? null
            );

            // 3. Redirect to the edit page using the ID from the returned model
            return redirect()->route('inventory2.edit', $receive->id)
                             ->with('success', 'Receive created successfully and saved as draft.');

        } catch (Throwable $e) {
            Log::error('Receive creation failed: ' . $e->getMessage() . ' Stack: ' . $e->getTraceAsString());
            return back()->withInput()->with('error', 'Failed to create receive. Please check your input and try again.');
        }
    }
   
    /**
     * Show the form for editing the specified receive.
     */
    public function edit(IVReceive $receive)
    {
        $receive->load(['tostore', 'receiveitems.item']);
        $fromstoreData = [];

        //log::info('Receive data: ', $receive->toArray());
       
        switch ($receive->fromstore_type->value) {
            case StoreType::Store->value:
                $store = SIV_Store::find($receive->fromstore_id);
                $receive->setRelation('fromstore', $store);    
                $fromstoreData = SIV_Store::all();
                break;
            
                break;

            case StoreType:: Supplier->value:
                $supplier =  SPR_Supplier::find($receive->fromstore_id);                
                $receive->setRelation('fromstore', $supplier);    
                $fromstoreData = SPR_Supplier::all();               
                break;          

            default:
                $receive->setRelation('fromstore', null);               
                break;
        }
             
        return inertia('IvReceive/Edit', [
            'receive' => $receive,
            'fromstore' => $fromstoreData, // Pass the correct data to the view
            'tostore' => SIV_Store::all(), // Pass the correct data to the view
        ]);
    }

    /**
     * Update the specified receive in storage.
     */
    public function update(Request $request, IVReceive $receive, InventoryService $inventoryService)
    {
        // --- VALIDATION (Updated to include remarks) ---
        $rules = [
            'fromstore_type' => ['required', new Enum(StoreType::class)],
            'to_store_id' => 'required|exists:siv_stores,id',
            'stage' => 'required|integer|in:1,2,3',
            'remarks' => 'nullable|string|max:1000', // Add validation for remarks
            'receiveitems' => 'required|array|min:1',
            'receiveitems.*.id' => 'nullable|exists:iv_receiveitems,id',
            'receiveitems.*.item_id' => 'required|exists:siv_products,id',
            'receiveitems.*.quantity' => 'required|numeric|min:0.01',
            'receiveitems.*.price' => 'required|numeric|min:0',
            'delivery_no' => 'required|string',
            'expiry_date' => 'nullable|date',
        ];

        // Your conditional validation for from_store_id is correct.
        switch ($request->input('fromstore_type')) {
            case StoreType::Store->value:
                $rules['from_store_id'] = 'required|exists:siv_stores,id';
                break;
            case StoreType::Supplier->value:
                // Ensure your suppliers table is named `siv_suppliers` or change this line
                $rules['from_store_id'] = 'required|exists:siv_suppliers,id';
                break;
        }

        $validated = $request->validate($rules);

        log::info('Update receive with data: ', $validated);
        
        $newStage = (int) $validated['stage'];
        $originalStage = $receive->stage;

        DB::beginTransaction();

        try {
            // STEP 1: Save the data (always happens)
            $this->processReceiveUpdate($receive, $validated);

            // STEP 2: Conditionally perform the stock reception
            if ($newStage === 3 && $originalStage < 3) {
                
                // Reload items after potential changes from syncItems
                $receive->load('receiveitems');
                $items = $receive->receiveitems->map(fn($item) => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                ])->all();

                $inventoryService->receive(
                    $validated['to_store_id'],
                    $validated['from_store_id'],
                    $validated['fromstore_type'],
                    $this->getFromStoreName($validated['from_store_id'], $validated['fromstore_type']),
                    $items,
                    $validated['delivery_no'] ?? null,
                    $validated['expiry_date'] ?? null
                );
            }

            DB::commit();

            $message = 'Draft saved successfully.';
            if ($newStage === 2) $message = 'Receipt submitted for processing.';
            if ($newStage === 3) $message = 'Receipt posted and stock updated successfully.';

            return redirect()->route('inventory2.index')->with('success', $message);

        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Stock reception failed: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine());
            return back()->with('error', 'An error occurred while processing the reception.');
        }
    }

    /**
     * Helper method to process the saving of a receive record and its items.
     * (Updated to include remarks)
     */
    private function processReceiveUpdate(IVReceive $receive, array $validatedData): void
    {
        $this->syncItems($receive, $validatedData['receiveitems'], 'receiveitems');
        
        $receive->load('receiveitems');
        $calculatedTotal = $receive->receiveitems->sum(fn($item) => $item->quantity * $item->price);

        $receive->update([
            'fromstore_type' => $validatedData['fromstore_type'],
            'fromstore_id' => $validatedData['from_store_id'],
            'tostore_id' => $validatedData['to_store_id'],
            'stage' => $validatedData['stage'],
            'total' => $calculatedTotal,
            'remarks' => $validatedData['remarks'] ?? $receive->remarks, // Save remarks
            'user_id' => Auth::id(),
        ]);
        // Use the trait to handle item create, update, and delete operations.
        $this->syncItems($receive, $validatedData['receiveitems'], 'receiveitems');
        
        // Reload the relationship to ensure the total is calculated accurately.
        $receive->load('receiveitems');
        $calculatedTotal = $receive->receiveitems->sum(fn($item) => $item->quantity * $item->price);

        // Update the main receive record.
        $receive->update([
            'fromstore_type' => $validatedData['fromstore_type'],
            'fromstore_id' => $validatedData['from_store_id'],
            'tostore_id' => $validatedData['to_store_id'],
            'stage' => $validatedData['stage'],
            'total' => $calculatedTotal,
            'user_id' => Auth::id(),
        ]);
    }

    /**
     * Helper method to get the name of the source (Supplier or Store).
     */
    private function getFromStoreName(int $id, string|int $type): string
    {
        if ($type == StoreType::Store->value) {
            return SIV_Store::find($id)->name ?? 'Unknown Store';
        }
    
        if ($type == StoreType::Supplier->value) {
            $supplier = SPR_Supplier::find($id);
            return $supplier ? ($supplier->company_name ?? trim("{$supplier->first_name} {$supplier->surname}")) : 'Unknown Supplier';
        }
    
        return 'Unknown';
    }

    
}