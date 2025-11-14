<?php
namespace App\Http\Controllers;

use App\Models\SIV_Product;
use App\Models\SIV_ProductCategory;
use App\Models\SIV_Packaging;
use App\Models\BLSItem; 
use App\Models\BLSItemGroup; 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

use App\Imports\ProductsImport; // <-- Import the new class
use Maatwebsite\Excel\Facades\Excel; // <-- Import Excel Facade
use Maatwebsite\Excel\Validators\ValidationException; // <-- Import Excel's exception


class SIV_ProductController extends Controller
{
    /**
     * Display a listing of products.
     */
    public function index(Request $request)
    {
        // Eager-load relationships for efficiency and to display in the table
        $query = SIV_Product::with(['category', 'unit']);

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', '%' . $search . '%')
                  ->orWhere('displayname', 'like', '%' . $search . '%');
        }

        $products = $query->orderBy('name', 'asc')->paginate(10)->withQueryString();

        return inertia('SystemConfiguration/InventorySetup/Products/Index', [
            'products' => $products,
            'filters' => $request->only(['search']),
            'success' => session('success'), // Pass success flash messages
        ]);
    }

    /**
     * Show the form for creating a new product.
     */
    public function create()
    {
        // FIX: Load categories and units and pass them as props
        return inertia('SystemConfiguration/InventorySetup/Products/Create', [
            'categories' => SIV_ProductCategory::orderBy('name')->get(),
            'units' => SIV_Packaging::orderBy('name')->get(),
        ]);
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

            'addtocart' => 'sometimes|boolean',
            'hasexpiry' => 'sometimes|boolean',
            'expirynotice' => 'sometimes|boolean',
            'display' => 'sometimes|boolean',
            
            'defaultqty' => 'nullable|integer|min:1',
            'reorderlevel' => 'nullable|integer|min:1',
        
            'category_id' => 'required|exists:siv_productcategories,id',
            'package_id' => 'required|exists:siv_packagings,id',  
        ]);     

        // Ensure proper boolean casting (avoid errors when checkboxes are unchecked)
        $validated['addtocart'] = $request->boolean('addtocart');
        $validated['hasexpiry'] = $request->boolean('hasexpiry');
        $validated['expirynotice'] = $request->boolean('expirynotice');
        $validated['display'] = $request->boolean('display');

        // Assign default values for nullable fields
        $validated['defaultqty'] = $validated['defaultqty'] ?? 1;
        $validated['reorderlevel'] = $validated['reorderlevel'] ?? 1;

        // Create the product
        $product = SIV_Product::create($validated);       
        $itemGroup = BLSItemGroup::firstOrCreate(['name' => 'Inventory']);  

        // Create the item
        BLSItem::create([
            'name' => $validated['name'],            
            'price1' => 0,
            'price2' => 0,
            'price3' => 0,
            'price4' => 0, 
            'addtocart' => $validated['addtocart'],
            'defaultqty' => $validated['defaultqty'],
            'itemgroup_id' => $itemGroup->id,  
            'product_id' => $product->id,   
        ]);   

        return redirect()->route('systemconfiguration2.products.index')
            ->with('success', 'Product created successfully.');
    }
    
    /**
     * Show the form for editing the specified product.
     */
    public function edit(SIV_Product $product)
    {
        // FIX: Load categories and units alongside the product
        return inertia('SystemConfiguration/InventorySetup/Products/Edit', [
            'product' => $product,
            'categories' => SIV_ProductCategory::orderBy('name')->get(),
            'units' => SIV_Packaging::orderBy('name')->get(),
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

            'addtocart' => 'sometimes|boolean',
            'hasexpiry' => 'sometimes|boolean',
            'expirynotice' => 'sometimes|boolean',
            'display' => 'sometimes|boolean',
            
            'defaultqty' => 'nullable|integer|min:1',
            'reorderlevel' => 'nullable|integer|min:1',
        
            'category_id' => 'required|exists:siv_productcategories,id',
            'package_id' => 'required|exists:siv_packagings,id',  
        ]);    

        // Ensure proper boolean casting
        $validated['addtocart'] = $request->boolean('addtocart');
        $validated['hasexpiry'] = $request->boolean('hasexpiry');
        $validated['expirynotice'] = $request->boolean('expirynotice');
        $validated['display'] = $request->boolean('display');

        // Assign default values for nullable fields
        $validated['defaultqty'] = $validated['defaultqty'] ?? 1;
        $validated['reorderlevel'] = $validated['reorderlevel'] ?? 1;

        // Update the product
        $product->update($validated);

        // Find the related item group
        $itemGroup = BLSItemGroup::firstOrCreate(['name' => 'Inventory']);

        // Update the related BLSItem
        $product->blsItem()->updateOrCreate(
            ['product_id' => $product->id],
            [
                'name' => $validated['name'],            
                'price1' => 0,
                'price2' => 0,
                'price3' => 0,
                'price4' => 0, 
                'addtocart' => $validated['addtocart'],
                'defaultqty' => $validated['defaultqty'],
                'itemgroup_id' => $itemGroup->id,  
            ]
        );

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
    // public function search(Request $request)
    // {
    //     $query = $request->input('query');
    //     $storeId = $request->input('store_id', null); // Optional store ID

    //     //$products = SIV_Product::where('name', 'like', '%' . $query . '%')->get();
    //     $products = SIV_Product::where('name', 'like', '%' . $query . '%')
    //     ->select('id', 'name', 'costprice as price','iv_productcontrol.qty_' . $storeId. 'as stock_quantity')
    //     innerJoin('iv_productcontrol', 'iv_productcontrol.product_id', '=', 'siv_products.id')
    //     ->get();


    //     return response()->json(['products' => $products]);
    // }



    public function search(Request $request)
    {
        // Validate the request
        $query = $request->input('query');
        $storeId = $request->input('store_id', null);

        // Start the query, selecting specific fields.
        // Explicitly state the table name in 'where' to avoid ambiguity after joining.
        $productsQuery = SIV_Product::where('siv_products.name', 'like', '%' . $query . '%')
            ->select('siv_products.id', 'siv_products.name', 'siv_products.costprice as price');

        if ($storeId && is_numeric($storeId) && (int)$storeId > 0) {
            // If a valid storeId is provided, construct the dynamic column name
            $qtyColumn = 'iv_productcontrol.qty_' . (int)$storeId;

            // Use leftJoin to ensure all products are returned, even if they're not in iv_productcontrol.
            // Use addSelect to append the stock_quantity column to the query.
            // COALESCE will return the stock quantity if a record exists, otherwise it will return 0.
            $productsQuery->leftJoin('iv_productcontrol', 'iv_productcontrol.product_id', '=', 'siv_products.id')
                        ->addSelect(\DB::raw("COALESCE($qtyColumn, 0) as stock_quantity"));
        } else {
            // If no store_id is provided or it's invalid, add a default value of 0 for stock_quantity.
            // This ensures the API response has a consistent structure.
            $productsQuery->addSelect(\DB::raw('0 as stock_quantity'));
        }

        $products = $productsQuery->take(10)->get();

        return response()->json(['products' => $products]);
    }


    /**
     * Show the form for importing products.
     */
    public function showImportForm()
    {
        return inertia('SystemConfiguration/InventorySetup/Products/ProductImport');
    }

    /**
     * Handle the import of a product Excel file.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv'
        ]);

        try {
            Excel::import(new ProductsImport, $request->file('file'));
        } catch (ValidationException $e) {
            $failures = $e->failures();
            $errors = [];
            foreach ($failures as $failure) {
                $errors[] = [
                    'row' => $failure->row(),
                    'attribute' => $failure->attribute(),
                    'errors' => $failure->errors(),
                ];
            }
            // Redirect back with validation errors for specific rows
            return redirect()->route('systemconfiguration2.products.import.show')
                ->with('import_errors', $errors);
        }

        return redirect()->route('systemconfiguration2.products.index')
            ->with('success', 'Products imported successfully!');
    }

    /**
     * Download the product import template file.
     */
    public function downloadTemplate()
    {
        $path = storage_path('app/templates/products_import_template.xlsx');

        if (!file_exists($path)) {
            abort(404, 'Template file not found.');
        }

        return response()->download($path);
    }
    
}

