<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\ManagesItems;
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

    use ManagesItems; // Use the trait
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
        $validated = $request->validate([
            'to_store_id' => 'required|exists:siv_stores,id',
            'from_store_id' => 'required|exists:siv_stores,id',
            'stage' => 'required|integer|min:1',
            // Remarks are still validated from the request, but not stored on the main table
            'remarks' => 'nullable|string|required_if:stage,2',
            'requistionitems' => 'required|array',
            'requistionitems.*.item_id' => 'required|exists:siv_products,id',
            'requistionitems.*.quantity' => 'required|numeric|min:1',
            'requistionitems.*.price' => 'required|numeric|min:0',
        ]);

        $requistion = DB::transaction(function () use ($validated) {
            // 1. Create the main requisition record (WITHOUT remarks)
            $requistion = IVRequistion::create([
                'transdate' => now(),
                'tostore_id' => $validated['to_store_id'],
                'tostore_type' => StoreType::Store->value,
                'fromstore_id' => $validated['from_store_id'],
                'stage' => $validated['stage'],
                'total' => 0, // Will be updated below
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
        $validated = $request->validate([
            'to_store_id' => 'required|exists:siv_stores,id',
            'from_store_id' => 'required|exists:siv_stores,id',
            'stage' => 'required|integer|min:1',
             // Remarks are still validated from the request
            'remarks' => 'nullable|string|required_if:stage,2',
            'requistionitems' => 'required|array',
            'requistionitems.*.id' => 'nullable|exists:iv_requistionitems,id',
            'requistionitems.*.item_id' => 'required|exists:siv_products,id',
            'requistionitems.*.quantity' => 'required|numeric|min:1',
            'requistionitems.*.price' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated, $requistion) {
            // 1. Sync items
            $this->syncItems($requistion, $validated['requistionitems'], 'requistionitems');

            // 2. Recalculate total
            $requistion->load('requistionitems');
            $calculatedTotal = $requistion->requistionitems->sum(fn($item) => $item->quantity * $item->price);

            // 3. Update the main requisition record (WITHOUT remarks)
            $requistion->update([
                'tostore_id' => $validated['to_store_id'],
                'fromstore_id' => $validated['from_store_id'],
                'stage' => $validated['stage'],
                'total' => $calculatedTotal,
                // user_id is typically not updated, but depends on your business logic
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
        // Delete the requistion and associated items
        $requistion->requistionitems()->delete();
        $requistion->delete();

        return redirect()->route('inventory0.index')
            ->with('success', 'Requistion deleted successfully.');
    }
}
