<?php
namespace App\Http\Controllers;

use App\Models\BLSItem;
use App\Models\BLSItemGroup;
use App\Models\BLSPriceCategory;
use Illuminate\Http\Request;

class BLSItemController extends Controller
{
    /**
     * Display a listing of items.
     */
    public function index(Request $request)
    {
        // Eager load the itemgroup relationship to prevent N+1 queries
        $query = BLSItem::with('itemgroup');

        // Search functionality for both item name and group name
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhereHas('itemgroup', function ($subQuery) use ($search) {
                      $subQuery->where('name', 'like', '%' . $search . '%');
                  });
            });
        }

        // Paginate the results
        $items = $query->orderBy('name', 'asc')->paginate(10)->withQueryString();

        return inertia('SystemConfiguration/BillingSetup/Items/Index', [
            'items' => $items,
            'filters' => $request->only(['search']),
            'success' => session('success'), // Pass success flash message
        ]);
    }

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        // Fetch ALL necessary data and pass it to the view
        return inertia('SystemConfiguration/BillingSetup/Items/Create', [
            'itemGroups' => BLSItemGroup::orderBy('name')->get(),
            'pricecategories' => BLSPriceCategory::all(), // <-- FIX: Pass price categories
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
            'price1' => 'required|numeric|min:0',
            'price2' => 'required|numeric|min:0',
            'price3' => 'required|numeric|min:0',
            'price4' => 'required|numeric|min:0',
            'defaultqty' => 'required|integer|min:1',
            'addtocart' => 'boolean',
            'itemgroup_id' => 'required|exists:bls_itemgroups,id',
        ]);
         
        // Ensure boolean is correctly cast
        $validated['addtocart'] = $request->boolean('addtocart');

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
        // Fetch ALL necessary data and pass it to the view
        return inertia('SystemConfiguration/BillingSetup/Items/Edit', [
            'item' => $item,
            'itemGroups' => BLSItemGroup::orderBy('name')->get(),
            'pricecategories' => BLSPriceCategory::all(), // <-- FIX: Pass price categories
        ]);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(Request $request, BLSItem $item)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price1' => 'required|numeric|min:0',
            'price2' => 'required|numeric|min:0',
            'price3' => 'required|numeric|min:0',
            'price4' => 'required|numeric|min:0',
            'defaultqty' => 'required|integer|min:1',
            'addtocart' => 'boolean',
            'itemgroup_id' => 'required|exists:bls_itemgroups,id',
        ]);
    
        // Ensure boolean values are set correctly
        $validated['addtocart'] = $request->boolean('addtocart');
    
        // If item is linked to stock (has product_id), update only certain fields
        if ($item->product_id) {
            $updateData = [
                'price1' => $validated['price1'],
                'price2' => $validated['price2'],
                'price3' => $validated['price3'],
                'price4' => $validated['price4'],
                'addtocart' => $validated['addtocart'],
                'defaultqty' => $validated['defaultqty'],
            ];
        } else {
            // Update all fields if not linked to stock
            $updateData = $validated;
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

}

