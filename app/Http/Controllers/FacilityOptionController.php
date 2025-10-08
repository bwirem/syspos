<?php

namespace App\Http\Controllers;

use App\Models\FacilityOption;
use App\Models\ChartOfAccount;
use App\Models\BLSCustomer;
use Illuminate\Http\Request;

class FacilityOptionController extends Controller
{
    /**
     * Display a listing of FacilityOptions.
     */
    public function index(Request $request)
    {
        $query = FacilityOption::query();

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $facilityoptions = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/FacilitySetup/FacilityOptions/Index', [
            'facilityoptions' => $facilityoptions,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new FacilityOption.
     */
    public function create()
    {
        $facilityoption = FacilityOption::first();

        if ($facilityoption) {
            return redirect()->route('systemconfiguration5.facilityoptions.edit', $facilityoption->id);
        }

        // Fetch chart of accounts and customers
        $chartOfAccounts = ChartOfAccount::where('is_active', true)->orderBy('account_name')->get();
        $customers = BLSCustomer::where('customer_type', 'company')->orderBy('company_name')->get();


        return inertia('SystemConfiguration/FacilitySetup/FacilityOptions/Create', [
            'chartOfAccounts' => $chartOfAccounts,
            'customers' => $customers,
        ]);
    }

    /**
     * Store a newly created FacilityOption in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'chart_of_account_id' => 'nullable|integer|exists:chart_of_accounts,id',
            'affectstockatcashier' => 'boolean',
            'doubleentryissuing' => 'boolean',
            'allownegativestock' => 'boolean',
            'default_customer_id' => 'nullable|integer|exists:bls_customers,id',
        ]);

        FacilityOption::create($validated);

        return redirect()->route('systemconfiguration5.facilityoptions.index')
            ->with('success', 'Facility option created successfully.');
    }

    /**
     * Show the form for editing the specified FacilityOption.
     */
    public function edit(FacilityOption $facilityoption)
    {
        $chartOfAccounts = ChartOfAccount::where('is_active', true)->orderBy('account_name')->get();
        $customers = BLSCustomer::where('customer_type', 'company')->orderBy('company_name')->get();

        return inertia('SystemConfiguration/FacilitySetup/FacilityOptions/Edit', [
            'facilityoption' => $facilityoption,
            'chartOfAccounts' => $chartOfAccounts,
            'customers' => $customers,
        ]);
    }

    /**
     * Update the specified FacilityOption in storage.
     */
    public function update(Request $request, FacilityOption $facilityoption)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'chart_of_account_id' => 'nullable|integer|exists:chart_of_accounts,id',
            'affectstockatcashier' => 'boolean',
            'doubleentryissuing' => 'boolean',
            'allownegativestock' => 'boolean',
            'default_customer_id' => 'nullable|integer|exists:bls_customers,id',
        ]);

        $facilityoption->update($validated);

        return redirect()->route('systemconfiguration5.facilityoptions.index')
            ->with('success', 'Facility option updated successfully.');
    }

    /**
     * Search for FacilityOptions based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $facilityoptions = FacilityOption::where('name', 'like', '%' . $query . '%')->get();

        return response()->json(['facilityoptions' => $facilityoptions]);
    }
}
