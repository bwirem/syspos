<?php

namespace App\Http\Controllers;

use App\Models\IVRequistion;
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
    public function update(Request $request, IVRequistion $requistion)
    {  
        
               
        
        $StoreToStore = false;

        if($requistion->stage == 2){

            $requistion->update([ 'stage' => 3,]);          
            return redirect()->route('inventory1.edit', ['requistion' =>$requistion->id])->with('success', 'Requistion updated successfully.');

        }else{

            $request->validate([
                'tostore_type' => ['required', new Enum(StoreType::class)], // Ensure tostore_type is valid
            ]);
            
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
            
            // Conditionally apply validation depending on tostore_type
            switch ($request->tostore_type) {
                case StoreType::Store->value:
                    $rules['to_store_id'] = 'required|exists:siv_stores,id';
                    $StoreToStore = true;
                    break;
                case StoreType::Customer->value:
                    $rules['to_store_id'] = 'required|exists:bls_customers,id';
                    break;
            }
            
            $validated = $request->validate($rules);
            

            $doubleEntry = $validated['double_entry'] ?? true; // Default to true if not provided
            $transferType = 'StoreToStore'; // You might determine this dynamically.

            DB::beginTransaction();

            try {

              
                $this->performIssuance($validated,$StoreToStore); // Pass $validated directly

                if ($StoreToStore && $doubleEntry) {
                    $this->performReception($validated); // Pass $validated directly
                }

                $requistion->update([ 'stage' => 4,]);            

                DB::commit();
                return redirect()->route('inventory1.index')->with('success', 'Requistion updated successfully.');

            } catch (ModelNotFoundException $e) {
                DB::rollBack();
                return response()->json(['message' => 'Record not found: ' . $e->getMessage()], 404);
            } catch (Throwable $e) {
                DB::rollBack();
                Log::error('Stock transaction failed: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine());
                return response()->json(['message' => 'An error occurred while processing the stock transaction.'], 500);
            }
        }
    }

 

    private function performIssuance($validated,$StoreToStore): void
    {
        $fromstore_id = $validated['from_store_id'];
        $tostore_id = $validated['to_store_id'];
        $tostore_type = $validated['tostore_type']; // Get the tostore type
        $total = $validated['total'];


        $expiryDate = $validated['expiry_date'] ?? null; // Use validated expiry date
        $transDate = Carbon::now();
        $deliveryNo = $validated['delivery_no'] ?? ''; // Use validated delivery number

        
        $toStore = null;
        $toStoreName = 'Unknown';

        if ($StoreToStore) {
            $toStore = SIV_Store::find($tostore_id);
            $toStoreName = $toStore ? $toStore->name : 'Unknown Store';
        } else {
            $toStore = BLSCustomer::find($tostore_id);
            if ($toStore) {
                if ($toStore->customer_type === 'individual') {
                    $toStoreName = trim("{$toStore->first_name} " . ($toStore->other_names ? $toStore->other_names . ' ' : '') . "{$toStore->surname}");
                } elseif ($toStore->customer_type === 'company') {
                    $toStoreName = $toStore->company_name;
                } 
            } else {
                $toStoreName = 'Unknown Customer';
            }
        }


        $issue = IVIssue::create([
            'transdate' => $transDate,
            'fromstore_id' => $fromstore_id,
            'tostore_id' => $tostore_id,
            'tostore_type' => $tostore_type, // Use the validated tostore type
            'total' => $total,
            'stage' => 4,
            'user_id' => Auth::id(),
        ]);

      
        foreach ($validated['requistionitems'] as $item) {
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
        $fromstore_id = $validated['from_store_id'];
        $tostore_id = $validated['to_store_id'];
        $tostore_type = $validated['tostore_type']; // Get the tostore type
        $total = $validated['total'];
        $expiryDate = $validated['expiry_date'] ?? null;
        $transDate = Carbon::now();
        $deliveryNo = $validated['delivery_no'] ?? '';

        $fromStore = SIV_Store::find($fromstore_id);
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

        foreach ($validated['requistionitems'] as $item) {

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
            $received->receiveitems()->create([
                'product_id' => $item['item_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
            ]); 
        }

     
    }

    
    public function return(IVRequistion $requistion)
    { 
        // Check if the current stage is greater than 0
        if ($requistion->stage > 1) {
            // Decrease the requistion stage by 1
            $requistion->update(['stage' => $requistion->stage - 1]);
        } else {
            // Optionally, you can log or handle the case where the stage is already 0
            // Log::warning('Attempted to decrease requistion stage below zero for requistion ID: ' . $requistion->id);
        }
    
        // Redirect to the 'edit' route for the current requistion
        return redirect()->route('inventory1.edit', ['requistion' => $requistion->id]);
    }    

}