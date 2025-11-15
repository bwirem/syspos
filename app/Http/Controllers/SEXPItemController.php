<?php
namespace App\Http\Controllers;

use App\Models\SEXPItem;
use App\Models\SEXPItemGroup;
use Illuminate\Http\Request;

class SEXPItemController extends Controller
{    
    
    /**
     * Display a listing of items.
     */
    public function index(Request $request)
    {
        // Eager-load the 'itemgroup' relationship for efficient grouping
        $query = SEXPItem::with('itemgroup');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', '%' . $search . '%')
                  ->orWhereHas('itemgroup', function ($q) use ($search) {
                      $q->where('name', 'like', '%' . $search . '%');
                  });
        }

        $items = $query->orderBy('name', 'asc')->paginate(10)->withQueryString();

        return inertia('SystemConfiguration/ExpensesSetup/Items/Index', [
            'items' => $items,
            'filters' => $request->only(['search']),
            'success' => session('success'),
        ]);
    }

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        // FIX: Pass the list of available groups to the Create page
        return inertia('SystemConfiguration/ExpensesSetup/Items/Create', [
            'itemGroups' => SEXPItemGroup::orderBy('name')->get(),
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
            'itemgroup_id' => 'required|exists:sexp_itemgroups,id',
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
            'itemGroups' => SEXPItemGroup::orderBy('name')->get(),
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
            'itemgroup_id' => 'required|exists:sexp_itemgroups,id',
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