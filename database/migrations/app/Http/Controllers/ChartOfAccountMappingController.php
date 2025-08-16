<?php

namespace App\Http\Controllers;

use App\Models\ChartOfAccount;
use App\Models\ChartOfAccountMapping;
use Illuminate\Http\Request;

class ChartOfAccountMappingController extends Controller
{
    /**
     * Display a listing of ChartOfAccountsMapping.
     */

    public function index(Request $request)
    {
        $chartofaccountsmapping = ChartOfAccountMapping::orderBy('created_at', 'desc')->paginate(10);
        $chartofaccounts = ChartOfAccount::all(); // No pagination
    
        return inertia('SystemConfiguration/AccountSetup/ChartOfAccountsMapping/Index', [
            'chartofaccountsmapping' => $chartofaccountsmapping,
            'chartofaccounts' => $chartofaccounts,
        ]);
    }    


    /**
     * Show the form for creating a new ChartOfAccountMapping.
     */
    public function create()
    {
        // Check if a mapping already exists
        $chartofaccountsmapping = ChartOfAccountMapping::first();

        if ($chartofaccountsmapping) {
            // Redirect to the edit route if one exists
            return redirect()->route('systemconfiguration3.chartofaccountmappings.edit');
        }

        // Otherwise, show the creation form
        $chartofaccounts = ChartOfAccount::all();

        return inertia('SystemConfiguration/AccountSetup/ChartOfAccountsMapping/Create', [
            'chartofaccounts' => $chartofaccounts,
        ]);
    }


    /**
     * Store a newly created ChartOfAccountMapping in storage.
     */
    public function store(Request $request)
    {
        // Check if a row already exists
        $existingMapping = ChartOfAccountMapping::first();

        if ($existingMapping) {
            return redirect()
                ->route('systemconfiguration3.chartofaccountmappings.edit')
                ->with('info', 'Chart of account mapping already exists. You can only update it.');
        }

        // Validate input
        $validated = $request->validate([
            'customer_loan_code' => 'required|string|max:255',
            'customer_loan_interest_code' => 'required|string|max:255',
            'customer_deposit_code' => 'required|string|max:255',
        ]);

        // Create the chart of account mapping
        ChartOfAccountMapping::create($validated);

        return redirect()
            ->route('systemconfiguration3.chartofaccountmappings.index')
            ->with('success', 'Chart of account mapping created successfully.');
    }

    /**
     * Show the form for editing the specified ChartOfAccountMapping.
     */
    public function edit()
    {
        $chartofaccountsmapping = ChartOfAccountMapping::first();
        $chartofaccounts = ChartOfAccount::all();

        return inertia('SystemConfiguration/AccountSetup/ChartOfAccountsMapping/Edit', [
            'chartofaccountsmapping' => $chartofaccountsmapping,
            'chartofaccounts' => $chartofaccounts,
        ]);
    }


    /**
     * Update the specified ChartOfAccountMapping in storage.
     */
    
    public function update(Request $request)
    {
        $validated = $request->validate([
            'customer_loan_code' => 'required|string|max:255',
            'customer_loan_interest_code' => 'required|string|max:255',
            'customer_deposit_code' => 'required|string|max:255',
        ]);

        // Get the only mapping record
        $chartofaccountsmapping = ChartOfAccountMapping::first();

        if ($chartofaccountsmapping) {
            $chartofaccountsmapping->update($validated);
        }

        return redirect()->route('systemconfiguration3.chartofaccountmappings.index')
            ->with('success', 'Chart of account mapping updated successfully.');
    }
    
}
