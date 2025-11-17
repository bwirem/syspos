<?php
namespace App\Http\Controllers;

use App\Models\BLSItem;
use App\Models\BLSItemGroup;
use App\Models\BLSPriceCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BLSItemController extends Controller
{
    /**
     * Display a listing of items.
     */
    public function index(Request $request)
    {
        // ... (query logic remains the same)
        $query = BLSItem::with('itemgroup');
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhereHas('itemgroup', function ($subQuery) use ($search) {
                      $subQuery->where('name', 'like', '%' . $search . '%');
                  });
            });
        }
        $items = $query->orderBy('name', 'asc')->paginate(10)->withQueryString();

        // --- REVISED AND IMPROVED LOGIC ---
        $activePriceCategories = [];
        $priceCategorySettings = BLSPriceCategory::first();

        if ($priceCategorySettings) {
            for ($i = 1; $i <= 4; $i++) {
                // Check if the 'useprice' field is true (or 1)
                if ($priceCategorySettings->{'useprice' . $i}) {
                    $activePriceCategories[] = [
                        'key' => 'price' . $i,
                        'label' => $priceCategorySettings->{'price' . $i},
                    ];
                }
            }
        }

        // FINAL CHECK: If after checking the DB, the array is STILL empty,
        // then we must add a default. This is the crucial fix.
        if (empty($activePriceCategories)) {
            $activePriceCategories[] = [
                'key' => 'price1',
                'label' => $priceCategorySettings ? $priceCategorySettings->price1 : 'Price' // Use the name from the DB if it exists, otherwise a generic fallback
            ];
        }

        return inertia('SystemConfiguration/BillingSetup/Items/Index', [
            'items' => $items,
            'filters' => $request->only(['search']),
            'success' => session('success'),
            'activePriceCategories' => $activePriceCategories,
        ]);
    }
    

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        $filteredItemGroups = BLSItemGroup::orderBy('name')
            ->where('name', '!=', 'Inventory')
            ->get();

        // Fetch ALL necessary data and pass it to the view
        return inertia('SystemConfiguration/BillingSetup/Items/Create', [
            'itemGroups' => $filteredItemGroups,
            'pricecategories' => BLSPriceCategory::all(), // <-- FIX: Pass price categories
        ]);
    }

    /**
     * Store a newly created item in storage.
     */
    public function store(Request $request)
    {
        // --- UPDATED VALIDATION ---
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:bls_items,name',
            'itemgroup_id' => 'required|exists:bls_itemgroups,id',
            'defaultqty' => 'required|integer|min:1',
            'addtocart' => 'boolean',
            
            // price1 is always required as a baseline
            'price1' => 'required|numeric|min:0',
            
            // Other prices are only required if they are sent with the form
            'price2' => 'nullable|numeric|min:0',
            'price3' => 'nullable|numeric|min:0',
            'price4' => 'nullable|numeric|min:0',
        ]);
         
        // Ensure boolean is correctly cast
        $validated['addtocart'] = $request->boolean('addtocart');
        
        // Ensure prices that were not submitted default to 0
        $validated['price2'] = $validated['price2'] ?? 0;
        $validated['price3'] = $validated['price3'] ?? 0;
        $validated['price4'] = $validated['price4'] ?? 0;

        // Create the item
        BLSItem::create($validated);

        return redirect()->route('systemconfiguration0.items.index')
            ->with('success', 'Item created successfully.');
    }
    /**
     * Show the form for editing the specified item.
     */
    public function edit(BLSItem $item)
    {
        $filteredItemGroups = BLSItemGroup::orderBy('name')           
            ->get();

        // Fetch ALL necessary data and pass it to the view
        return inertia('SystemConfiguration/BillingSetup/Items/Edit', [
            'item' => $item,
            'itemGroups' => $filteredItemGroups,
            'pricecategories' => BLSPriceCategory::all(), // <-- FIX: Pass price categories
        ]);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(Request $request, BLSItem $item)
    {
        // --- UPDATED VALIDATION ---
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('bls_items')->ignore($item->id)],
            'itemgroup_id' => 'required|exists:bls_itemgroups,id',
            'defaultqty' => 'required|integer|min:1',
            'addtocart' => 'boolean',

            'price1' => 'required|numeric|min:0',
            'price2' => 'nullable|numeric|min:0',
            'price3' => 'nullable|numeric|min:0',
            'price4' => 'nullable|numeric|min:0',
        ]);
    
        // Ensure boolean values are set correctly
        $validated['addtocart'] = $request->boolean('addtocart');

        // Prepare the data for update, ensuring prices not sent don't overwrite existing ones with null
        $updateData = $validated;
        
        // If an item is linked to stock, we must restrict what can be updated.
        // The name and group are managed by the inventory product.
        if ($item->product_id) {
            unset($updateData['name'], $updateData['itemgroup_id']);
        }
    
        // Update the item
        $item->update($updateData);
    
        return redirect()->route('systemconfiguration0.items.index')
            ->with('success', 'Item updated successfully.');
    }
    

    /**
     * Remove the specified item from storage.
     */
    public function destroy(BLSItem $item)
    {
        // Check if the item is linked to stock
        if ($item->product_id) {
            return redirect()->route('systemconfiguration0.items.index')
                ->with('error', 'Cannot delete item linked to stock.');
        }

        // If not linked, proceed with deletion
        $item->delete();

        return redirect()->route('systemconfiguration0.items.index')
            ->with('success', 'Item deleted successfully.');
    }


    /**
     * Search for items based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $priceCategoryId = $request->input('pricecategory_id', 'price1'); // default to price1 if not provided

        // Ensure only price1, price2, price3, or price4 is allowed
        if (!in_array($priceCategoryId, ['price1', 'price2', 'price3', 'price4'])) {
            $priceCategoryId = 'price1';
        }

        $items = BLSItem::where('name', 'like', '%' . $query . '%')
            ->select('id', 'name', "$priceCategoryId as price")
            ->get();

        return response()->json(['items' => $items]);
    }


    /**
     * Quickly update the prices of a single BLSItem.
     * Intended for AJAX calls from the index page.
     */
    public function updatePrices(Request $request, BLSItem $item)
    {
        // REMOVED: The check for product_id has been taken out.
        // if ($item->product_id) { ... }

        // Dynamically build validation rules based on the data sent from the form
        $rules = [];
        $priceKeys = ['price1', 'price2', 'price3', 'price4'];
        
        foreach ($request->all() as $key => $value) {
            if (in_array($key, $priceKeys)) {
                $rules[$key] = 'required|numeric|min:0';
            }
        }

        if (empty($rules)) {
            return response()->json(['success' => false, 'message' => 'No valid price data provided.'], 400);
        }

        $validated = $request->validate($rules);

        // Update the item with only the validated price fields
        $item->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Prices updated successfully.',
        ]);
    }

}

