<?php

namespace App\Http\Controllers;

use App\Models\FacilityOption;
use Illuminate\Http\Request;

class FacilityOptionController extends Controller
{
    /**
     * Display a listing of FacilityOptions.
     */
    public function index(Request $request)
    {
        $query = FacilityOption::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $facilityoptions = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/FacilitySetup/FacilityOptions/Index', [
            'facilityoptions' => $facilityoptions,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new facilityoption.
     */
    public function create()
    {
        $facilityoption = FacilityOption::first();

        if ($facilityoption) {
            return redirect()->route('systemconfiguration5.facilityoptions.edit', $facilityoption->id);
        }

        return inertia('SystemConfiguration/FacilitySetup/FacilityOptions/Create');
    }


    /**
     * Facilityoption a newly created facilityoption in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Create the facilityoption
        FacilityOption::create([
            'name' => $validated['name'],            
        ]);

        return redirect()->route('systemconfiguration5.facilityoptions.index')
            ->with('success', 'Facilityoption created successfully.');
    }

    /**
     * Show the form for editing the specified facilityoption.
     */
    public function edit(FacilityOption $facilityoption)
    {
        return inertia('SystemConfiguration/FacilitySetup/FacilityOptions/Edit', [
            'facilityoption' => $facilityoption,
        ]);
    }

    /**
     * Update the specified facilityoption in storage.
     */
    public function update(Request $request, FacilityOption $facilityoption)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Update the facilityoption
        $facilityoption->update([
            'name' => $validated['name'],            
        ]);

        return redirect()->route('systemconfiguration5.facilityoptions.index')
            ->with('success', 'Facilityoption updated successfully.');
    }

    
    /**
     * Search for facilityoptions based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $facilityoptions = FacilityOption::where('name', 'like', '%' . $query . '%')->get();

        // Return JSON response instead of an Inertia page
        return response()->json(['facilityoptions' => $facilityoptions]);
    }

}

