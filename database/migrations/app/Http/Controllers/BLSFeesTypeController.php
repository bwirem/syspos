<?php
namespace App\Http\Controllers;

use App\Models\BLSFeesType;
use App\Models\ChartOfAccount;
use Illuminate\Http\Request;

class BLSFeesTypeController extends Controller
{
    /**
     * Display a listing of FeesType.
     */
    public function index(Request $request)
    {
        $query = BLSFeesType::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $feestypes = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/LoanSetup/FeesTypes/Index', [
            'feestypes' => $feestypes,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        $chartofaccounts = ChartOfAccount::all(); // No pagination
        return inertia('SystemConfiguration/LoanSetup/FeesTypes/Create', [
            'chartofaccounts' => $chartofaccounts,
        ]);
    }

    /**
     * Store a newly created item in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'chart_of_account_id' => 'required|exists:chart_of_accounts,id'              
        ]);

        // // Create the item
         BLSFeesType::create($validated);

        return redirect()->route('systemconfiguration0.feestypes.index')
            ->with('success', 'Item created successfully.');
    }

    /**
     * Show the form for editing the specified item.
     */
    public function edit(BLSFeesType $feestype)
    {
        $chartofaccounts = ChartOfAccount::all(); // No pagination
        return inertia('SystemConfiguration/LoanSetup/FeesTypes/Edit', [
            'feestype' => $feestype,
            'chartofaccounts' => $chartofaccounts,
        ]);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(Request $request, BLSFeesType $feestype)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',   
            'amount' => 'required|numeric|min:0',  
            'chart_of_account_id' => 'required|exists:chart_of_accounts,id'
        ]);

        // Update the item
        $feestype->update($validated);

        return redirect()->route('systemconfiguration0.feestypes.index')
            ->with('success', 'Item updated successfully.');
    }

    /**
     * Remove the specified item from storage.
     */
    public function destroy(BLSFeesType $feestype)
    {
        $feestype->delete();

        return redirect()->route('systemconfiguration0.feestypes.index')
            ->with('success', 'Item deleted successfully.');
    }

  
      /**
     * Search for items based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $feestype = BLSFeesType::where('name', 'like', '%' . $query . '%')->get();   

        return response()->json(['feestype' => $feestype]);
    }
   
}

