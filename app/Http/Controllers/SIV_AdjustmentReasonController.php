<?php

namespace App\Http\Controllers;

use App\Models\SIV_AdjustmentReason;
use Illuminate\Http\Request;

class SIV_AdjustmentReasonController extends Controller
{
    /**
     * Display a listing of SIV_AdjustmentReasons.
     */
    public function index(Request $request)
    {
        $query = SIV_AdjustmentReason::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $adjustmentreasons = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/InventorySetup/AdjustmentReasons/Index', [
            'adjustmentreasons' => $adjustmentreasons,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new adjustmentreason.
     */
    public function create()
    {
        return inertia('SystemConfiguration/InventorySetup/AdjustmentReasons/Create');
    }

    /**
     * AdjustmentReason a newly created adjustmentreason in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Create the adjustmentreason
        SIV_AdjustmentReason::create([
            'name' => $validated['name'],            
        ]);

        return redirect()->route('systemconfiguration2.adjustmentreasons.index')
            ->with('success', 'AdjustmentReason created successfully.');
    }

    /**
     * Show the form for editing the specified adjustmentreason.
     */
    public function edit(SIV_AdjustmentReason $adjustmentreason)
    {
        return inertia('SystemConfiguration/InventorySetup/AdjustmentReasons/Edit', [
            'adjustmentreason' => $adjustmentreason,
        ]);
    }

    /**
     * Update the specified adjustmentreason in storage.
     */
    public function update(Request $request, SIV_AdjustmentReason $adjustmentreason)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Update the adjustmentreason
        $adjustmentreason->update([
            'name' => $validated['name'],            
        ]);

        return redirect()->route('systemconfiguration2.adjustmentreasons.index')
            ->with('success', 'AdjustmentReason updated successfully.');
    }

    /**
     * Remove the specified adjustmentreason from storage.
     */
    public function destroy(SIV_AdjustmentReason $adjustmentreason)
    {
        $adjustmentreason->delete();

        return redirect()->route('systemconfiguration2.adjustmentreasons.index')
            ->with('success', 'AdjustmentReason deleted successfully.');
    }

    /**
     * Search for adjustmentreasons based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $adjustmentreasons = SIV_AdjustmentReason::where('name', 'like', '%' . $query . '%')->get();

        // Return JSON response instead of an Inertia page
        return response()->json(['adjustmentreasons' => $adjustmentreasons]);
    }

}

