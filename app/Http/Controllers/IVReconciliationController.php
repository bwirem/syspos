<?php

namespace App\Http\Controllers;

use App\Models\BILProductControl;
use App\Models\BILProductExpiryDates;
use App\Models\BILProductTransactions;
use App\Models\IVIssue;
use App\Models\IVReceive;

use App\Models\IVNormalAdjustment;
use App\Models\IVNormalAdjustmentItem;

use App\Models\IVPhysicalInventory;
use App\Models\IVPhysicalInventoryItem;
use App\Models\SIV_Store;
use App\Models\SIV_AdjustmentReason;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;



class IVReconciliationController extends Controller
{

    // Constants for transaction types.  MUCH better than hardcoding strings.
    const TRANSACTION_TYPE_ISSUE = 'Issue';
    const TRANSACTION_TYPE_RECEIVE = 'Receive';

    /**
     * Display a listing of normaladjustments.
     */
    
    public function index(Request $request)
    { 
        return inertia('IvReconciliation/Index');
    }

    public function normalAdjustment(Request $request)
    {
        $query = IVNormalAdjustment::with(['normaladjustmentitems', 'store']); // Eager load normaladjustment items and customer
     
         // Filtering by customer name using relationship
         if ($request->filled('search')) {
             $query->whereHas('store', function ($q) use ($request) {
                 $q->where('name', 'like', '%' . $request->search . '%');
             });
         }
     
         // Filtering by stage (Ensure 'stage' exists in the IVNormalAdjustment model)
         if ($request->filled('stage')) {
             $query->where('stage', $request->stage);
         }

         $query->where('stage', '<=', '2');
     
         // Paginate and sort normaladjustments
         $normaladjustments = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('IvReconciliation/NormalAdjustment/Index', [
             'normaladjustments' => $normaladjustments,
             'filters' => $request->only(['search', 'stage']),
         ]);       
    }

     /**
     * Show the form for creating a new NormalAdjustment.
     */
    public function createNormalAdjustment()
    {
        return inertia('IvReconciliation/NormalAdjustment/Create', [
            'stores' => SIV_Store::all(), // Assuming you have a Store model
            'adjustmentreasons' => SIV_AdjustmentReason::all(), // Assuming you have an AdjustmentReason model              
        ]);
    }


    /**
     * Store a newly created NormalAdjustment in storage.
     */
    
     public function storeNormalAdjustment(Request $request)
     {
         // Validate input
         $validated = $request->validate([             
              'store_id' => 'required|exists:siv_stores,id', //validate customer id             
              'adjustment_reason_id' => 'required|exists:siv_adjustmentreasons,id', //validate store id       
              'stage' => 'required|integer|min:1',
              'normaladjustmentitems' => 'required|array',
              'normaladjustmentitems.*.item_id' => 'required|exists:siv_products,id',  
              'normaladjustmentitems.*.quantity' => 'required|numeric|min:0',
              'normaladjustmentitems.*.price' => 'required|numeric|min:0', 
         ]);

     
         // Begin database transaction
         DB::transaction(function () use ($validated) {
             // Create the normaladjustment without a total initially

             $transdate = Carbon::now(); 
             $normaladjustment = IVNormalAdjustment::create([
                 'transdate' => $transdate,
                 'store_id' => $validated['store_id'],
                 'adjustmentreason_id' => $validated['adjustment_reason_id'],
                 'stage' => $validated['stage'],
                 'total' => 0, // Set an initial total (will update later)
                 'user_id' => Auth::id(),
             ]);    
     
             // Create associated normaladjustment items
             foreach ($validated['normaladjustmentitems'] as $item) {
                 $normaladjustment->normaladjustmentitems()->create([
                     'product_id' => $item['item_id'],
                     'quantity' => $item['quantity'],
                     'price' => $item['price'],
                 ]);
             }
     
             // Reload the relationship to ensure all items are fetched
             $normaladjustment->load('normaladjustmentitems');
     
             // Compute the total based on updated normaladjustment items
             $calculatedTotal = $normaladjustment->normaladjustmentitems->sum(fn($item) => $item->quantity * $item->price);
     
             // Update normaladjustment with the correct total
             $normaladjustment->update(['total' => $calculatedTotal]);

            if($normaladjustment->stage == 2){                

                $AdjamentReason = SIV_AdjustmentReason::find($validated['adjustment_reason_id']);
                
                if ($AdjamentReason->action == "Add") {
                    $this->performReception($validated);
                } elseif ($AdjamentReason->action == "Deduct") {
                    $this->performIssuance($validated);
                }
            }
            
         });
     
         return redirect()->route('inventory3.normal-adjustment.index')->with('success', 'NormalAdjustment created successfully.');
     } 

    
      /**
     * Show the form for editing the specified normaladjustment.
     */
    public function editNormalAdjustment(IVNormalAdjustment $normaladjustment)
    {
        // Eager load normaladjustment items and their related items
        $normaladjustment->load(['store', 'adjustmentreason', 'normaladjustmentitems.item']); 

        return inertia('IvReconciliation/NormalAdjustment/Edit', [
            'normaladjustment' => $normaladjustment,
            'stores' => SIV_Store::all(), // Assuming you have a Store model
            'adjustmentreasons' => SIV_AdjustmentReason::all(), // Assuming you have an AdjustmentReason model
        ]);
    }


