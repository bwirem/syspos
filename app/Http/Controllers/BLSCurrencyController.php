<?php

namespace App\Http\Controllers;

use App\Models\BLSCurrency;
use Illuminate\Http\Request;

class BLSCurrencyController extends Controller
{
    /**
     * Display a listing of BLSCurrencys.
     */
    public function index(Request $request)
    {
        $query = BLSCurrency::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $currencies = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/BillingSetup/Currencies/Index', [
            'currencies' => $currencies,
            'filters' => $request->only(['search']),
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
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Create the currency
        BLSCurrency::create([
            'name' => $validated['name'],            
        ]);

        return redirect()->route('systemconfiguration0.currencies.index')
            ->with('success', 'Currency created successfully.');
    }

    public function directstore(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Create the currency
        $currency = BLSCurrency::create([
            'name' => $validated['name'],            
        ]);

        // Return the created currency as JSON
        return response()->json([
            'id' => $currency->id,
             'name' => $currency->name,
        ]);
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
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Update the currency
        $currency->update([
            'name' => $validated['name'],           
        ]);

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
     * Search for currencies based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $currencies = BLSCurrency::where('name', 'like', '%' . $query . '%')->get();

        // Return JSON response instead of an Inertia page
        return response()->json(['currencies' => $currencies]);
    }

}

