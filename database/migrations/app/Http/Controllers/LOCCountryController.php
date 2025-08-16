<?php
namespace App\Http\Controllers;

use App\Models\LOCCountry
;
use Illuminate\Http\Request;

class LOCCountryController extends Controller
{
    /**
     * Display a listing of countries.
     */
    public function index(Request $request)
    {
        $query = LOCCountry::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $countries = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/LocationSetup/Countries/Index', [
            'countries' => $countries,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        return inertia('SystemConfiguration/LocationSetup/Countries/Create');
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
        LOCCountry::create($validated);

        return redirect()->route('systemconfiguration4.countries.index')
            ->with('success', 'Item created successfully.');
    }

    /**
     * Show the form for editing the specified item.
     */
    public function edit(LOCCountry $country)
    {
        return inertia('SystemConfiguration/LocationSetup/Countries/Edit', [
            'country' => $country,
        ]);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(Request $request, LOCCountry $country)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Update the item
        $country->update($validated);

        return redirect()->route('systemconfiguration4.countries.index')
            ->with('success', 'Item updated successfully.');
    }

    /**
     * Remove the specified item from storage.
     */
    public function destroy(LOCCountry $country)
    {
        $country->delete();

        return redirect()->route('systemconfiguration4.countries.index')
            ->with('success', 'Item deleted successfully.');
    }

    /**
     * Search for countries based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');      
        $groups = LOCCountry::where('name', 'like', '%' . $query . '%')->get();

        return response()->json(['groups' => $groups]);
    }
}