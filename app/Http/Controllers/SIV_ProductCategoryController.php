<?php
namespace App\Http\Controllers;

use App\Models\SIV_ProductCategory;
use App\Models\SIV_Product;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class SIV_ProductCategoryController extends Controller
{
    /**
     * Display a listing of categories.
     */
    public function index(Request $request)
    {
        $query = SIV_ProductCategory::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $categories = $query->orderBy('name', 'asc')->paginate(10);

        return inertia('SystemConfiguration/InventorySetup/Categories/Index', [
            'categories' => $categories,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new item.
     */
    public function create()
    {
        return inertia('SystemConfiguration/InventorySetup/Categories/Create');
    }

    /**
     * Store a newly created item in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Create the item
        SIV_ProductCategory::create($validated);

        return redirect()->route('systemconfiguration2.categories.index')
            ->with('success', 'Item created successfully.');
    }

    /**
     * Show the form for editing the specified item.
     */
    public function edit(SIV_ProductCategory $category)
    {
        return inertia('SystemConfiguration/InventorySetup/Categories/Edit', [
            'category' => $category,
        ]);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(Request $request, SIV_ProductCategory $category)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',            
        ]);

        // Update the item
        $category->update($validated);

        return redirect()->route('systemconfiguration2.categories.index')
            ->with('success', 'Item updated successfully.');
    }

    /**
     * Remove the specified item from storage.
     */
    
    public function destroy(SIV_ProductCategory $category)
    {
        // Check if any product is currently assigned to this category
        if (SIV_Product::where('category_id', $category->id)->exists()) {
            return redirect()->route('systemconfiguration2.categories.index')
                ->with('error', 'Unable to delete: This category is assigned to one or more products.');
        }

        try {
            $category->delete();
        } catch (QueryException $e) {
            // Handles database-level Foreign Key constraints
            return redirect()->route('systemconfiguration2.categories.index')
                ->with('error', 'Unable to delete: Database integrity constraint violation.');
        }

        return redirect()->route('systemconfiguration2.categories.index')
            ->with('success', 'Category deleted successfully.');
    }

    /**
     * Search for categories based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $categories = SIV_ProductCategory::where('name', 'like', '%' . $query . '%')->get();       

        return response()->json(['categories' => $categories]);
    }
}

