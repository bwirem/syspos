<?php
namespace App\Http\Controllers;

use App\Models\SIV_Product;
use Illuminate\Http\Request;

class SIV_ProductController extends Controller
{
    /**
     * Display a listing of products.
     */
    public function index(Request $request)
    {
        $query = SIV_Product::query();

        // Search functionality
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Paginate the results
        $products = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('SystemConfiguration/InventorySetup/Products/Index', [
            'products' => $products,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new product.
     */
    public function create()
    {
        return inertia('SystemConfiguration/InventorySetup/Products/Create');
    }

    /**
     * Store a newly created product in storage.
     */
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'displayname' => 'required|string|max:255',
            'costprice' => 'required|numeric|min:0',
            'prevcost' => 'nullable|numeric|min:0',
            'averagecost' => 'nullable|numeric|min:0',

            'addtocart' => 'boolean',
            'hasexpiry' => 'boolean',
            'expirynotice' => 'boolean',
            'display' => 'boolean',
            
            'defaultqty' => 'nullable|integer|min:1',
            'reorderlevel' => 'nullable|integer|min:1',
           
            'category_id' => 'required|exists:siv_productcategories,id',
            'package_id' => 'required|exists:siv_packagings,id',  
        ]);     

        // Create the product
        SIV_Product::create($validated);

        return redirect()->route('systemconfiguration2.products.index')
            ->with('success', 'Product created successfully.');
    }

    /**
     * Show the form for editing the specified product.
     */
    public function edit(SIV_Product $product)
    {
        return inertia('SystemConfiguration/InventorySetup/Products/Edit', [
            'product' => $product,
        ]);
    }

    /**
     * Update the specified product in storage.
     */
    public function update(Request $request, SIV_Product $product)
    {
        // Validate input
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'displayname' => 'required|string|max:255',
            'costprice' => 'required|numeric|min:0',
            'prevcost' => 'nullable|numeric|min:0',
            'averagecost' => 'nullable|numeric|min:0',

            'addtocart' => 'boolean',
            'hasexpiry' => 'boolean',
            'expirynotice' => 'boolean',
            'display' => 'boolean',
            
            'defaultqty' => 'nullable|integer|min:1',
            'reorderlevel' => 'nullable|integer|min:1',
           
            'category_id' => 'required|exists:siv_productcategories,id',
            'package_id' => 'required|exists:siv_packagings,id',  
        ]);    

        // Update the product
        $product->update($validated);

        return redirect()->route('systemconfiguration2.products.index')
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Remove the specified product from storage.
     */
    public function destroy(SIV_Product $siv_product)
    {
        $siv_product->delete();

        return redirect()->route('systemconfiguration2.products.index')
            ->with('success', 'Product deleted successfully.');
    }

    /**
     * Search for products based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        //$products = SIV_Product::where('name', 'like', '%' . $query . '%')->get();
        $products = SIV_Product::where('name', 'like', '%' . $query . '%')
        ->select('id', 'name', 'costprice as price')
        ->get();


        return response()->json(['products' => $products]);
    }
}

