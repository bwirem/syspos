<?php

namespace App\Http\Controllers;

use App\Models\SPR_Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use App\Enums\SupplierType;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;  
use Inertia\Inertia;

class SPR_SupplierController extends Controller
{
    
    
    public function index(Request $request)
    {
        $query = SPR_Supplier::query();
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn($q) => $q->where('company_name', 'like', "%{$search}%")->orWhere('first_name', 'like', "%{$search}%")->orWhere('surname', 'like', "%{$search}%"));
        }
        $suppliers = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('SystemConfiguration/InventorySetup/Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters' => $request->only(['search']),
            'success' => session('success'),
        ]);
    }

    public function create()
    {
        $supplierTypes = collect(SupplierType::cases())->map(fn($type) => ['value' => $type->value, 'label' => $type->label()]);
        return Inertia::render('SystemConfiguration/InventorySetup/Suppliers/Create', [
            'supplierTypes' => $supplierTypes,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_type' => ['required', 'in:' . implode(',', SupplierType::values())],
            'first_name' => 'nullable|string|max:255',
            'surname' => 'nullable|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'email' => 'required|email|max:255|unique:siv_suppliers',
            'phone' => 'nullable|string|max:13',
            'address' => 'nullable|string',
        ]);

        if ($validated['supplier_type'] == SupplierType::INDIVIDUAL->value) {
            Validator::make($request->all(), ['first_name' => 'required', 'surname' => 'required'])->validate();
            $validated['company_name'] = null;
        } else {
            Validator::make($request->all(), ['company_name' => 'required'])->validate();
            $validated['first_name'] = null; $validated['surname'] = null; $validated['other_names'] = null;
        }

        $supplier = SPR_Supplier::create($validated);
        return redirect()->route('systemconfiguration2.suppliers.edit', $supplier)->with('success', 'Supplier created successfully.');
    }

    public function edit(SPR_Supplier $supplier)
    {
        $supplierTypes = collect(SupplierType::cases())->map(fn($type) => ['value' => $type->value, 'label' => $type->label()]);
        return Inertia::render('SystemConfiguration/InventorySetup/Suppliers/Edit', [
            'supplier' => $supplier,
            'supplierTypes' => $supplierTypes,
        ]);
    }

    
    public function update(Request $request, SPR_Supplier $supplier)
    {
        // Define the base validation rules for all fields
        $rules = [
            'supplier_type' => ['required', Rule::in(SupplierType::values())],
            'first_name' => 'nullable|string|max:255',
            'other_names' => 'nullable|string|max:255',
            'surname' => 'nullable|string|max:255',
            'company_name' => 'nullable|string|max:255',
            // Ensure the email is unique, but ignore the current supplier's own email
            'email' => ['required', 'email', 'max:255', Rule::unique('siv_suppliers')->ignore($supplier->id)],
            'phone' => 'nullable|string|max:13',
            'address' => 'nullable|string',
        ];

        // Add conditional 'required' rules based on the selected supplier type
        if ($request->input('supplier_type') === SupplierType::INDIVIDUAL->value) {
            $rules['first_name'] = 'required|string|max:255';
            $rules['surname'] = 'required|string|max:255';
        } else {
            $rules['company_name'] = 'required|string|max:255';
        }

        // Validate the request with the complete set of rules
        $validated = $request->validate($rules);

        // Data Cleaning: After validation, nullify fields that are not relevant
        // to the selected supplier type to ensure data integrity.
        if ($validated['supplier_type'] === SupplierType::INDIVIDUAL->value) {
            $validated['company_name'] = null;
        } else {
            $validated['first_name'] = null;
            $validated['other_names'] = null;
            $validated['surname'] = null;
        }

        // Update the supplier with the validated and cleaned data
        $supplier->update($validated);

        // Redirect back to the edit page with a success message
        return redirect()->route('systemconfiguration2.suppliers.edit', $supplier->id)
                         ->with('success', 'Supplier updated successfully.');
    }

   
    public function destroy(SPR_Supplier $supplier)
    {
        $supplier->delete();
        return redirect()->route('systemconfiguration2.suppliers.index')->with('success', 'Supplier deleted successfully.');
    }  
    
   
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

