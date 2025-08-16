<?php
namespace App\Http\Controllers;

use App\Models\LOCRegion;
use App\Models\LOCDistrict;
use App\Models\LOCWard;
use Illuminate\Http\Request;

class LOCWardController extends Controller
{
    /**
     * Display a listing of wards.
     */
    public function index(Request $request)
    {
        $query = LOCWard::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $wards = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/LocationSetup/Wards/Index', [
            'wards' => $wards,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new ward.
     */
    public function create()
    {
        return inertia('SystemConfiguration/LocationSetup/Wards/Create', [
            'districts' => LOCDistrict::all(),
            'regions' => LOCRegion::all(),
        ]);
    }

    /**
     * Store a newly created ward in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
            'district_id' => 'nullable|exists:loc_districts,id',
        ]);

        // Create the ward
        LOCWard::create($validated);

        return redirect()->route('systemconfiguration4.wards.index')
            ->with('success', 'Ward created successfully.');
    }

    /**
     * Show the form for editing the specified ward.
     */
    public function edit(LOCWard $ward)
    {
        return inertia('SystemConfiguration/LocationSetup/Wards/Edit', [
            'ward' => $ward,
            'districts' => LOCDistrict::all(),
            'regions' => LOCRegion::all(),
        ]);
    }

    /**
     * Update the specified ward in storage.
     */
    public function update(Request $request, LOCWard $ward)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
            'district_id' => 'nullable|exists:loc_districts,id',
        ]);

        // Update the ward
        $ward->update($validated);

        return redirect()->route('systemconfiguration4.wards.index')
            ->with('success', 'Ward updated successfully.');
    }

    /**
     * Remove the specified ward from storage.
     */
    public function destroy(LOCWard $ward)
    {
        $ward->delete();

        return redirect()->route('systemconfiguration4.wards.index')
            ->with('success', 'Ward deleted successfully.');
    }

    /**
     * Search for wards based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        //$wards = LOCWard::where('name', 'like', '%' . $query . '%')->get();
        $wards = LOCWard::where('name', 'like', '%' . $query . '%')->get();

        return response()->json(['wards' => $wards]);
    }
}