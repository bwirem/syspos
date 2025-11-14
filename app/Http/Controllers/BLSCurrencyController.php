<?php

namespace App\Http\Controllers;

use App\Models\BLSCurrency;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule; // Good practice to import Rule if you were to use it.

class BLSCurrencyController extends Controller
{
    /**
     * Display a listing of BLSCurrencys.
     */
    public function index(Request $request)
    {
        $query = BLSCurrency::query();

        // Search functionality updated to include name and symbol
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('currencysymbol', 'like', '%' . $search . '%');
            });
        }

        // Paginate the results
        $currencies = $query->orderBy('name', 'asc')->paginate(10)->withQueryString();

        return inertia('SystemConfiguration/BillingSetup/Currencies/Index', [
            'currencies' => $currencies,
            'filters' => $request->only(['search']),
            'success' => session('success'), // Pass success flash messages
        ]);
    }

    /**
     * Show the form for creating a new currency.
     */
    public function create()
    {
        return inertia('SystemConfiguration/BillingSetup/Currencies/Create');
    }

    /**
     * Store a newly created currency in storage.
     */
    public function store(Request $request)
    {
        // Validate input including new fields
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:bls_currencies,name',
            'currencysymbol' => 'required|string|max:10',
            'exchangerate' => 'required|numeric|min:0',
        ]);

        // Create the currency using the validated data
        BLSCurrency::create($validated);

        return redirect()->route('systemconfiguration0.currencies.index')
            ->with('success', 'Currency created successfully.');
    }

    /**
     * A direct store method for API-like creation.
     */
    public function directstore(Request $request)
    {
        // Validate input including new fields
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:bls_currencies,name',
            'currencysymbol' => 'required|string|max:10',
            'exchangerate' => 'required|numeric|min:0',
        ]);

        // Create the currency
        $currency = BLSCurrency::create($validated);

        // Return the full created currency model as JSON
        return response()->json($currency);
    }

    /**
     * Show the form for editing the specified currency.
     */
    public function edit(BLSCurrency $currency)
    {
        return inertia('SystemConfiguration/BillingSetup/Currencies/Edit', [
            'currency' => $currency,
        ]);
    }

    /**
     * Update the specified currency in storage.
     */
    public function update(Request $request, BLSCurrency $currency)
    {
        // Validate input including new fields
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('bls_currencies')->ignore($currency->id)],
            'currencysymbol' => 'required|string|max:10',
            'exchangerate' => 'required|numeric|min:0',
        ]);

        // Update the currency
        $currency->update($validated);

        return redirect()->route('systemconfiguration0.currencies.index')
            ->with('success', 'Currency updated successfully.');
    }

    /**
     * Remove the specified currency from storage.
     */
    public function destroy(BLSCurrency $currency)
    {
        $currency->delete();

        return redirect()->route('systemconfiguration0.currencies.index')
            ->with('success', 'Currency deleted successfully.');
    }

    /**
     * Search for currencies based on a query (for API/AJAX calls).
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        
        // Search by name or symbol
        $currencies = BLSCurrency::where('name', 'like', '%' . $query . '%')
                                   ->orWhere('currencysymbol', 'like', '%' . $query . '%')
                                   ->get();

        // Return JSON response
        return response()->json(['currencies' => $currencies]);
    }
}