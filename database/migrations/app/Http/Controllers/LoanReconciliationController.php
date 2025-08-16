<?php

namespace App\Http\Controllers;

use App\Models\loanNormalAdjustment;
use App\Models\loanNormalAdjustmentItem;

use App\Models\loanPhysicalLoan;
use App\Models\loanPhysicalLoanItem;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;


class LoanReconciliationController extends Controller
{
    /**
     * Display a listing of normaladjustments.
     */
    
    public function index(Request $request)
    { 
        return inertia('LoanReconciliation/Index');
    }

    public function normalAdjustment(Request $request)
    {
        $query = LoanNormalAdjustment::with(['normaladjustmentitems', 'store']); // Eager load normaladjustment items and customer
     
         // Filtering by customer name using relationship
         if ($request->filled('search')) {
             $query->whereHas('store', function ($q) use ($request) {
                 $q->where('name', 'like', '%' . $request->search . '%');
             });
         }
     
         // Filtering by stage (Ensure 'stage' exists in the loanNormalAdjustment model)
         if ($request->filled('stage')) {
             $query->where('stage', $request->stage);
         }

         $query->where('stage', '<=', '2');
     
         // Paginate and sort normaladjustments
         $normaladjustments = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('loanReconciliation/NormalAdjustment/Index', [
             'normaladjustments' => $normaladjustments,
             'filters' => $request->only(['search', 'stage']),
         ]);       
    }

     /**
     * Show the form for creating a new NormalAdjustment.
     */
    public function createNormalAdjustment()
    {
        return inertia('loanReconciliation/NormalAdjustment/Create');
    }


    /**
     * Store a newly created NormalAdjustment in storage.
     */
    
