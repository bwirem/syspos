<?php

namespace App\Http\Controllers;

use App\Models\SIV_Store;
use Illuminate\Http\Request;

class SIV_StoreController extends Controller
{
    /**
     * Display a listing of SIV_Stores.
     */
    public function index(Request $request)
    {
        $query = SIV_Store::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $stores = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/InventorySetup/Stores/Index', [
            'stores' => $stores,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new store.
     */
    public function create()
    {
        return inertia('SystemConfiguration/InventorySetup/Stores/Create');
    }

    /**
     * Store a newly created store in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Create the store
        SIV_Store::create([
            'name' => $validated['name'],            
        ]);

        return redirect()->route('systemconfiguration2.stores.index')
            ->with('success', 'Store created successfully.');
    }

    /**
     * Show the form for editing the specified store.
     */
    public function edit(SIV_Store $store)
    {
        return inertia('SystemConfiguration/InventorySetup/Stores/Edit', [
            'store' => $store,
        ]);
    }

    /**
     * Update the specified store in storage.
     */
    public function update(Request $request, SIV_Store $store)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Update the store
        $store->update([
            'name' => $validated['name'],            
        ]);

        return redirect()->route('systemconfiguration2.stores.index')
            ->with('success', 'Store updated successfully.');
    }

    /**
     * Remove the specified store from storage.
     */
    public function destroy(SIV_Store $store)
    {
        $store->delete();

        return redirect()->route('systemconfiguration2.stores.index')
            ->with('success', 'Store deleted successfully.');
    }

    /**
     * Search for stores based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $stores = SIV_Store::where('name', 'like', '%' . $query . '%')->get();

        // Return JSON response instead of an Inertia page
        return response()->json(['stores' => $stores]);
    }

}

