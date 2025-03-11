<?php
namespace App\Http\Controllers;

use App\Models\BLSItem;
use Illuminate\Http\Request;

class BLSItemController extends Controller
{
    /**
     * Display a listing of items.
     */
    public function index(Request $request)
    {
        $query = BLSItem::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $items = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/BillingSetup/Items/Index', [
            'items' => $items,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        return inertia('SystemConfiguration/BillingSetup/Items/Create');
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
            'price2' => 'nullable|numeric|min:0',
            'price3' => 'nullable|numeric|min:0',
            'price4' => 'nullable|numeric|min:0',
            'defaultqty' => 'nullable|integer|min:1',
            'addtocart' => 'boolean',
            'itemgroup_id' => 'required|exists:bls_itemgroups,id',
        ]);

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
        return inertia('SystemConfiguration/BillingSetup/Items/Edit', [
            'item' => $item,
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
            'price2' => 'nullable|numeric|min:0',
            'price3' => 'nullable|numeric|min:0',
            'price4' => 'nullable|numeric|min:0',
            'defaultqty' => 'nullable|integer|min:1',
            'addtocart' => 'boolean',
            'itemgroup_id' => 'required|exists:bls_itemgroups,id',
        ]);

        // Update the item
        $item->update($validated);

        return redirect()->route('blsitems.index')
            ->with('success', 'Item updated successfully.');
    }

    /**
     * Remove the specified item from storage.
     */
    public function destroy(BLSItem $item)
    {
        $blsitem->delete();

        return redirect()->route('blsitems.index')
            ->with('success', 'Item deleted successfully.');
    }

    /**
     * Search for items based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        //$items = BLSItem::where('name', 'like', '%' . $query . '%')->get();
        $items = BLSItem::where('name', 'like', '%' . $query . '%')
        ->select('id', 'name', 'price1 as price')
        ->get();


        return response()->json(['items' => $items]);
    }
}

