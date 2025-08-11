<?php

namespace App\Http\Controllers;

use App\Models\EXPPost;
use App\Models\EXPPostItem;
use App\Models\FacilityOption;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

use Illuminate\Support\Facades\Log;


class ExpApprovalController extends Controller
{
    /**
     * Display a listing of posts.
     */
    
     public function index(Request $request)
     {
         $query = EXPPost::with(['postitems']); // Eager load post items and customer
     
         // Filtering by customer name using relationship
         if ($request->filled('search')) {            
             $query->where('description', 'like', '%' . $request->search . '%');          
         }    
         
         $query->where('stage', '=', '2');
     
         // Paginate and sort approvals
         $approvals = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('ExpApproval/Index', [
             'approvals' => $approvals,
             'filters' => $request->only(['search']),
         ]);
     }
     

    /**
     * Show the form for editing the specified approval.
     */
    public function edit(EXPPost $approval)
    {

        // Eager load approval items and their related items
        $approval->load(['facilityoption', 'postitems.item']);        

        return inertia('ExpApproval/Approval', [
            'approval' => $approval,
        ]);
    }


    /**
     * Update the specified post in storage.
     */  

    public function update(Request $request, EXPPost $approval)
    {
        // Validate input - Changed to expect 'approvalitems' to match the frontend
        $validated = $request->validate([
            'description'      => 'required|string|max:255',
            'facility_id'      => 'required|exists:facilityoptions,id',
            'stage'            => 'required|integer|min:1',
            'approval_remarks' => 'nullable|string|max:1000', // Added for approval/rejection remarks
            'approvalitems'    => 'required|array|min:1',
            'approvalitems.*.id' => 'nullable|exists:exp_expensepostitems,id', // Note: table name is exp_expensepostitems
            'approvalitems.*.item_id' => 'required|exists:sexp_items,id',
            'approvalitems.*.amount'  => 'required|numeric|min:0.01',
            'approvalitems.*.remarks' => 'nullable|string|max:255',
        ], [
            'approvalitems.min' => 'At least one expense item is required.',
        ]);

        // Use a database transaction for data integrity
        DB::transaction(function () use ($validated, $approval, $request) {
            // Retrieve existing item IDs associated with the approval
            $existingItemIdsFromDb = $approval->postitems()->pluck('id')->toArray();
            
            $submittedItemIds = [];
            $newItems = [];

            // Separate new items from existing ones
            foreach ($validated['approvalitems'] as $item) {
                if (!empty($item['id'])) {
                    $submittedItemIds[] = $item['id'];
                } else {
                    $newItems[] = $item;
                }
            }

            // Determine which items to delete
            $itemsToDelete = array_diff($existingItemIdsFromDb, $submittedItemIds);
            if (!empty($itemsToDelete)) {
                $approval->postitems()->whereIn('id', $itemsToDelete)->delete();
            }

            // Create new items
            if (!empty($newItems)) {
                foreach ($newItems as $item) {
                    $approval->postitems()->create([
                        'item_id' => $item['item_id'],
                        'amount'  => $item['amount'],
                        'remarks' => $item['remarks'],
                    ]);
                }
            }

            // Update existing items
            foreach ($validated['approvalitems'] as $item) {
                if (!empty($item['id'])) {
                    $postItem = EXPPostItem::find($item['id']);
                    if ($postItem) {
                        $postItem->update([
                            'item_id' => $item['item_id'],
                            'amount'  => $item['amount'],
                            'remarks' => $item['remarks'],
                        ]);
                    }
                }
            }

            // Refresh the relationship to get the current state of items for total calculation
            $approval->load('postitems');
            $calculatedTotal = $approval->postitems->sum('amount');

            // Update the main approval record
            $approval->update([
                'description'       => $validated['description'],
                'facilityoption_id' => $validated['facility_id'],
                'stage'             => $validated['stage'],
                'total'             => $calculatedTotal,
                'user_id'           => Auth::id(), // Or consider a dedicated 'updated_by_id'
            ]);

            // If there are approval remarks, you might want to log them
            // This could be a separate table for approval history/logs
            if (!empty($validated['approval_remarks'])) {
                // Example: Log to a related model or a generic audit trail
                // AuditTrail::log( ... );
            }
        });

        if ($request->stage == 1) {
            return redirect()->route('expenses1.index')->with('success', 'Expense details return successfully.');        
      
        } else {
            return redirect()->route('expenses1.index')->with('success', 'Expense details updated successfully.'); 
            //return redirect()->route('expenses1.edit', $approval->id)->with('success', 'Expense details updated successfully.');

        } 

    }  

     
  
}
