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
     
         // Filtering by stage (Ensure 'stage' exists in the EXPPost model)
         if ($request->filled('stage')) {
             $query->where('stage', $request->stage);
         }

         $query->where('stage', '<=', '2');
     
         // Paginate and sort posts
         $posts = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('ExpPost/Index', [
             'posts' => $posts,
             'filters' => $request->only(['search', 'stage']),
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
              'description' => 'nullable|string|max:255', //validate store id          
              'facility_id' => 'required|exists:facilityoptions,id', //validate store id       
              'stage' => 'required|integer|min:1',
              'postitems' => 'required|array',
              'postitems.*.item_id' => 'required|exists:sexp_items,id',  
              'postitems.*.amount' => 'required|numeric|min:0', 
              'postitems.*.remarks' => 'nullable|string|max:255',            
         ]);

     
         // Begin database transaction
         DB::transaction(function () use ($validated) {
            
             $transdate = Carbon::now(); 
             $post = EXPPost::create([
                 'transdate' => $transdate,
                 'description' => $validated['description'],
                 'facilityoption_id' => $validated['facility_id'],
                 'stage' => $validated['stage'], 
                 'total' => 0,            
                 'user_id' => Auth::id(),
             ]);    
     
             // Create associated post items
             foreach ($validated['postitems'] as $item) {
                 $post->postitems()->create([
                     'item_id' => $item['item_id'],
                     'amount' => $item['amount'],
                     'remarks' => $item['remarks'],                     
                 ]);
             }    
             
                // Reload the relationship to ensure all items are fetched
                $post->load('postitems');

                // Compute the total based on updated post items
                $calculatedTotal = $post->postitems->sum(fn($item) => $item->quantity * $item->price);
        
                // Update post with the correct total
                $post->update(['total' => $calculatedTotal]);
           
         });
     
         return redirect()->route('expenses0.index')->with('success', 'Post created successfully.');
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
             'postitems.*.id' => 'nullable|exists:pro_postitems,id',
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
