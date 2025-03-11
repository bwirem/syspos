<?php
namespace App\Http\Controllers;

use App\Models\LOCDistrict
;
use Illuminate\Http\Request;

class LOCDistrictController extends Controller
{
    /**
     * Display a listing of districts.
     */
    public function index(Request $request)
    {
        $query = LOCDistrict::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $districts = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/LocationSetup/Districts/Index', [
            'districts' => $districts,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new district.
     */
    public function create()
    {
        return inertia('SystemConfiguration/LocationSetup/Districts/Create');
    }

    /**
     * Store a newly created district in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
            'districtgroup_id' => 'nullable|exists:sexp_districtgroups,id',
        ]);

        // Create the district
        LOCDistrict::create($validated);

        return redirect()->route('systemconfiguration3.districts.index')
            ->with('success', 'District created successfully.');
    }

    /**
     * Show the form for editing the specified district.
     */
    public function edit(LOCDistrict $district)
    {
        return inertia('SystemConfiguration/LocationSetup/Districts/Edit', [
            'district' => $district,
        ]);
    }

    /**
     * Update the specified district in storage.
     */
    public function update(Request $request, LOCDistrict $district)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
            'districtgroup_id' => 'nullable|exists:sexp_districtgroups,id',
        ]);

        // Update the district
        $district->update($validated);

        return redirect()->route('systemconfiguration3.districts.index')
            ->with('success', 'District updated successfully.');
    }

    /**
     * Remove the specified district from storage.
     */
    public function destroy(LOCDistrict $district)
    {
        $district->delete();

        return redirect()->route('systemconfiguration3.districts.index')
            ->with('success', 'District deleted successfully.');
    }

    /**
     * Search for districts based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        //$districts = LOCDistrict::where('name', 'like', '%' . $query . '%')->get();
        $districts = LOCDistrict::where('name', 'like', '%' . $query . '%')->get();

        return response()->json(['districts' => $districts]);
    }
}