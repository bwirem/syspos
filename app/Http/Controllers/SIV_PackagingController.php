<?php
namespace App\Http\Controllers;

use App\Models\SIV_Packaging;
use App\Models\SIV_Product;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class SIV_PackagingController extends Controller
{
    /**
     * Display a listing of units.
     */
    public function index(Request $request)
    {
        $query = SIV_Packaging::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $units = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/InventorySetup/Units/Index', [
            'units' => $units,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new unit.
     */
    public function create()
    {
        return inertia('SystemConfiguration/InventorySetup/Units/Create');
    }

    /**
     * Store a newly created unit in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'pieces' => 'required|numeric|min:0',            
        ]);

        // Create the unit
        SIV_Packaging::create($validated);

        return redirect()->route('systemconfiguration2.units.index')
            ->with('success', 'Unit created successfully.');
    }

    /**
     * Show the form for editing the specified unit.
     */
    public function edit(SIV_Packaging $unit)
    {
        return inertia('SystemConfiguration/InventorySetup/Units/Edit', [
            'unit' => $unit,
        ]);
    }

    /**
     * Update the specified unit in storage.
     */
    public function update(Request $request, SIV_Packaging $unit)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'pieces' => 'required|numeric|min:0',            
        ]);

        // Update the unit
        $unit->update($validated);

        return redirect()->route('systemconfiguration2.units.index')
            ->with('success', 'Unit updated successfully.');
    }

    /**
     * Remove the specified unit from storage.
     */
    
    public function destroy(SIV_Packaging $unit)
    {
        // Check if any product is currently using this packaging/unit
        if (SIV_Product::where('package_id', $unit->id)->exists()) {
            return redirect()->route('systemconfiguration2.units.index')
                ->with('error', 'Unable to delete: This unit is assigned to one or more products.');
        }

        try {
            $unit->delete();
        } catch (QueryException $e) {
            // Handles database-level Foreign Key constraints
            return redirect()->route('systemconfiguration2.units.index')
                ->with('error', 'Unable to delete: Database integrity constraint violation.');
        }

        return redirect()->route('systemconfiguration2.units.index')
            ->with('success', 'Unit deleted successfully.');
    }
    /**
     * Search for units based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $units = SIV_Packaging::where('name', 'like', '%' . $query . '%')->get();
        return response()->json(['units' => $units]);
    }
}