      /**
     * Update the specified normaladjustment in storage.
     */

     public function updateNormalAdjustment(Request $request, IVNormalAdjustment $normaladjustment)
     {
         // Validate input
         $validated = $request->validate([             
             'store_id' => 'required|exists:siv_stores,id', //validate customer id             
             'adjustment_reason_id' => 'required|exists:siv_adjustmentreasons,id', //validate store id      
             'total' => 'required|numeric|min:0',
             'stage' => 'required|integer|min:1',
             'normaladjustmentitems' => 'required|array',
             'normaladjustmentitems.*.id' => 'nullable|exists:iv_normaladjustmentitems,id',
             'normaladjustmentitems.*.item_id' => 'required|exists:siv_products,id',
             'normaladjustmentitems.*.quantity' => 'required|numeric|min:0',
             'normaladjustmentitems.*.price' => 'required|numeric|min:0',
         ]);
     
         // Update the normaladjustment within a transaction
         DB::transaction(function () use ($validated, $normaladjustment) {
             // Retrieve existing item IDs before the update
             $oldItemIds = $normaladjustment->normaladjustmentitems()->pluck('id')->toArray();
             
             $existingItemIds = [];
             $newItems = [];
     
             foreach ($validated['normaladjustmentitems'] as $item) {
                 if (!empty($item['id'])) {
                     $existingItemIds[] = $item['id'];
                 } else {
                     $newItems[] = $item;
                 }
             }
     
             // Identify and delete removed items
             $itemsToDelete = array_diff($oldItemIds, $existingItemIds);
             $normaladjustment->normaladjustmentitems()->whereIn('id', $itemsToDelete)->delete();
     
             // Add new items
             foreach ($newItems as $item) {
                 $normaladjustment->normaladjustmentitems()->create([
                     'product_id' => $item['item_id'],
                     'quantity' => $item['quantity'],
                     'price' => $item['price'],
                 ]);
             }
     
             // Update existing items
             foreach ($validated['normaladjustmentitems'] as $item) {
                 if (!empty($item['id'])) {
                     $normaladjustmentItem = IVNormalAdjustmentItem::find($item['id']);
     
                     if ($normaladjustmentItem) {
                         $normaladjustmentItem->update([
                             'product_id' => $item['item_id'],
                             'quantity' => $item['quantity'],
                             'price' => $item['price'],
                         ]);
                     }
                 }
             }
     
             // Compute the total based on updated normaladjustment items
             $calculatedTotal = $normaladjustment->normaladjustmentitems->sum(fn($item) => $item->quantity * $item->price);
     
             // Update the normaladjustment details
             $normaladjustment->update([                 
                 'store_id' => $validated['store_id'],
                 'adjustmentreason_id' => $validated['adjustment_reason_id'],
                 'stage' => $validated['stage'],
                 'total' => $calculatedTotal,
                 'user_id' => Auth::id(),
             ]);


            if($normaladjustment->stage == 2){                

                $AdjamentReason = SIV_AdjustmentReason::find($validated['adjustment_reason_id']);
                
                if ($AdjamentReason->action == "Add") {
                    $this->performReception($validated);
                } elseif ($AdjamentReason->action == "Deduct") {
                    $this->performIssuance($validated);
                }
            }

            
         });
     
         return redirect()->route('inventory3.normal-adjustment.index')->with('success', 'NormalAdjustment updated successfully.');
     }


