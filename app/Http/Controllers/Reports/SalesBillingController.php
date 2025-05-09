<?php

namespace App\Http\Controllers\Reports;

use App\Models\IVNormalAdjustment;
use App\Models\IVNormalAdjustmentItem;

use App\Models\IVPhysicalInventory;
use App\Models\IVPhysicalInventoryItem;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;


class SalesBillingController extends Controller
{
    /**
     * Display a listing of normaladjustments.
     */
    
    public function index(Request $request)
    { 
        return inertia('Reports/SalesBilling/Index');
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
        return inertia('IvReconciliation/NormalAdjustment/Create');
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
         });
     
         return redirect()->route('inventory3.normal-adjustment.index')->with('success', 'NormalAdjustment updated successfully.');
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
        return inertia('IvReconciliation/PhysicalInventory/Create');
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
