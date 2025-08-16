<?php

namespace App\Http\Controllers;

use App\Models\FacilityBranch;
use App\Models\FacilityOption;
use Illuminate\Http\Request;

class FacilityBranchController extends Controller
{
    /**
     * Display a listing of FacilityBranchs.
     */
    public function index(Request $request)
    {
        $query = FacilityBranch::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $facilitybranches = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/FacilitySetup/FacilityBranches/Index', [
            'facilitybranches' => $facilitybranches,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new facilitybranch.
     */
    public function create()
    {
        return inertia('SystemConfiguration/FacilitySetup/FacilityBranches/Create', [
            'facilityoptions' => FacilityOption::all(),
        ]);
    }

    /**
     * FacilityBranch a newly created facilitybranch in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',  
            'facilityoption_id' => 'required|exists:facilityoptions,id',      
        ]);

        // Create the facilitybranch
        FacilityBranch::create([
            'name' => $validated['name'],  
            'facilityoption_id' => $validated['facilityoption_id'],          
        ]);

        return redirect()->route('systemconfiguration5.facilitybranches.index')
            ->with('success', 'FacilityBranch created successfully.');
    }

    /**
     * Show the form for editing the specified facilitybranch.
     */
    public function edit(FacilityBranch $facilitybranch)
    {
        return inertia('SystemConfiguration/FacilitySetup/FacilityBranches/Edit', [
            'facilitybranch' => $facilitybranch,
            'facilityoptions' => FacilityOption::all(),
        ]);
    }

    /**
     * Update the specified facilitybranch in storage.
     */
    public function update(Request $request, FacilityBranch $facilitybranch)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',  
            'facilityoption_id' => 'required|exists:facilityoptions,id',                
        ]);

        // Update the facilitybranch
        $facilitybranch->update([
            'name' => $validated['name'],
            'facilityoption_id' => $validated['facilityoption_id'],                
        ]);

        return redirect()->route('systemconfiguration5.facilitybranches.index')
            ->with('success', 'FacilityBranch updated successfully.');
    }

    /**
     * Remove the specified facilitybranch from storage.
     */
    public function destroy(FacilityBranch $facilitybranch)
    {
        $facilitybranch->delete();

        return redirect()->route('systemconfiguration5.facilitybranches.index')
            ->with('success', 'FacilityBranch deleted successfully.');
    }

    /**
     * Search for facilitybranches based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $facilitybranches = FacilityBranch::where('name', 'like', '%' . $query . '%')->get();

        // Return JSON response instead of an Inertia page
        return response()->json(['facilitybranches' => $facilitybranches]);
    }

}

