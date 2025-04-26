<?php

namespace App\Http\Controllers;

use App\Models\BLSPriceCategory;
use Illuminate\Http\Request;

class BLSPriceCategoryController extends Controller
{
    /**
     * Display a listing of price categories.
     */
    public function index(Request $request)
    {
        $query = BLSPriceCategory::query();

        // Optional search logic — currently no searchable 'name' column, so skip if not needed
        if ($request->filled('search')) {
            $query->where('price1', 'like', '%' . $request->search . '%'); // or modify if you add a name field
        }

        $pricecategories = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/BillingSetup/PriceCategories/Index', [
            'pricecategories' => $pricecategories,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new price category.
     */
    public function create()
    {
        return inertia('SystemConfiguration/BillingSetup/PriceCategories/Create');
    }

    /**
     * Store a newly created price category in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'price1' => 'required|string|max:255',
            'price2' => 'nullable|string|max:255',
            'price3' => 'nullable|string|max:255',
            'price4' => 'nullable|string|max:255',

            'useprice1' => 'boolean',
            'useprice2' => 'boolean',
            'useprice3' => 'boolean',
            'useprice4' => 'boolean',
        ]);

        // Ensure checkbox boolean values are cast properly
        foreach (['useprice1', 'useprice2', 'useprice3', 'useprice4'] as $field) {
            $validated[$field] = $request->boolean($field);
        }

        BLSPriceCategory::create($validated);

        return redirect()->route('systemconfiguration0.pricecategories.index')
            ->with('success', 'Price category created successfully.');
    }

    /**
     * Show the form for editing the specified price category.
     */
    public function edit(BLSPriceCategory $pricecategory)
    {
        return inertia('SystemConfiguration/BillingSetup/PriceCategories/Edit', [
            'pricecategory' => $pricecategory,
        ]);
    }

    /**
     * Update the specified price category in storage.
     */
    public function update(Request $request, BLSPriceCategory $pricecategory)
    {
        $validated = $request->validate([
            'price1' => 'required|string|max:255',
            'price2' => 'nullable|string|max:255',
            'price3' => 'nullable|string|max:255',
            'price4' => 'nullable|string|max:255',

            'useprice1' => 'boolean',
            'useprice2' => 'boolean',
            'useprice3' => 'boolean',
            'useprice4' => 'boolean',
        ]);

        foreach (['useprice1', 'useprice2', 'useprice3', 'useprice4'] as $field) {
            $validated[$field] = $request->boolean($field);
        }

        $pricecategory->update($validated);

        return redirect()->route('systemconfiguration0.pricecategories.index')
            ->with('success', 'Price category updated successfully.');
    }

     
    public function viewActive(Request $request)
    {
        // Fetch all records from facilitypricecategories
        $rows = BLSPriceCategory::query()->first();
    
        $priceCategories = [];
    
        if ($rows) {
            for ($i = 1; $i <= 13; $i++) {
                if (!empty($rows->{'useprice' . $i}) && $rows->{'useprice' . $i} == 1) {
                    $priceCategories[] = [
                        'pricename' => 'price' . $i,
                        'pricedescription' => trim($rows->{'price' . $i}),
                    ];
                }
            }
        }
    
        
        return response()->json(['priceCategories' => $priceCategories]);
    }
               

            

}
