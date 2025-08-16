<?php

namespace App\Http\Controllers;

use App\Models\BLSPackage;
use Illuminate\Http\Request;

class BLSPackageController extends Controller
{
    /**
     * Display a listing of package.
     */
    public function index(Request $request)
    {
        $query = BLSPackage::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $loanpackages = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/LoanSetup/LoanPackages/Index', [
            'loanpackages' => $loanpackages,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new package.
     */
    public function create()
    {
        return inertia('SystemConfiguration/LoanSetup/LoanPackages/Create');
    }

    /**
     * Store a newly created package in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'duration' => 'required|integer|min:1',
            'interest_type' => 'required|string|max:255',
            'interest_rate' => 'required|numeric|min:0',

        ]);

        // Create the package
        BLSPackage::create($validated);

        return redirect()->route('systemconfiguration0.loanpackages.index')
            ->with('success', 'Package created successfully.');
    }

    /**
     * Show the form for editing the specified package.
     */
    public function edit(BLSPackage $loanpackage)
    {
        return inertia('SystemConfiguration/LoanSetup/LoanPackages/Edit', [
            'loanpackage' => $loanpackage,
        ]);
    }

    /**
     * Update the specified package in storage.
     */
    public function update(Request $request, BLSPackage $loanpackage)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'duration' => 'required|integer|min:1',
            'interest_type' => 'required|string|max:255',
            'interest_rate' => 'required|numeric|min:0',
        ]);

        // Update the package
        $loanpackage->update($validated);

        return redirect()->route('systemconfiguration0.loanpackages.index')
            ->with('success', 'Package updated successfully.');
    }

    /**
     * Remove the specified package from storage.
     */
    public function destroy(BLSPackage $loanpackage)
    {
        $loanpackage->delete();

        return redirect()->route('systemconfiguration0.loanpackages.index')
            ->with('success', 'Package deleted successfully.');
    }

    /**
     * Search for package based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $loanpackages = BLSPackage::where('name', 'like', '%' . $query . '%')
            ->get();


        return response()->json(['packages' => $loanpackages]);
    }
}