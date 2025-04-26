<?php

namespace App\Http\Controllers;

use App\Models\IVRequistion;
use App\Models\IVRequistionItem;

use App\Models\SIV_Store;
use App\Models\BLSCustomer;
use App\Enums\StoreType;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

use Illuminate\Support\Facades\Log;



class IVRequistionController extends Controller
{
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
            'fromstore' => SIV_Store::all(), // Pass the correct data to the view
            'tostore' => SIV_Store::all(), // Pass the correct data to the view
        ]);
    }

    /**
     * Store a newly created requistion in storage.
     */
    
     public function store(Request $request)
     {
         // Validate input
         $validated = $request->validate([             
              'to_store_id' => 'required|exists:siv_stores,id', //validate customer id             
              'from_store_id' => 'required|exists:siv_stores,id', //validate store id       
              'stage' => 'required|integer|min:1',
              'requistionitems' => 'required|array',
              'requistionitems.*.item_id' => 'required|exists:siv_products,id',  
              'requistionitems.*.quantity' => 'required|numeric|min:0',
              'requistionitems.*.price' => 'required|numeric|min:0', 
         ]);

     
         // Begin database transaction
         DB::transaction(function () use ($validated) {
             // Create the requistion without a total initially

             $transdate = Carbon::now(); 
             $requistion = IVRequistion::create([
                 'transdate' => $transdate,
                 'tostore_id' => $validated['to_store_id'],
                 'tostore_type' => StoreType::Store->value, // Assuming this is a store
                 'fromstore_id' => $validated['from_store_id'],                 
                 'stage' => $validated['stage'],
                 'total' => 0, // Set an initial total (will update later)
                 'user_id' => Auth::id(),
             ]);    
     
             // Create associated requistion items
             foreach ($validated['requistionitems'] as $item) {
                 $requistion->requistionitems()->create([
                     'product_id' => $item['item_id'],
                     'quantity' => $item['quantity'],
                     'price' => $item['price'],
                 ]);
             }
     
             // Reload the relationship to ensure all items are fetched
             $requistion->load('requistionitems');
     
             // Compute the total based on updated requistion items
             $calculatedTotal = $requistion->requistionitems->sum(fn($item) => $item->quantity * $item->price);
     
             // Update requistion with the correct total
             $requistion->update(['total' => $calculatedTotal]);
         });
     
         return redirect()->route('inventory0.index')->with('success', 'Requistion created successfully.');
     }     

    /**
     * Show the form for editing the specified requistion.
     */
    public function edit(IVRequistion $requistion)
    {
        $requistion->load(['fromstore', 'requistionitems.item']);
       
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
             
        return inertia('IvRequisition/Edit', [
            'requistion' => $requistion,
            'fromstore' => SIV_Store::all(), // Pass the correct data to the view
            'tostore' => SIV_Store::all(), // Pass the correct data to the view
        ]);
    }



    /**
     * Update the specified requistion in storage.
     */

     public function update(Request $request, IVRequistion $requistion)
     {
         // Validate input
         $validated = $request->validate([             
             'to_store_id' => 'required|exists:siv_stores,id', //validate customer id             
             'from_store_id' => 'required|exists:siv_stores,id', //validate store id       
             'total' => 'required|numeric|min:0',
             'stage' => 'required|integer|min:1',
             'requistionitems' => 'required|array',
             'requistionitems.*.id' => 'nullable|exists:iv_requistionitems,id',
             'requistionitems.*.item_id' => 'required|exists:siv_products,id',
             'requistionitems.*.quantity' => 'required|numeric|min:0',
             'requistionitems.*.price' => 'required|numeric|min:0',
         ]);
     
         // Update the requistion within a transaction
         DB::transaction(function () use ($validated, $requistion) {
             // Retrieve existing item IDs before the update
             $oldItemIds = $requistion->requistionitems()->pluck('id')->toArray();
             
             $existingItemIds = [];
             $newItems = [];
     
             foreach ($validated['requistionitems'] as $item) {
                 if (!empty($item['id'])) {
                     $existingItemIds[] = $item['id'];
                 } else {
                     $newItems[] = $item;
                 }
             }
     
             // Identify and delete removed items
             $itemsToDelete = array_diff($oldItemIds, $existingItemIds);
             $requistion->requistionitems()->whereIn('id', $itemsToDelete)->delete();
     
             // Add new items
             foreach ($newItems as $item) {
                 $requistion->requistionitems()->create([
                     'product_id' => $item['item_id'],
                     'quantity' => $item['quantity'],
                     'price' => $item['price'],
                 ]);
             }
     
             // Update existing items
             foreach ($validated['requistionitems'] as $item) {
                 if (!empty($item['id'])) {
                     $requistionItem = IVRequistionItem::find($item['id']);
     
                     if ($requistionItem) {
                         $requistionItem->update([
                             'product_id' => $item['item_id'],
                             'quantity' => $item['quantity'],
                             'price' => $item['price'],
                         ]);
                     }
                 }
             }
     
             // Compute the total based on updated requistion items
             $calculatedTotal = $requistion->requistionitems->sum(fn($item) => $item->quantity * $item->price);
     
             // Update the requistion details
             $requistion->update([                 
                 'tostore_id' => $validated['to_store_id'],
                 'tostore_type' => StoreType::Store->value, // Assuming this is a store
                 'fromstore_id' => $validated['from_store_id'],
                 'stage' => $validated['stage'],
                 'total' => $calculatedTotal,
                 'user_id' => Auth::id(),
             ]);
         });
     
         return redirect()->route('inventory0.index')->with('success', 'Requistion updated successfully.');
     }
     
     
    
    /**
     * Remove the specified requistion from storage.
     */
    public function destroy(IVRequistion $requistion)
    {
        // Delete the requistion and associated items
        $requistion->requistionitems()->delete();
        $requistion->delete();

        return redirect()->route('inventory0.index')
            ->with('success', 'Requistion deleted successfully.');
    }
}
