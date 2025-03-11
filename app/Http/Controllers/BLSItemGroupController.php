<?php
namespace App\Http\Controllers;

use App\Models\BLSItemGroup;
use Illuminate\Http\Request;

class BLSItemGroupController extends Controller
{
    /**
     * Display a listing of itemgroups.
     */
    public function index(Request $request)
    {
        $query = BLSItemGroup::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $itemgroups = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/BillingSetup/ItemGroups/Index', [
            'itemgroups' => $itemgroups,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        return inertia('SystemConfiguration/BillingSetup/ItemGroups/Create');
    }

    /**
     * Store a newly created item in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // // Create the item
         BLSItemGroup::create($validated);

        return redirect()->route('systemconfiguration0.itemgroups.index')
            ->with('success', 'Item created successfully.');
    }

    /**
     * Show the form for editing the specified item.
     */
    public function edit(BLSItemGroup $itemgroup)
    {
        return inertia('SystemConfiguration/BillingSetup/ItemGroups/Edit', [
            'itemgroup' => $itemgroup,
        ]);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(Request $request, BLSItemGroup $itemgroup)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',           
        ]);

        // Update the item
        $itemgroup->update($validated);

        return redirect()->route('systemconfiguration0.itemgroups.index')
            ->with('success', 'Item updated successfully.');
    }

    /**
     * Remove the specified item from storage.
     */
    public function destroy(BLSItemGroup $itemgroup)
    {
        $itemgroup->delete();

        return redirect()->route('systemconfiguration0.itemgroups.index')
            ->with('success', 'Item deleted successfully.');
    }

  
      /**
     * Search for items based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $groups = BLSItemGroup::where('name', 'like', '%' . $query . '%')->get();   

        return response()->json(['groups' => $groups]);
    }
   
}

