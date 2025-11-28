<?php
namespace App\Http\Controllers;
use App\Models\UserGroupModuleItem;


use App\Models\SIV_Product;
use App\Models\SIV_ProductCategory;
use App\Models\SIV_Packaging;
use App\Models\BLSItem; 
use App\Models\BLSItemGroup; 
use App\Models\BLSPriceCategory;
use App\Models\BILProductCostLog;

use App\Models\IVIssueItem;
use App\Models\IVReceiveItem;
use App\Models\IVNormalAdjustmentItem;
use App\Models\IVPhysicalInventoryItem;
use App\Models\IVRequistionItem;

use App\Models\BILInvoiceItem;
use App\Models\BILOrderItem;
use App\Models\BILReceiptItem;
use App\Models\BILSaleItem;

use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

use App\Imports\ProductsImport; // <-- Import the new class
use Maatwebsite\Excel\Facades\Excel; // <-- Import Excel Facade
use Maatwebsite\Excel\Validators\ValidationException; // <-- Import Excel's exception
use Illuminate\Validation\Rule;


class SIV_ProductController extends Controller
{

    // A private helper function to get active price categories to avoid repeating code
    private function getActivePriceCategories()
    {
        $activePriceCategories = [];
        $priceCategorySettings = BLSPriceCategory::first();

        if ($priceCategorySettings) {
            for ($i = 1; $i <= 4; $i++) {
                if ($priceCategorySettings->{'useprice' . $i}) {
                    $activePriceCategories[] = [
                        'key' => 'price' . $i,
                        'label' => $priceCategorySettings->{'price' . $i},
                    ];
                }
            }
        }
        
        // Always return at least a default if none are set
        if (empty($activePriceCategories)) {
            $activePriceCategories[] = ['key' => 'price1', 'label' => 'Price'];
        }

        return $activePriceCategories;
    }
   

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

        $query->orderBy(
            SIV_ProductCategory::select('name')
                ->whereColumn('siv_productcategories.id', 'siv_products.category_id')
        )->orderBy('name', 'asc');

        $products = $query->paginate(50)->withQueryString();

