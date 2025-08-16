<?php
namespace App\Http\Controllers;

use App\Models\LOCRegion
;
use Illuminate\Http\Request;

class LOCRegionController extends Controller
{
    /**
     * Display a listing of regions.
     */
    public function index(Request $request)
    {
        $query = LOCRegion::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $regions = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/LocationSetup/Regions/Index', [
            'regions' => $regions,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        return inertia('SystemConfiguration/LocationSetup/Regions/Create');
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
        LOCRegion::create($validated);

        return redirect()->route('systemconfiguration4.regions.index')
            ->with('success', 'Item created successfully.');
    }

    /**
     * Show the form for editing the specified item.
     */
    public function edit(LOCRegion $region)
    {
        return inertia('SystemConfiguration/LocationSetup/Regions/Edit', [
            'region' => $region,
        ]);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(Request $request, LOCRegion $region)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Update the item
        $region->update($validated);

        return redirect()->route('systemconfiguration4.regions.index')
            ->with('success', 'Item updated successfully.');
    }

    /**
     * Remove the specified item from storage.
     */
    public function destroy(LOCRegion $region)
    {
        $region->delete();

        return redirect()->route('systemconfiguration4.regions.index')
            ->with('success', 'Item deleted successfully.');
    }

    /**
     * Search for regions based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');      
        $groups = LOCRegion::where('name', 'like', '%' . $query . '%')->get();

        return response()->json(['groups' => $groups]);
    }
}