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
    /**
     * Display a listing of BLSPaymentTypes.
     */
    public function index(Request $request)
    {
        // Use with('chartOfAccount') to eager load the relationship
        $query = BLSPaymentType::with('chartOfAccount');

        // Search functionality updated to search both the payment type name and the linked account name
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhereHas('chartOfAccount', function ($subQuery) use ($search) {
                      $subQuery->where('account_name', 'like', '%' . $search . '%');
                  });
            });
        }

        // Paginate the results and append the query string for pagination links
        $paymenttypes = $query->orderBy('name', 'asc')->paginate(10)->withQueryString();

        return inertia('SystemConfiguration/BillingSetup/PaymentTypes/Index', [
            'paymenttypes' => $paymenttypes,
            'filters' => $request->only(['search']),
            'success' => session('success'),
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

