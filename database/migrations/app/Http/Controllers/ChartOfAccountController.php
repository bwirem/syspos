<?php

namespace App\Http\Controllers;

use App\Models\ChartOfAccount;
use App\Enums\AccountType; // Make sure to import your enum
use Illuminate\Http\Request;

class ChartOfAccountController extends Controller
{
    /**
     * Display a listing of ChartOfAccounts.
     */
    public function index(Request $request)
    {
        $query = ChartOfAccount::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('account_name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $chartofaccounts = $query->orderBy('created_at', 'desc')->paginate(10);

        // Prepare account type labels
        $accountTypeLabels = [];
        foreach (AccountType::cases() as $type) {
            $accountTypeLabels[$type->value] = $type->name; // Using the enum name
        }

        return inertia('SystemConfiguration/AccountSetup/ChartOfAccounts/Index', [
            'chartofaccounts' => $chartofaccounts,
            'filters' => $request->only(['search']),
            'accountTypeLabels' => $accountTypeLabels, // Add labels to the response
        ]);
    }

    /**
     * Show the form for creating a new chartofaccount.
     */
    public function create()
    {
        // Prepare account type labels
        $accountTypeLabels = [];
        foreach (AccountType::cases() as $type) {
            $accountTypeLabels[$type->value] = $type->name; // Using the enum name
        }
        
        return inertia('SystemConfiguration/AccountSetup/ChartOfAccounts/Create', [
            'accountTypeLabels' => $accountTypeLabels, // Pass the labels to the view
        ]);
    }    

    /**
     * Store a newly created chartofaccount in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'account_name' => 'required|string|max:255',
            'account_code' => 'required|string|max:50|unique:chart_of_accounts,account_code', // Ensure unique account code
            'account_type' => 'required|in:' . implode(',', array_column(AccountType::cases(), 'value')),
            'description' => 'nullable|string|max:500', // Optional description
            'is_active' => 'boolean',
        ]);

        // Create the chartofaccount
        ChartOfAccount::create([
            'account_name' => $validated['account_name'],
            'account_code' => $validated['account_code'],
            'account_type' => $validated['account_type'],
            'description' => $validated['description'],
            'is_active' => $validated['is_active'],
        ]);

        return redirect()->route('systemconfiguration3.chartofaccounts.index')
            ->with('success', 'Chart of account created successfully.');
    }


    /**
     * Show the form for editing the specified chartofaccount.
     */
    public function edit(ChartOfAccount $chartofaccount)
    {
        // Prepare account type labels
        $accountTypeLabels = [];
        foreach (AccountType::cases() as $type) {
            $accountTypeLabels[$type->value] = $type->name; // Using the enum name
        }

        return inertia('SystemConfiguration/AccountSetup/ChartOfAccounts/Edit', [
            'chartofaccount' => $chartofaccount,
            'accountTypeLabels' => $accountTypeLabels, // Pass labels to the view
        ]);
    }

    /**
     * Update the specified chartofaccount in storage.
     */
    public function update(Request $request, ChartOfAccount $chartofaccount)
    {
        // Validate input
        $validated = $request->validate([
            'account_name' => 'required|string|max:255',
            'account_code' => 'required|string|max:50|unique:chart_of_accounts,account_code,' . $chartofaccount->id, // Ensure unique, ignoring current record
            'account_type' => 'required|in:' . implode(',', array_column(AccountType::cases(), 'value')),
            'description' => 'nullable|string|max:500', // Optional description
            'is_active' => 'boolean',
        ]);

        // Update the chartofaccount
        $chartofaccount->update([
            'account_name' => $validated['account_name'],
            'account_code' => $validated['account_code'],
            'account_type' => $validated['account_type'],
            'description' => $validated['description'],
            'is_active' => $validated['is_active'],
        ]);

        return redirect()->route('systemconfiguration3.chartofaccounts.index')
            ->with('success', 'Chart of account updated successfully.');
    }   

    /**
     * Remove the specified chartofaccount from storage.
     */
    public function destroy(ChartOfAccount $chartofaccount)
    {
        $chartofaccount->delete();

        return redirect()->route('systemconfiguration3.chartofaccounts.index')
            ->with('success', 'Chart of account deleted successfully.');
    }

    /**
     * Search for chartofaccounts based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $chartofaccounts = ChartOfAccount::where('account_name', 'like', '%' . $query . '%')->get();

        // Return JSON response instead of an Inertia page
        return response()->json(['chartofaccounts' => $chartofaccounts]);
    }
}