     public function storeNormalAdjustment(Request $request)
     {
         // Validate input
         $validated = $request->validate([             
              'store_id' => 'required|exists:sloan_stores,id', //validate customer id             
              'adjustment_reason_id' => 'required|exists:sloan_adjustmentreasons,id', //validate store id       
              'stage' => 'required|integer|min:1',
              'normaladjustmentitems' => 'required|array',
              'normaladjustmentitems.*.item_id' => 'required|exists:sloan_products,id',  
              'normaladjustmentitems.*.quantity' => 'required|numeric|min:0',
              'normaladjustmentitems.*.price' => 'required|numeric|min:0', 
         ]);

     
         // Begin database transaction
         DB::transaction(function () use ($validated) {
             // Create the normaladjustment without a total initially

             $transdate = Carbon::now(); 
             $normaladjustment = loanNormalAdjustment::create([
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
     
         return redirect()->route('loan3.normal-adjustment.index')->with('success', 'NormalAdjustment created successfully.');
     } 

    
      /**
     * Show the form for editing the specified normaladjustment.
     */
    public function editNormalAdjustment(loanNormalAdjustment $normaladjustment)
    {
        // Eager load normaladjustment items and their related items
        $normaladjustment->load(['store', 'adjustmentreason', 'normaladjustmentitems.item']); 

        return inertia('loanReconciliation/NormalAdjustment/Edit', [
            'normaladjustment' => $normaladjustment,
        ]);
    }


      /**
     * Update the specified normaladjustment in storage.
     */

     public function updateNormalAdjustment(Request $request, loanNormalAdjustment $normaladjustment)
     {
         // Validate input
         $validated = $request->validate([             
             'store_id' => 'required|exists:sloan_stores,id', //validate customer id             
             'adjustment_reason_id' => 'required|exists:sloan_adjustmentreasons,id', //validate store id      
             'total' => 'required|numeric|min:0',
             'stage' => 'required|integer|min:1',
             'normaladjustmentitems' => 'required|array',
             'normaladjustmentitems.*.id' => 'nullable|exists:loan_normaladjustmentitems,id',
             'normaladjustmentitems.*.item_id' => 'required|exists:sloan_products,id',
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
                     $normaladjustmentItem = loanNormalAdjustmentItem::find($item['id']);
     
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
     
         return redirect()->route('loan3.normal-adjustment.index')->with('success', 'NormalAdjustment updated successfully.');
     }



      /**
     * XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
     */
    public function physicalLoan(Request $request)
    {
        $query = loanPhysicalLoan::with(['physicalloanitems', 'store']); // Eager load physicalloan items and customer
     
         // Filtering by customer name using relationship
         if ($request->filled('search')) {
             $query->whereHas('store', function ($q) use ($request) {
                 $q->where('name', 'like', '%' . $request->search . '%');
             });
         }
     
         // Filtering by stage (Ensure 'stage' exists in the loanPhysicalloan model)
         if ($request->filled('stage')) {
             $query->where('stage', $request->stage);
         }

         $query->where('stage', '<=', '2');
     
         // Paginate and sort physicalloans
         $physicalloans = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('loanReconciliation/PhysicalLoan/Index', [
             'physicalloans' => $physicalloans,
             'filters' => $request->only(['search', 'stage']),
         ]);       
    }  
        
        
    /**
     * Show the form for creating a new PhysicalLoan.
     */
    public function createPhysicalLoan()
    {
        return inertia('loanReconciliation/PhysicalLoan/Create');
    }

     public function storePhysicalLoan(Request $request)
     {
         // Validate input
         $validated = $request->validate([             
              'store_id' => 'required|exists:sloan_stores,id', //validate customer id             
              'description' => 'nullable|string|max:255', //validate store id       
              'stage' => 'required|integer|min:1',
              'physicalloanitems' => 'required|array',
              'physicalloanitems.*.item_id' => 'required|exists:sloan_products,id',  
              'physicalloanitems.*.countedqty' => 'required|numeric|min:0',
              'physicalloanitems.*.expectedqty' => 'required|numeric|min:0',
              'physicalloanitems.*.price' => 'required|numeric|min:0', 
         ]);

     
         // Begin database transaction
         DB::transaction(function () use ($validated) {
             // Create the physicalloan without a total initially

             $transdate = Carbon::now(); 
             $physicalloan = loanPhysicalloan::create([
                 'transdate' => $transdate,
                 'store_id' => $validated['store_id'],
                 'description' => $validated['description'],
                 'stage' => $validated['stage'],
                 //'total' => 0, // Set an initial total (will update later)
                 'user_id' => Auth::id(),
             ]);    
     
             // Create associated physicalloan items
             foreach ($validated['physicalloanitems'] as $item) {
                 $physicalloan->physicalloanitems()->create([
                     'product_id' => $item['item_id'],
                     'countedqty' => $item['countedqty'],
                     'expectedqty' => $item['expectedqty'],
                     'price' => $item['price'],
                 ]);
             }
     
            //  // Reload the relationship to ensure all items are fetched
            //  $physicalloan->load('physicalloanitems');
     
            //  // Compute the total based on updated physicalloan items
            //  $calculatedTotal = $physicalloan->physicalloanitems->sum(fn($item) => $item->quantity * $item->price);
     
            //  // Update physicalloan with the correct total
            //  $physicalloan->update(['total' => $calculatedTotal]);
         });
     
         return redirect()->route('loan3.physical-loan.index')->with('success', 'Physicalloan created successfully.');
     }  

    /**
     * Show the form for editing the specified physicalloan.
     */
    public function editPhysicalLoan(loanPhysicalLoan $physicalloan)
    {
        // Eager load physicalloan items and their related items
        $physicalloan->load(['store', 'physicalloanitems.item']); 

        return inertia('LoanReconciliation/PhysicalLoan/Edit', [
            'physicalloan' => $physicalloan,
        ]);
    }
   

    /**
     * Update the specified physicalloan in storage.
     */

     public function updatePhysicalLoan(Request $request, loanPhysicalloan $physicalloan)
     {
         // Validate input
         $validated = $request->validate([             
             'store_id' => 'required|exists:sloan_stores,id', //validate customer id             
             'description' => 'nullable|string|max:255', //validate store id     
             'stage' => 'required|integer|min:1',
             'physicalloanitems' => 'required|array',
             'physicalloanitems.*.id' => 'nullable|exists:loan_physicalloanitems,id',
             'physicalloanitems.*.item_id' => 'required|exists:sloan_products,id',
             'physicalloanitems.*.countedqty' => 'required|numeric|min:0',
             'physicalloanitems.*.expectedqty' => 'required|numeric|min:0',
             'physicalloanitems.*.price' => 'required|numeric|min:0',
         ]);
     
         // Update the physicalloan within a transaction
         DB::transaction(function () use ($validated, $physicalloan) {
             // Retrieve existing item IDs before the update
             $oldItemIds = $physicalloan->physicalloanitems()->pluck('id')->toArray();
             
             $existingItemIds = [];
             $newItems = [];
     
             foreach ($validated['physicalloanitems'] as $item) {
                 if (!empty($item['id'])) {
                     $existingItemIds[] = $item['id'];
                 } else {
                     $newItems[] = $item;
                 }
             }
     
             // Identify and delete removed items
             $itemsToDelete = array_diff($oldItemIds, $existingItemIds);
             $physicalloan->physicalloanitems()->whereIn('id', $itemsToDelete)->delete();
     
             // Add new items
             foreach ($newItems as $item) {
                 $physicalloan->physicalloanitems()->create([
                     'product_id' => $item['item_id'],
                     'countedqty' => $item['countedqty'],
                     'expectedqty' => $item['expectedqty'],
                     'price' => $item['price'],
                 ]);
             }
     
             // Update existing items
             foreach ($validated['physicalloanitems'] as $item) {
                 if (!empty($item['id'])) {
                     $physicalloanItem = loanPhysicalloanItem::find($item['id']);
     
                     if ($physicalloanItem) {
                         $physicalloanItem->update([
                             'product_id' => $item['item_id'],
                             'countedqty' => $item['countedqty'],
                             'expectedqty' => $item['expectedqty'],
                             'price' => $item['price'],
                         ]);
                     }
                 }
             }
     
             // Compute the total based on updated physicalloan items
             //$calculatedTotal = $physicalloan->physicalloanitems->sum(fn($item) => $item->quantity * $item->price);
     
             // Update the physicalloan details
             $physicalloan->update([                 
                 'store_id' => $validated['store_id'],
                 'description' => $validated['description'],
                 'stage' => $validated['stage'],
                 //'total' => $calculatedTotal,
                 'user_id' => Auth::id(),
             ]);
         });
     
         return redirect()->route('loan3.physical-loan.index')->with('success', 'Physicalloan updated successfully.');
     }
          
    
   
}
