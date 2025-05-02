<?php

namespace App\Http\Controllers;

use App\Models\SPR_Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use App\Enums\SupplierType;
use Illuminate\Support\Facades\Log;

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
        // Validate input using enum values
        $validated = $request->validate([
            'supplier_type' => ['required', 'in:' . implode(',', SupplierType::values())],
            'first_name' => 'nullable|string|max:255',
            'other_names' => 'nullable|string|max:255',
            'surname' => 'nullable|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'required|email|max:255|unique:siv_suppliers',
            'phone' => 'nullable|string|max:13',            
        ]);

        // Ensure either individual or company fields are filled, but not both
        if ($validated['supplier_type'] == SupplierType::INDIVIDUAL->value) {
            Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'surname' => 'required|string|max:255',
                'company_name' => 'sometimes|nullable',
            ])->validate();
            $validated['company_name'] = null; // Ensure company_name is null
        } else {
            Validator::make($request->all(), [
                'company_name' => 'required|string|max:255',
                'first_name' => 'sometimes|nullable',
                'surname' => 'sometimes|nullable',
                'other_names' => 'sometimes|nullable',
            ])->validate();
            $validated['first_name'] = null;
            $validated['other_names'] = null;
            $validated['surname'] = null; // Ensure individual fields are null
        }

        // Create the supplier
        $supplier = SPR_Supplier::create($validated);

        // Return the created supplier as JSON
        return response()->json([
            'id' => $supplier->id,
            'supplier_type' => $supplier->supplier_type,
            'first_name' => $supplier->first_name,
            'other_names' => $supplier->other_names,
            'surname' => $supplier->surname,
            'company_name' => $supplier->company_name,
            'email' => $supplier->email,
            'phone' => $supplier->phone,
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
        $suppliers = SPR_Supplier::where('first_name', 'like', '%' . $query . '%')
            ->orWhere('other_names', 'like', '%' . $query . '%')
            ->orWhere('surname', 'like', '%' . $query . '%')
            ->orWhere('company_name', 'like', '%' . $query . '%')
            ->get();

        // Return JSON response instead of an Inertia page
        return response()->json(['suppliers' => $suppliers]);
    }

}

