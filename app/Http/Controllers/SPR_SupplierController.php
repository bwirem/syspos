<?php

namespace App\Http\Controllers;

use App\Models\SPR_Supplier;
use Illuminate\Http\Request;

class SPR_SupplierController extends Controller
{
    /**
     * Display a listing of SPR_Suppliers.
     */
    public function index(Request $request)
    {
        $query = SPR_Supplier::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $suppliers = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/InventorySetup/Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new supplier.
     */
    public function create()
    {
        return inertia('SystemConfiguration/InventorySetup/Suppliers/Create');
    }

    /**
     * store a newly created supplier in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Create the supplier
        SPR_Supplier::create([
            'name' => $validated['name'],            
        ]);

        return redirect()->route('systemconfiguration2.suppliers.index')
            ->with('success', 'Supplier created successfully.');
    }

    /**
     * store a newly created supplier in storage.
     */
    public function directstore(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Create the supplier
        $supplier = SPR_Supplier::create([
            'name' => $validated['name'],            
        ]);

        // Return the created customer as JSON
        return response()->json([
            'id' => $supplier->id,
             'name' => $supplier->name,
        ]);
    }

    

    /**
     * Show the form for editing the specified supplier.
     */
    public function edit(SPR_Supplier $supplier)
    {
        return inertia('SystemConfiguration/InventorySetup/Suppliers/Edit', [
            'supplier' => $supplier,
        ]);
    }

    /**
     * Update the specified supplier in storage.
     */
    public function update(Request $request, SPR_Supplier $supplier)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Update the supplier
        $supplier->update([
            'name' => $validated['name'],            
        ]);

        return redirect()->route('systemconfiguration2.suppliers.index')
            ->with('success', 'Supplier updated successfully.');
    }

    /**
     * Remove the specified supplier from storage.
     */
    public function destroy(SPR_Supplier $supplier)
    {
        $supplier->delete();

        return redirect()->route('systemconfiguration2.suppliers.index')
            ->with('success', 'Supplier deleted successfully.');
    }

    /**
     * Search for suppliers based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $suppliers = SPR_Supplier::where('name', 'like', '%' . $query . '%')->get();

        // Return JSON response instead of an Inertia page
        return response()->json(['suppliers' => $suppliers]);
    }

}

