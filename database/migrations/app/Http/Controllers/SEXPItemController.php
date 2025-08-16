<?php
namespace App\Http\Controllers;

use App\Models\SEXPItem
;
use Illuminate\Http\Request;

class SEXPItemController extends Controller
{
    /**
     * Display a listing of items.
     */
    public function index(Request $request)
    {
        $query = SEXPItem::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $items = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/ExpensesSetup/Items/Index', [
            'items' => $items,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        return inertia('SystemConfiguration/ExpensesSetup/Items/Create');
    }

    /**
     * Store a newly created item in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
            'itemgroup_id' => 'nullable|exists:sexp_itemgroups,id',
        ]);

        // Create the item
        SEXPItem::create($validated);

        return redirect()->route('systemconfiguration1.items.index')
            ->with('success', 'Item created successfully.');
    }

    /**
     * Show the form for editing the specified item.
     */
    public function edit(SEXPItem $item)
    {
        return inertia('SystemConfiguration/ExpensesSetup/Items/Edit', [
            'item' => $item,
        ]);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(Request $request, SEXPItem $item)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
            'itemgroup_id' => 'nullable|exists:sexp_itemgroups,id',
        ]);

        // Update the item
        $item->update($validated);

        return redirect()->route('systemconfiguration1.items.index')
            ->with('success', 'Item updated successfully.');
    }

    /**
     * Remove the specified item from storage.
     */
    public function destroy(SEXPItem $item)
    {
        $item->delete();

        return redirect()->route('systemconfiguration1.items.index')
            ->with('success', 'Item deleted successfully.');
    }

    /**
     * Search for items based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        //$items = SEXPItem::where('name', 'like', '%' . $query . '%')->get();
        $items = SEXPItem::where('name', 'like', '%' . $query . '%')->get();

        return response()->json(['items' => $items]);
    }
}