        return inertia('SystemConfiguration/InventorySetup/Products/Index', [
            'products' => $products,
            'filters' => $request->only(['search']),
            'success' => session('success'), // Pass success flash messages          
            'error' => session('error') ? [    
                'message' => session('error'),
                'time' => microtime(true) // Unique timestamp ensures React notices the change
                ] : null,
             ]);
    }

    // New helper function to get user permissions
  
    private function getUserPermissions() {
        $user = Auth::user();
        if (!$user) return [];

        return UserGroupModuleItem::join('usergroupfunctions', 'usergroupmoduleitems.id', '=', 'usergroupfunctions.usergroupmoduleitem_id')
            ->where('usergroupmoduleitems.usergroup_id', $user->usergroup_id)
            ->get(['usergroupmoduleitems.moduleitemkey', 'usergroupfunctions.functionaccesskey'])
            ->map(function ($item) {
                // Creates strings like "systemconfiguration2.allow_price"
                return $item->moduleitemkey . '.' . $item->functionaccesskey; 
            })
            ->toArray();
    }
    /**
     * Show the form for creating a new product.
     */
    public function create()
    {
        return inertia('SystemConfiguration/InventorySetup/Products/Create', [
            'categories' => SIV_ProductCategory::orderBy('name')->get(),
            'units' => SIV_Packaging::orderBy('name')->get(),
            'activePriceCategories' => $this->getActivePriceCategories(), // <-- PASS DATA
            'userPermissions' => $this->getUserPermissions(), // <--- PASS THI
        ]);
    }
    /**
     * Store a newly created product in storage.
     */
    public function store(Request $request)
    {
        // 1. Validate input (Added price fields)
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:siv_products,name',
            'displayname' => 'required|string|max:255',
            'costprice' => 'required|numeric|min:0',
            'addtocart' => 'sometimes|boolean',
            'hasexpiry' => 'sometimes|boolean',
            'expirynotice' => 'sometimes|boolean',
            'display' => 'sometimes|boolean',
            'defaultqty' => 'nullable|integer|min:1',
            'reorderlevel' => 'nullable|integer|min:1',
            'category_id' => 'required|exists:siv_productcategories,id',
            'package_id' => 'required|exists:siv_packagings,id',
            
            // New: Allow prices to be validated if present
            'price1' => 'nullable|numeric|min:0',
            'price2' => 'nullable|numeric|min:0',
            'price3' => 'nullable|numeric|min:0',
            'price4' => 'nullable|numeric|min:0',
        ]);     

        // Set cost fields automatically
        $validated['prevcost'] = $validated['costprice'];
        $validated['averagecost'] = $validated['costprice'];

        // Ensure proper boolean casting
        $validated['addtocart'] = $request->boolean('addtocart');
        $validated['hasexpiry'] = $request->boolean('hasexpiry');
        $validated['expirynotice'] = $request->boolean('expirynotice');
        $validated['display'] = $request->boolean('display');
        $validated['defaultqty'] = $validated['defaultqty'] ?? 1;
        $validated['reorderlevel'] = $validated['reorderlevel'] ?? 1;

        // Use a transaction for data integrity
        DB::transaction(function () use ($validated, $request) {
            // Create the product
            $product = SIV_Product::create($validated);      
            
            BILProductCostLog::create([
                'sysdate' => now(),
                'transdate' => now(), 
                'product_id' => $product->id,
                'costprice' => $product->costprice,
            ]);
            
            $itemGroup = BLSItemGroup::firstOrCreate(['name' => 'Inventory']);
            
            // Create the linked BLS Item
            BLSItem::create([
                'name' => $validated['name'],            
                // Capture prices from request, default to 0 if not provided (permission denied)
                'price1' => $request->input('price1', 0),
                'price2' => $request->input('price2', 0),
                'price3' => $request->input('price3', 0),
                'price4' => $request->input('price4', 0), 
                'addtocart' => $validated['addtocart'],
                'defaultqty' => $validated['defaultqty'],
                'itemgroup_id' => $itemGroup->id,  
                'product_id' => $product->id,   
            ]);
        });

        return redirect()->route('systemconfiguration2.products.index')
            ->with('success', 'Product created successfully.');
    }
    
    /**
     * Show the form for editing the specified product.
     */
    public function edit(SIV_Product $product)
    {
        // Eager load the associated BLSItem to get its prices
        $product->load('blsItem');

        return inertia('SystemConfiguration/InventorySetup/Products/Edit', [
            'product' => $product,
            'categories' => SIV_ProductCategory::orderBy('name')->get(),
            'units' => SIV_Packaging::orderBy('name')->get(),
            'activePriceCategories' => $this->getActivePriceCategories(), // <-- PASS DATA
            'userPermissions' => $this->getUserPermissions(), // <--- PASS THI
        ]);
    }
    /**
     * Update the specified product in storage.
     */
    public function update(Request $request, SIV_Product $product)
    {
        // 1. Validate input
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('siv_products')->ignore($product->id)],
            'displayname' => 'required|string|max:255',
            'costprice' => 'required|numeric|min:0',
            'addtocart' => 'sometimes|boolean',
            'hasexpiry' => 'sometimes|boolean',
            'expirynotice' => 'sometimes|boolean',
            'display' => 'sometimes|boolean',
            'defaultqty' => 'nullable|integer|min:1',
            'reorderlevel' => 'nullable|integer|min:1',
            'category_id' => 'required|exists:siv_productcategories,id',
            'package_id' => 'required|exists:siv_packagings,id',
            
            // New: Allow prices to be validated if present
            'price1' => 'nullable|numeric|min:0',
            'price2' => 'nullable|numeric|min:0',
            'price3' => 'nullable|numeric|min:0',
            'price4' => 'nullable|numeric|min:0',
        ]);    

        $newCostPrice = (float) $validated['costprice'];
        $costPriceHasChanged = $product->costprice != $newCostPrice;

        if ($costPriceHasChanged) {
            $validated['prevcost'] = $product->costprice; 
            $validated['averagecost'] = $newCostPrice;    
        }

        // Ensure proper boolean casting
        $validated['addtocart'] = $request->boolean('addtocart');
        $validated['hasexpiry'] = $request->boolean('hasexpiry');
        $validated['expirynotice'] = $request->boolean('expirynotice');
        $validated['display'] = $request->boolean('display');
        $validated['defaultqty'] = $validated['defaultqty'] ?? 1;
        $validated['reorderlevel'] = $validated['reorderlevel'] ?? 1;

        // Use a transaction for data integrity
        DB::transaction(function () use ($product, $validated, $costPriceHasChanged, $newCostPrice, $request) {
            // Update the product with all validated data
            $product->update($validated);
            
            if ($costPriceHasChanged) {
                BILProductCostLog::create([
                    'sysdate' => now(),
                    'transdate' => now(), 
                    'product_id' => $product->id,
                    'costprice' => $newCostPrice,
                ]);
            }
            
            // Logic for Linked BLS Item
            if ($product->blsItem) { 
                // Prepare base update data
                $blsUpdateData = [
                    'name' => $validated['name'],            
                    'addtocart' => $validated['addtocart'],
                    'defaultqty' => $validated['defaultqty'],
                ];

                // Conditionally update prices ONLY if they were sent in the request
                // This prevents overwriting existing prices if the user didn't have permission to edit them
                if ($request->has('price1')) $blsUpdateData['price1'] = $request->input('price1');
                if ($request->has('price2')) $blsUpdateData['price2'] = $request->input('price2');
                if ($request->has('price3')) $blsUpdateData['price3'] = $request->input('price3');
                if ($request->has('price4')) $blsUpdateData['price4'] = $request->input('price4');

                $product->blsItem->update($blsUpdateData);

            } else {
                // Fallback: If BLS item missing, create it
                $itemGroup = BLSItemGroup::firstOrCreate(['name' => 'Inventory']);
                $product->blsItem()->create([
                    'name' => $validated['name'],
                    // If creating fresh, grab input or default to 0
                    'price1' => $request->input('price1', 0),
                    'price2' => $request->input('price2', 0),
                    'price3' => $request->input('price3', 0),
                    'price4' => $request->input('price4', 0), 
                    'itemgroup_id' => $itemGroup->id,
                    'addtocart' => $validated['addtocart'],
                    'defaultqty' => $validated['defaultqty'],                    
                ]);
            }
        });

        return redirect()->route('systemconfiguration2.products.index')
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Remove the specified product from storage.
     */
   

    /**
     * Remove the specified product from storage.
     */
    public function destroy(SIV_Product $product)
    {
        // 1. Check if the PRODUCT is used in Inventory transactions
        $isUsed = false;
        if (IVIssueItem::where('product_id', $product->id)->exists()) $isUsed = true;
        elseif (IVReceiveItem::where('product_id', $product->id)->exists()) $isUsed = true;
        elseif (IVNormalAdjustmentItem::where('product_id', $product->id)->exists()) $isUsed = true;
        elseif (IVPhysicalInventoryItem::where('product_id', $product->id)->exists()) $isUsed = true;
        elseif (IVRequistionItem::where('product_id', $product->id)->exists()) $isUsed = true;

        if ($isUsed) {
            return redirect()->route('systemconfiguration2.products.index')
                ->with('error', 'Unable to delete: This product is currently associated with inventory transactions.');
        }

        // 2. Find Linked BLS Item and Check Billing Transactions
        $linkedItem = BLSItem::where('product_id', $product->id)->first();

        if ($linkedItem) {
            $itemIsUsed = false;
            if (BILInvoiceItem::where('item_id', $linkedItem->id)->exists()) $itemIsUsed = true;
            elseif (BILOrderItem::where('item_id', $linkedItem->id)->exists()) $itemIsUsed = true;
            elseif (BILReceiptItem::where('item_id', $linkedItem->id)->exists()) $itemIsUsed = true;
            elseif (BILSaleItem::where('item_id', $linkedItem->id)->exists()) $itemIsUsed = true;

            if ($itemIsUsed) {
                return redirect()->route('systemconfiguration2.products.index')
                    ->with('error', 'Unable to delete: The linked Sales Item is used in billing transactions.');
            }
        }

        // 3. Attempt deletion of both Product and Linked Item
        try {
            DB::transaction(function () use ($product, $linkedItem) {
                // If there is a linked BLS Item, delete it first
                if ($linkedItem) {
                    $linkedItem->delete();
                }
                // Delete the Product
                $product->delete();
            });
        } catch (QueryException $e) {
            return redirect()->route('systemconfiguration2.products.index')
                ->with('error', 'Unable to delete: Database integrity constraint violation.');
        }

        return redirect()->route('systemconfiguration2.products.index')
            ->with('success', 'Product (and linked sales item) deleted successfully.');
    }
    /**
     * Search products for AJAX requests.
     */
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

        $fileName = 'products_import_template.xlsx';

        $headers = [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            'Content-Length' => filesize($path), // Adding Content-Length can help
        ];

        // Use response()->file() as a modern and efficient alternative
        return response()->file($path, $headers);
    }

    /**
     * Quickly update the cost price of a single product.
     * This is intended for AJAX calls from the index page.
     */
    // ...
    public function updatePrice(Request $request, SIV_Product $product)
    {
        $validated = $request->validate([
            'costprice' => 'required|numeric|min:0',
        ]);

        $newCostPrice = (float) $validated['costprice'];

        try {
            DB::transaction(function () use ($product, $newCostPrice) {
                
                // 1. Update cost fields
                $product->prevcost = $product->costprice;
                $product->costprice = $newCostPrice;
                
                // 2. Correct the average cost to this new value.
                // This is the standard practice for a manual re-valuation.
                $product->averagecost = $newCostPrice;
                
                $product->save();

                // 3. Log the change
                BILProductCostLog::create([
                    'sysdate' => now(),
                    'transdate' => now(),
                    'product_id' => $product->id,
                    'costprice' => $newCostPrice,
                ]);
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while updating the price.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Cost price updated successfully.',
        ]);
    }

    public function getAllForStore(Request $request)
    {
        $storeId = $request->input('store_id');

        if (!$storeId || !is_numeric($storeId)) {
            return response()->json(['error' => 'Invalid Store ID'], 400);
        }

        $qtyColumn = 'iv_productcontrol.qty_' . (int)$storeId;

        // Fetch all products with their price and stock for this store
        // Removed 'take(10)' limit to get everything
        $products = SIV_Product::leftJoin('iv_productcontrol', 'iv_productcontrol.product_id', '=', 'siv_products.id')
            ->select(
                'siv_products.id', 
                'siv_products.name', 
                'siv_products.costprice as price',
                \DB::raw("COALESCE($qtyColumn, 0) as stock_quantity")
            )
            ->orderBy('siv_products.name', 'asc')
            ->get();

        return response()->json(['products' => $products]);
    }
    
}

