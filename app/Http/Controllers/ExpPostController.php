<?php

namespace App\Http\Controllers;

use App\Models\EXPPost;
use App\Models\EXPPostItem;
use App\Models\FacilityOption;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Throwable;
use Illuminate\Support\Facades\Inertia;
use Illuminate\Support\Facades\Log;


class ExpPostController extends Controller
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
         
         $query->where('stage', '=', '1');
     
         // Paginate and sort posts
         $posts = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('ExpPost/Index', [
             'posts' => $posts,
             'filters' => $request->only(['search']),
         ]);
     }
     

    /**
     * Show the form for creating a new post.
     */
    public function create()
    {
        $facilityoption = FacilityOption::first();      
        return inertia('ExpPost/Create',[
            'facilityoption'=>$facilityoption,
        ]);
    }

    /**
     * Store a newly created post in storage.
     */
    
   
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'description' => 'nullable|string|max:255',
            'facility_id' => 'required|exists:facilityoptions,id', // Validate against facilityoptions table
            'stage'       => 'required|integer|min:1',
            'postitems'   => 'required|array|min:1', // Ensure at least one item
            'postitems.*.item_id' => 'required|exists:sexp_items,id', // Validate against sexp_items table
            'postitems.*.amount'  => 'required|numeric|min:0.01', // Minimum amount, adjust if 0 is allowed
            'postitems.*.remarks' => 'nullable|string|max:255',
        ]);

        $post = null; // Initialize post variable outside the transaction scope

        try {
            // Begin database transaction
            DB::transaction(function () use ($validated, &$post) { // Pass $post by reference
                // 1. Calculate total from validated items
                $calculatedTotal = 0;
                foreach ($validated['postitems'] as $item) {
                    $calculatedTotal += (float) $item['amount'];
                }

                // 2. Create the main EXPPost record
                $post = EXPPost::create([
                    'transdate'         => Carbon::now(),
                    'description'       => $validated['description'],
                    'facilityoption_id' => $validated['facility_id'], // Assuming DB column is facilityoption_id
                    'stage'             => $validated['stage'],
                    'total'             => $calculatedTotal, // Use pre-calculated total
                    'user_id'           => Auth::id(),
                ]);

                // 3. Create associated post items
                // Prepare items for createMany for efficiency if your relationship supports it
                $itemsToCreate = [];
                foreach ($validated['postitems'] as $itemData) {
                    $itemsToCreate[] = [
                        // 'exp_post_id' will be handled by the relationship if using createMany on it
                        'item_id' => $itemData['item_id'],
                        'amount'  => $itemData['amount'],
                        'remarks' => $itemData['remarks'],
                        // exp_post_id will be set automatically by createMany
                    ];
                }
                $post->postitems()->createMany($itemsToCreate);

                // No need to reload and update total again as it's calculated and set during creation.
            });

            // If the transaction was successful and $post is set
            if ($post) {
                return redirect()->route('expenses0.edit', $post->id)
                                 ->with('success', 'Expense created successfully and saved as draft. You can now review or submit it.');
            } else {
                // This case should ideally not be reached if transaction fails, as an exception would be thrown.
                // But as a fallback.
                return back()->withInput()->with('error', 'Failed to create expense due to an unexpected issue.');
            }

        } catch (Throwable $e) { // Catch any throwable, including ValidationException, QueryException etc.
            // Log the error for debugging
            \Log::error('Expense creation failed: ' . $e->getMessage() . ' Stack: ' . $e->getTraceAsString());

            // Redirect back with input and a generic error message
            // You can customize the error message based on the exception type if needed
            return back()->withInput()->with('error', 'Failed to create expense. Please check your input and try again. Details: ' . $e->getMessage());
        }
    }


    /**
     * Show the form for editing the specified post.
     */
    public function edit(EXPPost $post)
    {

        // Eager load post items and their related items
        $post->load(['facilityoption', 'postitems.item']);        

        return inertia('ExpPost/Edit', [
            'post' => $post,
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
     
     
    
    /**
     * Remove the specified post from storage.
     */
    public function destroy(EXPPost $post)
    {
        // Delete the post and associated items
        $post->postitems()->delete();
        $post->delete();

        return redirect()->route('expenses0.index')
            ->with('success', 'Post deleted successfully.');
    }
}
