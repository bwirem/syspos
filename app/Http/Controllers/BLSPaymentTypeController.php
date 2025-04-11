<?php
namespace App\Http\Controllers;

use App\Models\BLSPaymentType;
use App\Models\ChartOfAccount;
use Illuminate\Http\Request;

class BLSPaymentTypeController extends Controller
{
    /**
     * Display a listing of paymenttypes.
     */
    public function index(Request $request)
    {
        $query = BLSPaymentType::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $paymenttypes = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/BillingSetup/PaymentTypes/Index', [
            'paymenttypes' => $paymenttypes,
            'filters' => $request->only(['search']),
        ]);
    }


    /**
     * Show the form for creating a new paymenttype.
     */
    public function create()
    {
        $chartofaccounts = ChartOfAccount::all(); // No pagination
        return inertia('SystemConfiguration/BillingSetup/PaymentTypes/Create', [
            'chartofaccounts' => $chartofaccounts,
        ]);
    }

    /**
     * Store a newly created paymenttype in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',   
            'chart_of_account_id' => 'required|exists:chart_of_accounts,id',            
        ]);

        // Create the paymenttype
        BLSPaymentType::create($validated);

        return redirect()->route('systemconfiguration0.paymenttypes.index')
            ->with('success', 'Paymenttype created successfully.');
    }

    /**
     * Show the form for editing the specified paymenttype.
     */
    public function edit(BLSPaymentType $paymenttype)
    {
        $chartofaccounts = ChartOfAccount::all(); // No pagination
        return inertia('SystemConfiguration/BillingSetup/PaymentTypes/Edit', [
            'paymenttype' => $paymenttype,
            'chartofaccounts' => $chartofaccounts,
        ]);
    }

    /**
     * Update the specified paymenttype in storage.
     */
    public function update(Request $request, BLSPaymentType $paymenttype)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',  
            'chart_of_account_id' => 'required|exists:chart_of_accounts,id', 
        ]);

        // Update the paymenttype
        $paymenttype->update($validated);

        return redirect()->route('systemconfiguration0.paymenttypes.index')
            ->with('success', 'Paymenttype updated successfully.');
    }

    /**
     * Remove the specified paymenttype from storage.
     */
    public function destroy(BLSPaymentType $paymenttype)
    {
        $paymenttype->delete();

        return redirect()->route('systemconfiguration0.paymenttypes.index')
            ->with('success', 'Paymenttype deleted successfully.');
    }

    /**
     * Search for paymenttypes based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $paymenttype = BLSPaymentType::where('name', 'like', '%' . $query . '%')->get();        
        return response()->json(['paymenttype' => $paymenttype]);
    }
}

