<?php

namespace App\Http\Controllers;

use App\Models\IVReceive;
use App\Models\IVIssue;

use App\Models\BILProductControl;
use App\Models\BILProductExpiryDates;
use App\Models\BILProductTransactions;
use App\Models\SIV_Product; // Assuming you have this Product model
use App\Models\SIV_Store;    // Assuming you have a Store Model

use App\Models\BLSCustomer; // Assuming you have a Customer model
use App\Models\SPR_Supplier; // Assuming you have a Supplier model
use App\Enums\StoreType; // Assuming you have an Enum for StoreType
use App\Models\IVReceiveItem;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Carbon\Carbon;
use Exception;
use Throwable;


class IVReceiveController extends Controller
{
    // Constants for transaction types.  MUCH better than hardcoding strings.
    const TRANSACTION_TYPE_ISSUE = 'Issue';
    const TRANSACTION_TYPE_RECEIVE = 'Receive';

    /**
     * Display a listing of receives.
     */
    
     public function index(Request $request)
     {
         $query = IVReceive::with(['receiveitems', 'tostore']);
     
         // General search (only for fromstore and customer/store names)
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
     
                 // Add condition for BLSCustomer fromstore
                 $q->orWhere(function ($sub) use ($request) {
                     $sub->where('fromstore_type', StoreType::Customer->value)
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
        }

        $query->whereBetween('stage', [1, 2]);
     
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
            'fromstore' => SIV_Store::all(), // Pass the correct data to the view
            'tostore' => SIV_Store::all(), // Pass the correct data to the view
        ]);
    }

    /**
     * Store a newly created receive in storage.
     */
         
   
    public function store(Request $request)
    {
        // 1. Validate input
        $validated = $request->validate([
            'to_store_id'   => 'required|exists:siv_stores,id',
            'from_store_id' => 'required|exists:siv_stores,id',
            'stage'         => 'required|integer|in:1', // Expecting stage 1 (Draft) from Create form
            'remarks'       => 'nullable|string|max:1000', // Added validation for remarks
            'receiveitems'  => 'required|array|min:1',    // Must have at least one item
            'receiveitems.*.item_id' => 'required|exists:siv_products,id', // Ensure item_id maps to siv_products
            'receiveitems.*.quantity'=> 'required|numeric|min:0.01', // Or min:1 for whole units
            'receiveitems.*.price'   => 'required|numeric|min:0',    // Price can be 0, but usually > 0
        ]);

        $receive = null; // Initialize $receive outside transaction scope

        try {
            // 2. Begin database transaction
            DB::transaction(function () use ($validated, &$receive) { // Pass $receive by reference
                // a. Calculate total from validated items *before* creating the main record
                $calculatedTotal = 0;
                foreach ($validated['receiveitems'] as $item) {
                    $calculatedTotal += (float) $item['quantity'] * (float) $item['price'];
                }

                // b. Create the main IVReceive record
                $receive = IVReceive::create([
                    'transdate'      => Carbon::now(),
                    'tostore_id'     => $validated['to_store_id'],
                    'fromstore_type' => StoreType::Store->value, // Ensure StoreType::Store is defined
                    'fromstore_id'   => $validated['from_store_id'],
                    'stage'          => $validated['stage'], // This will be 1 (Draft)
                    'total'          => $calculatedTotal,   // Use pre-calculated total
                    'remarks'        => $validated['remarks'] ?? null, // Store remarks
                    'user_id'        => Auth::id(),
                ]);

                // c. Create associated receive items (efficiently)
                $itemsToCreate = [];
                foreach ($validated['receiveitems'] as $itemData) {
                    $itemsToCreate[] = [
                        'product_id' => $itemData['item_id'], // Ensure this matches DB column name
                        'quantity'   => $itemData['quantity'],
                        'price'      => $itemData['price'],
                        // 'iv_receive_id' will be set automatically by createMany if relationship is defined
                    ];
                }
                $receive->receiveitems()->createMany($itemsToCreate); // Assumes `receiveitems` relationship exists
            });

            // 3. If transaction was successful and $receive is populated
            if ($receive) {
                return redirect()->route('inventory2.edit', $receive->id)
                                 ->with('success', 'Receive created successfully and saved as draft. You can now review or submit it.');
            } else {
                // This fallback is less likely with the improved structure but kept for safety.
                return back()->withInput()->with('error', 'Failed to create receive due to an unexpected issue after transaction.');
            }

        } catch (Throwable $e) { // Catch any exception/error
            // 4. Log the error and redirect back with input and error message
            \Log::error('Receive creation failed: ' . $e->getMessage() . ' Stack: ' . $e->getTraceAsString());
            return back()->withInput()->with('error', 'Failed to create receive. Please check your input and try again. Details: ' . $e->getMessage());
        }
    }

   
    /**
     * Show the form for editing the specified receive.
     */
    public function edit(IVReceive $receive)
    {
        $receive->load(['tostore', 'receiveitems.item']);

        //log::info('Receive data: ', $receive->toArray());
       
        switch ($receive->fromstore_type->value) {
            case StoreType::Store->value:
                $store = SIV_Store::find($receive->fromstore_id);
                $receive->setRelation('fromstore', $store);                
                break;

            case StoreType::Customer->value:
                $customer = BLSCustomer::find($receive->fromstore_id);                
                $receive->setRelation('fromstore', $customer);                   
                break;          

            default:
                $receive->setRelation('fromstore', null);               
                break;
        }
             
        return inertia('IvReceive/Edit', [
            'receive' => $receive,
            'fromstore' => SIV_Store::all(), // Pass the correct data to the view
            'tostore' => SIV_Store::all(), // Pass the correct data to the view
        ]);
    }

    /**
     * Update the specified receive in storage.
     */
    public function update(Request $request, IVReceive $receive)
    {
        $validated = $request->validate([
            'to_store_id' => 'required|exists:siv_stores,id',
            'from_store_id' => 'required|exists:siv_stores,id',
            'total' => 'required|numeric|min:0',
            'stage' => 'required|integer|min:1',
            'receiveitems' => 'required|array',
            'receiveitems.*.id' => 'nullable|exists:iv_receiveitems,id',
            'receiveitems.*.item_id' => 'required|exists:siv_products,id',
            'receiveitems.*.quantity' => 'required|numeric|min:0',
            'receiveitems.*.price' => 'required|numeric|min:0',
            
        ]);
        
        DB::beginTransaction();

        try {

            $this->processeReceive($validated, $receive);           
           // $this->performReception($validated); // Pass $validated directly
            

            DB::commit();
            return redirect()->route('inventory2.index')->with('success', 'Receive updated successfully.');

        } catch (ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json(['message' => 'Record not found: ' . $e->getMessage()], 404);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Stock transaction failed: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine());
            return response()->json(['message' => 'An error occurred while processing the stock transaction.'], 500);
        }
    }



    private function processeReceive($validated, $receive): void
    {
        // Retrieve existing item IDs
        $oldItemIds = $receive->receiveitems()->pluck('id')->toArray();
        $existingItemIds = [];
        $newItems = [];

        foreach ($validated['receiveitems'] as $item) {
            $existingItemIds[] = $item['id'] ?? null;  // Use null coalescing operator
            if (empty($item['id'])) {
                $newItems[] = $item;
            }
        }

        // Delete removed items
        $itemsToDelete = array_diff($oldItemIds, array_filter($existingItemIds)); // Filter out null values
        $receive->receiveitems()->whereIn('id', $itemsToDelete)->delete();

        // Add new items
        foreach ($newItems as $item) {
            $receive->receiveitems()->create([
                'product_id' => $item['item_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
            ]);
        }

        // Update existing items.  Use firstOrFail() for better error handling
        foreach ($validated['receiveitems'] as $item) {
            if (!empty($item['id'])) {
                $receiveItem = IVReceiveItem::where('id', $item['id'])->where('receive_id', $receive->id)->firstOrFail();
                $receiveItem->update([
                    'product_id' => $item['item_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                ]);
            }
        }

        // Calculate total and update receive
        $calculatedTotal = $receive->receiveitems()->sum(DB::raw('quantity * price'));  // More robust calculation
        $receive->update([
            'tostore_id' => $validated['to_store_id'],
            'fromstore_id' => $validated['from_store_id'],
            'stage' => $validated['stage'],
            'total' => $calculatedTotal,
            'user_id' => Auth::id(),
        ]);
    }

    private function performReception($validated): void
    {
        $fromstore_id = $validated['from_store_id'];
        $tostore_id = $validated['to_store_id'];
        $expiryDate = $validated['expiry_date'] ?? null;
        $transDate = Carbon::now();
        $deliveryNo = $validated['delivery_no'] ?? '';

        $fromStore = SIV_Store::find($fromstore_id);
        $fromStoreName = $fromStore ? $fromStore->name : 'Unknown Store';

        
        $received = IVReceive::create([
            'transdate' => $transDate,
            'fromstore_id' => $fromstore_id,
            'tostore_id' => $tostore_id,
            'stage' => 3,
            'user_id' => Auth::id(),
        ]);

        foreach ($validated['receiveitems'] as $item) {

            if($expiryDate != null){
            
                // --- Update/Insert Product Expiry Dates ---
                $productExpiry = BILProductExpiryDates::where('store_id', $tostore_id)
                    ->where('product_id', $item['item_id'])
                    ->where('expirydate', $expiryDate)
                    ->first();

        
            

                if ($productExpiry) {
                    $productExpiry->increment('quantity', $item['quantity']);
                } else {
                    BILProductExpiryDates::create([
                        'store_id' => $tostore_id,
                        'product_id' => $item['item_id'],
                        'expirydate' => $expiryDate,
                        'quantity' => $item['quantity'],
                        // 'butchno' => $item['batch_no'] ?? null,         // Add if you have batch info
                        // 'butchbarcode' => $item['batch_barcode'] ?? null,  // Add if you have batch info
                    ]);
                }
            }

            // --- Update/Insert Product Control ---
            $productControl = BILProductControl::firstOrCreate(
                ['product_id' => $item['item_id']],
                ['qty_' . $tostore_id => 0]
            );
            $column = 'qty_' . $tostore_id;
            $productControl->increment($column, $item['quantity']);

            // --- Insert Product Transaction (Reception) ---
            BILProductTransactions::create([
                'transdate' => $transDate,
                'sourcecode' => $fromstore_id,
                'sourcedescription' => $fromStoreName,
                'product_id' => $item['item_id'],
                'expirydate' => $expiryDate,
                'reference' => $deliveryNo,
                'transprice' => $item['price'],
                'transtype' => self::TRANSACTION_TYPE_RECEIVE, // Use the constant
                'transdescription' => 'Received from Store: ' . $fromStoreName,
                'qtyin_' . $tostore_id => $item['quantity'],
                'user_id' => Auth::id(),
            ]);

            
            // Received Items
            $received->items()->create([
                'product_id' => $item['item_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
            ]); 
        }

     
    }
}