     private function performIssuance($validated): void
     {
         $fromstore_id = $validated['store_id'];
         $tostore_id = $validated['adjustment_reason_id'];
         $tostore_type = 4; // For stock adjustment, set to 4
         $total = $validated['total'];
 
 
         $expiryDate = $validated['expiry_date'] ?? null; // Use validated expiry date
         $transDate = Carbon::now();
         $deliveryNo = $validated['delivery_no'] ?? ''; // Use validated delivery number
 
         
       
        
        $toStore = SIV_AdjustmentReason::find($tostore_id);
        $toStoreName = $toStore ? $toStore->name : 'Unknown Store';
         
 
 
         $issue = IVIssue::create([
             'transdate' => $transDate,
             'fromstore_id' => $fromstore_id,
             'tostore_id' => $tostore_id,
             'tostore_type' => $tostore_type, // Use the validated tostore type
             'total' => $total,
             'stage' => 4,
             'user_id' => Auth::id(),
         ]);
 
       
         foreach ($validated['normaladjustmentitems'] as $item) {
             //  // Check if sufficient quantity is available *before* any updates
             // $totalAvailable = BILProductControl::where('product_id', $item['item_id'])->value('qty_' . $fromstore_id) ?? 0;
 
             // if ($totalAvailable < $item['quantity']) {
             //      throw new \Exception("Insufficient quantity available for product ID: {$item['item_id']} in store ID: {$fromstore_id}");
             // }
             
             // --- Update/Delete Product Expiry Dates ---
             $productExpiry = BILProductExpiryDates::where('store_id', $fromstore_id)
                 ->where('product_id', $item['item_id'])
                 ->where('expirydate', $expiryDate)
                 ->first();
 
             if ($productExpiry) {
                 $productExpiry->decrement('quantity', $item['quantity']);
                 if ($productExpiry->quantity <= 0) {
                     $productExpiry->delete();
                 }
             }
         
             // --- Update/Insert Product Control ---
             $productControl = BILProductControl::firstOrCreate(
                 ['product_id' => $item['item_id']],
                 ['qty_' . $fromstore_id => 0]
             );
             $column = 'qty_' . $fromstore_id;
             $productControl->decrement($column, $item['quantity']);
 
             // --- Insert Product Transaction (Issuance) ---
             BILProductTransactions::create([
                 'transdate' => $transDate,
                 'sourcecode' => $tostore_id,
                 'sourcedescription' => $toStoreName,
                 'product_id' => $item['item_id'],
                 'expirydate' => $expiryDate,
                 'reference' => $deliveryNo,
                 'transprice' => $item['price'],
                 'transtype' => self::TRANSACTION_TYPE_ISSUE, // Use the constant
                 'transdescription' => 'Issued to Store: ' . $toStoreName,
                 'qtyout_' . $fromstore_id => $item['quantity'],
                 'user_id' => Auth::id(),
             ]);
 
 
             // Issue Items
             $issue->items()->create([
                 'product_id' => $item['item_id'],
                 'quantity' => $item['quantity'],
                 'price' => $item['price'],
             ]);            
             
         } 
         
     }
 
 
     private function performReception($validated): void
     {
         $fromstore_id = $validated['adjustment_reason_id'];;
         $tostore_id = $validated['store_id'];
         $tostore_type = 4; // For stock adjustment, set to 4
         $total = $validated['total'];
         $expiryDate = $validated['expiry_date'] ?? null;
         $transDate = Carbon::now();
         $deliveryNo = $validated['delivery_no'] ?? '';
 
         $fromStore = SIV_AdjustmentReason::find($fromstore_id);
         $fromStoreName = $fromStore ? $fromStore->name : 'Unknown Store';
 
         
         $received = IVReceive::create([
             'transdate' => $transDate,
             'fromstore_id' => $fromstore_id,
             'tostore_id' => $tostore_id,
             'tostore_type' => $tostore_type, // Use the validated tostore type
             'total' => $total,
             'stage' => 4,
             'user_id' => Auth::id(),
         ]);
 
         foreach ($validated['normaladjustmentitems'] as $item) {
 
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



      /**
     * XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
     */
    public function physicalInventory(Request $request)
    {
        $query = IVPhysicalInventory::with(['physicalinventoryitems', 'store']); // Eager load physicalinventory items and customer
     
         // Filtering by customer name using relationship
         if ($request->filled('search')) {
             $query->whereHas('store', function ($q) use ($request) {
                 $q->where('name', 'like', '%' . $request->search . '%');
             });
         }
     
         // Filtering by stage (Ensure 'stage' exists in the IVPhysicalinventory model)
         if ($request->filled('stage')) {
             $query->where('stage', $request->stage);
         }

         $query->where('stage', '<=', '2');
     
         // Paginate and sort physicalinventorys
         $physicalinventorys = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('IvReconciliation/PhysicalInventory/Index', [
             'physicalinventorys' => $physicalinventorys,
             'filters' => $request->only(['search', 'stage']),
         ]);       
    }  
        
        
    /**
     * Show the form for creating a new PhysicalInventory.
     */
    public function createPhysicalInventory()
    {
        return inertia('IvReconciliation/PhysicalInventory/Create', [
            'stores' => SIV_Store::all(), // Assuming you have a Store model             
        ]);
    }

     public function storePhysicalInventory(Request $request)
     {
         // Validate input
         $validated = $request->validate([             
              'store_id' => 'required|exists:siv_stores,id', //validate customer id             
              'description' => 'nullable|string|max:255', //validate store id       
              'stage' => 'required|integer|min:1',
              'physicalinventoryitems' => 'required|array',
              'physicalinventoryitems.*.item_id' => 'required|exists:siv_products,id',  
              'physicalinventoryitems.*.countedqty' => 'required|numeric|min:0',
              'physicalinventoryitems.*.expectedqty' => 'required|numeric|min:0',
              'physicalinventoryitems.*.price' => 'required|numeric|min:0', 
         ]);

     
         // Begin database transaction
         DB::transaction(function () use ($validated) {
             // Create the physicalinventory without a total initially

             $transdate = Carbon::now(); 
             $physicalinventory = IVPhysicalinventory::create([
                 'transdate' => $transdate,
                 'store_id' => $validated['store_id'],
                 'description' => $validated['description'],
                 'stage' => $validated['stage'],
                 //'total' => 0, // Set an initial total (will update later)
                 'user_id' => Auth::id(),
             ]);    
     
             // Create associated physicalinventory items
             foreach ($validated['physicalinventoryitems'] as $item) {
                 $physicalinventory->physicalinventoryitems()->create([
                     'product_id' => $item['item_id'],
                     'countedqty' => $item['countedqty'],
                     'expectedqty' => $item['expectedqty'],
                     'price' => $item['price'],
                 ]);
             }
     
            //  // Reload the relationship to ensure all items are fetched
            //  $physicalinventory->load('physicalinventoryitems');
     
            //  // Compute the total based on updated physicalinventory items
            //  $calculatedTotal = $physicalinventory->physicalinventoryitems->sum(fn($item) => $item->quantity * $item->price);
     
            //  // Update physicalinventory with the correct total
            //  $physicalinventory->update(['total' => $calculatedTotal]);
         });
     
         return redirect()->route('inventory3.physical-inventory.index')->with('success', 'Physicalinventory created successfully.');
     }  

    /**
     * Show the form for editing the specified physicalinventory.
     */
    public function editPhysicalInventory(IVPhysicalInventory $physicalinventory)
    {
        // Eager load physicalinventory items and their related items
        $physicalinventory->load(['store', 'physicalinventoryitems.item']); 

        return inertia('IvReconciliation/PhysicalInventory/Edit', [
            'physicalinventory' => $physicalinventory,
            'stores' => SIV_Store::all(), // Assuming you have a Store model
        ]);
    }
   

    /**
     * Update the specified physicalinventory in storage.
     */

     public function updatePhysicalInventory(Request $request, IVPhysicalinventory $physicalinventory)
     {
         // Validate input
         $validated = $request->validate([             
             'store_id' => 'required|exists:siv_stores,id', //validate customer id             
             'description' => 'nullable|string|max:255', //validate store id     
             'stage' => 'required|integer|min:1',
             'physicalinventoryitems' => 'required|array',
             'physicalinventoryitems.*.id' => 'nullable|exists:iv_physicalinventoryitems,id',
             'physicalinventoryitems.*.item_id' => 'required|exists:siv_products,id',
             'physicalinventoryitems.*.countedqty' => 'required|numeric|min:0',
             'physicalinventoryitems.*.expectedqty' => 'required|numeric|min:0',
             'physicalinventoryitems.*.price' => 'required|numeric|min:0',
         ]);
     
         // Update the physicalinventory within a transaction
         DB::transaction(function () use ($validated, $physicalinventory) {
             // Retrieve existing item IDs before the update
             $oldItemIds = $physicalinventory->physicalinventoryitems()->pluck('id')->toArray();
             
             $existingItemIds = [];
             $newItems = [];
     
             foreach ($validated['physicalinventoryitems'] as $item) {
                 if (!empty($item['id'])) {
                     $existingItemIds[] = $item['id'];
                 } else {
                     $newItems[] = $item;
                 }
             }
     
             // Identify and delete removed items
             $itemsToDelete = array_diff($oldItemIds, $existingItemIds);
             $physicalinventory->physicalinventoryitems()->whereIn('id', $itemsToDelete)->delete();
     
             // Add new items
             foreach ($newItems as $item) {
                 $physicalinventory->physicalinventoryitems()->create([
                     'product_id' => $item['item_id'],
                     'countedqty' => $item['countedqty'],
                     'expectedqty' => $item['expectedqty'],
                     'price' => $item['price'],
                 ]);
             }
     
             // Update existing items
             foreach ($validated['physicalinventoryitems'] as $item) {
                 if (!empty($item['id'])) {
                     $physicalinventoryItem = IVPhysicalinventoryItem::find($item['id']);
     
                     if ($physicalinventoryItem) {
                         $physicalinventoryItem->update([
                             'product_id' => $item['item_id'],
                             'countedqty' => $item['countedqty'],
                             'expectedqty' => $item['expectedqty'],
                             'price' => $item['price'],
                         ]);
                     }
                 }
             }
     
             // Compute the total based on updated physicalinventory items
             //$calculatedTotal = $physicalinventory->physicalinventoryitems->sum(fn($item) => $item->quantity * $item->price);
     
             // Update the physicalinventory details
             $physicalinventory->update([                 
                 'store_id' => $validated['store_id'],
                 'description' => $validated['description'],
                 'stage' => $validated['stage'],
                 //'total' => $calculatedTotal,
                 'user_id' => Auth::id(),
             ]);
         });
     
         return redirect()->route('inventory3.physical-inventory.index')->with('success', 'Physicalinventory updated successfully.');
     }
          
    
   
}
