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
     * Display a listing of requistions.
     */
    public function index(Request $request)
    {
        $query = IVRequistion::with(['requistionitems', 'fromstore']);

        if ($request->filled('search')) {
            $query->whereHas('fromstore', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        $query->where('stage', '>=', 2);

        $requistions = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('IvReceive/Index', [
            'requistions' => $requistions,
            'filters' => $request->only(['search', 'stage']),
        ]);
    }

    /**
     * Show the form for editing the specified requistion.
     */
    public function edit(IVRequistion $requistion)
    {
        $requistion->load(['fromstore', 'tostore', 'requistionitems.item']);

        return inertia('IvReceive/Receive', [
            'requistion' => $requistion,
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
            'total' => 'required|numeric|min:0',
            'stage' => 'required|integer|min:1',
            'requistionitems' => 'required|array',
            'requistionitems.*.id' => 'nullable|exists:iv_requistionitems,id',
            'requistionitems.*.item_id' => 'required|exists:siv_products,id',
            'requistionitems.*.quantity' => 'required|numeric|min:0',
            'requistionitems.*.price' => 'required|numeric|min:0',
            'delivery_no' => 'nullable|string', // Add delivery_no validation
            'expiry_date' => 'nullable|date',   // Add expiry_date validation
            'double_entry' => 'boolean', // Add double_entry validation
        ]);

        $doubleEntry = $validated['double_entry'] ?? true; // Default to true if not provided
        $transferType = 'StoreToStore'; // You might determine this dynamically.

        DB::beginTransaction();

        try {
            $this->processeRequistion($validated, $requistion);
           
            $this->performIssuance($validated);

            if ($transferType === 'StoreToStore' && $doubleEntry) {
                $this->performReception($validated); // Pass $validated directly
            }

            DB::commit();
            return redirect()->route('inventory2.index')->with('success', 'Requistion updated successfully.');

        } catch (ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json(['message' => 'Record not found: ' . $e->getMessage()], 404);
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Stock transaction failed: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine());
            return response()->json(['message' => 'An error occurred while processing the stock transaction.'], 500);
        }
    }



    private function processeRequistion($validated, $requistion): void
    {
        // Retrieve existing item IDs
        $oldItemIds = $requistion->requistionitems()->pluck('id')->toArray();
        $existingItemIds = [];
        $newItems = [];

        foreach ($validated['requistionitems'] as $item) {
            $existingItemIds[] = $item['id'] ?? null;  // Use null coalescing operator
            if (empty($item['id'])) {
                $newItems[] = $item;
            }
        }

        // Delete removed items
        $itemsToDelete = array_diff($oldItemIds, array_filter($existingItemIds)); // Filter out null values
        $requistion->requistionitems()->whereIn('id', $itemsToDelete)->delete();

        // Add new items
        foreach ($newItems as $item) {
            $requistion->requistionitems()->create([
                'product_id' => $item['item_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
            ]);
        }

        // Update existing items.  Use firstOrFail() for better error handling
        foreach ($validated['requistionitems'] as $item) {
            if (!empty($item['id'])) {
                $requistionItem = IVRequistionItem::where('id', $item['id'])->where('iv_requistion_id', $requistion->id)->firstOrFail();
                $requistionItem->update([
                    'product_id' => $item['item_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                ]);
            }
        }

        // Calculate total and update requistion
        $calculatedTotal = $requistion->requistionitems()->sum(DB::raw('quantity * price'));  // More robust calculation
        $requistion->update([
            'tostore_id' => $validated['to_store_id'],
            'fromstore_id' => $validated['from_store_id'],
            'stage' => 3,
            'total' => $calculatedTotal,
            'user_id' => Auth::id(),
        ]);
    }


    private function performIssuance($validated): void
    {
        $fromstore_id = $validated['from_store_id'];
        $tostore_id = $validated['to_store_id'];
        $expiryDate = $validated['expiry_date'] ?? null; // Use validated expiry date
        $transDate = Carbon::now();
        $deliveryNo = $validated['delivery_no'] ?? ''; // Use validated delivery number

        $toStore = SIV_Store::find($tostore_id);
        $toStoreName = $toStore ? $toStore->name : 'Unknown Store';

        $issue = IVIssue::create([
            'transdate' => $transDate,
            'fromstore_id' => $fromstore_id,
            'tostore_id' => $tostore_id,
            'stage' => 3,
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
            $received->items()->create([
                'product_id' => $item['item_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
            ]); 
        }

     
    }
}