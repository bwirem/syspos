<?php
namespace App\Http\Controllers;

use App\Models\LOCRegion;
use App\Models\LOCDistrict;
use App\Models\LOCWard;
use App\Models\LOCStreet;
use Illuminate\Http\Request;

class LOCStreetController extends Controller
{
    /**
     * Display a listing of streets.
     */
    public function index(Request $request)
    {
        $query = LOCStreet::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $streets = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/LocationSetup/Streets/Index', [
            'streets' => $streets,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new street.
     */
    public function create()
    {
        return inertia('SystemConfiguration/LocationSetup/Streets/Create', [
            'regions' => LOCRegion::all(),
            'districts' => LOCDistrict::all(),
            'wards' => LOCWard::all(),
        ]);
    }

    /**
     * Store a newly created street in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
            'ward_id' => 'nullable|exists:loc_wards,id',
        ]);

        // Create the street
        LOCStreet::create($validated);

        return redirect()->route('systemconfiguration4.streets.index')
            ->with('success', 'Street created successfully.');
    }

    /**
     * Show the form for editing the specified street.
     */
    public function edit(LOCStreet $street)
    {
        return inertia('SystemConfiguration/LocationSetup/Streets/Edit', [
            'street' => $street,
            'regions' => LOCRegion::all(),
            'districts' => LOCDistrict::all(),
            'wards' => LOCWard::all(),
        ]);
    }

    /**
     * Update the specified street in storage.
     */
    public function update(Request $request, LOCStreet $street)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
            'ward_id' => 'nullable|exists:loc_wards,id',
        ]);

        // Update the street
        $street->update($validated);

        return redirect()->route('systemconfiguration4.streets.index')
            ->with('success', 'Street updated successfully.');
    }

    /**
     * Remove the specified street from storage.
     */
    public function destroy(LOCStreet $street)
    {
        $street->delete();

        return redirect()->route('systemconfiguration4.streets.index')
            ->with('success', 'Street deleted successfully.');
    }

    /**
     * Search for streets based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        //$streets = LOCStreet::where('name', 'like', '%' . $query . '%')->get();
        $streets = LOCStreet::where('name', 'like', '%' . $query . '%')->get();

        return response()->json(['streets' => $streets]);
    }
}