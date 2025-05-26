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
         
         $query->where('stage', '>', '1');
     
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

     public function update(Request $request, EXPPost $post)
     {
        
         // Validate input
         $validated = $request->validate([             
             'description' => 'nullable|string|max:255',            
             'facility_id' => 'required|exists:facilityoptions,id',            
             'stage' => 'required|integer|min:1',
             'postitems' => 'required|array',
             'postitems.*.id' => 'nullable|exists:exp_expensepostitems,id',
             'postitems.*.item_id' => 'required|exists:sexp_items,id',
             'postitems.*.amount' => 'required|numeric|min:0',  
             'postitems.*.remarks' => 'nullable|string|max:255',            
         ]);
     
         // Update the post within a transaction
         DB::transaction(function () use ($validated, $post) {
             // Retrieve existing item IDs before the update
             $oldItemIds = $post->postitems()->pluck('id')->toArray();
             
             $existingItemIds = [];
             $newItems = [];
     
             foreach ($validated['postitems'] as $item) {
                 if (!empty($item['id'])) {
                     $existingItemIds[] = $item['id'];
                 } else {
                     $newItems[] = $item;
                 }
             }
     
             // Identify and delete removed items
             $itemsToDelete = array_diff($oldItemIds, $existingItemIds);
             $post->postitems()->whereIn('id', $itemsToDelete)->delete();
     
             // Add new items
             foreach ($newItems as $item) {
                 $post->postitems()->create([
                     'item_id' => $item['item_id'],
                     'amount' => $item['amount'],
                     'remarks' => $item['remarks'],                   
                 ]);
             }
     
             // Update existing items
             foreach ($validated['postitems'] as $item) {
                 if (!empty($item['id'])) {
                     $postItem = EXPPostItem::find($item['id']);
     
                     if ($postItem) {
                         $postItem->update([
                             'item_id' => $item['item_id'],
                             'amount' => $item['amount'],  
                             'remarks' => $item['remarks'],                        
                         ]);
                     }
                 }
             }

             // Compute the total based on updated post items
             $calculatedTotal = $post->postitems->sum(fn($item) => $item->quantity * $item->price);
          
             // Update the post details
             $post->update([                 
                 'description' => $validated['description'],
                 'facilityoption_id' => $validated['facility_id'],
                 'stage' => $validated['stage'], 
                 'total' => $calculatedTotal,              
                 'user_id' => Auth::id(),
             ]);
         });
     
         return redirect()->route('expenses0.index')->with('success', 'Post updated successfully.');
     }
     
  
}
