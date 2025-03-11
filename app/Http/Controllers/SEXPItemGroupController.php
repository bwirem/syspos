<?php
namespace App\Http\Controllers;

use App\Models\SEXPItemGroup
;
use Illuminate\Http\Request;

class SEXPItemGroupController extends Controller
{
    /**
     * Display a listing of itemgroups.
     */
    public function index(Request $request)
    {
        $query = SEXPItemGroup::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $itemgroups = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/ExpensesSetup/ItemGroups/Index', [
            'itemgroups' => $itemgroups,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        return inertia('SystemConfiguration/ExpensesSetup/ItemGroups/Create');
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

        // Create the item
        SEXPItemGroup::create($validated);

        return redirect()->route('systemconfiguration1.itemgroups.index')
            ->with('success', 'Item created successfully.');
    }

    /**
     * Show the form for editing the specified item.
     */
    public function edit(SEXPItemGroup $itemgroup)
    {
        return inertia('SystemConfiguration/ExpensesSetup/ItemGroups/Edit', [
            'itemgroup' => $itemgroup,
        ]);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(Request $request, SEXPItemGroup $itemgroup)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Update the item
        $itemgroup->update($validated);

        return redirect()->route('systemconfiguration1.itemgroups.index')
            ->with('success', 'Item updated successfully.');
    }

    /**
     * Remove the specified item from storage.
     */
    public function destroy(SEXPItemGroup $itemgroup)
    {
        $itemgroup->delete();

        return redirect()->route('systemconfiguration1.itemgroups.index')
            ->with('success', 'Item deleted successfully.');
    }

    /**
     * Search for itemgroups based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');      
        $groups = SEXPItemGroup::where('name', 'like', '%' . $query . '%')->get();

        return response()->json(['groups' => $groups]);
    }
}