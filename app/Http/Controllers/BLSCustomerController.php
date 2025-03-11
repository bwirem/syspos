<?php

namespace App\Http\Controllers;

use App\Models\BLSCustomer;
use Illuminate\Http\Request;

class BLSCustomerController extends Controller
{
    /**
     * Display a listing of BLSCustomers.
     */
    public function index(Request $request)
    {
        $query = BLSCustomer::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $customers = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/BillingSetup/Customers/Index', [
            'customers' => $customers,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new customer.
     */
    public function create()
    {
        return inertia('SystemConfiguration/BillingSetup/Customers/Create');
    }

    /**
     * Store a newly created customer in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Create the customer
        BLSCustomer::create([
            'name' => $validated['name'],            
        ]);

        return redirect()->route('systemconfiguration0.customers.index')
            ->with('success', 'Customer created successfully.');
    }

    public function directstore(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Create the customer
        $customer = BLSCustomer::create([
            'name' => $validated['name'],            
        ]);

        // Return the created customer as JSON
        return response()->json([
            'id' => $customer->id,
             'name' => $customer->name,
        ]);
    }

    /**
     * Show the form for editing the specified customer.
     */
    public function edit(BLSCustomer $customer)
    {
        return inertia('SystemConfiguration/BillingSetup/Customers/Edit', [
            'customer' => $customer,
        ]);
    }

    /**
     * Update the specified customer in storage.
     */
    public function update(Request $request, BLSCustomer $customer)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Update the customer
        $customer->update([
            'name' => $validated['name'],           
        ]);

        return redirect()->route('systemconfiguration0.customers.index')
            ->with('success', 'Customer updated successfully.');
    }

    /**
     * Remove the specified customer from storage.
     */
    public function destroy(BLSCustomer $customer)
    {
        $customer->delete();

        return redirect()->route('systemconfiguration0.customers.index')
            ->with('success', 'Customer deleted successfully.');
    }

    /**
     * Search for customers based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $customers = BLSCustomer::where('name', 'like', '%' . $query . '%')->get();

        // Return JSON response instead of an Inertia page
        return response()->json(['customers' => $customers]);
    }

}

