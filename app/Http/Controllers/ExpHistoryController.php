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


class ExpHistoryController extends Controller
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
         
         $query->where('stage', '>', '2');
     
         // Paginate and sort historys
         $historys = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('ExpHistory/Index', [
             'historys' => $historys,
             'filters' => $request->only(['search']),
         ]);
     }
     

    /**
     * Show the form for editing the specified history.
     */
    public function edit(EXPPost $history)
    {

        // Eager load history items and their related items
        $history->load(['facilityoption', 'postitems.item']);        

        return inertia('ExpHistory/History', [
            'history' => $history,
        ]);
    }   

     
  
}
