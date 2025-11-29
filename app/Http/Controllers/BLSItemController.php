<?php
namespace App\Http\Controllers;

use App\Models\BLSItem;
use App\Models\BLSItemGroup;
use App\Models\BLSPriceCategory;

use App\Models\BILInvoiceItem;
use App\Models\BILOrderItem;
use App\Models\BILReceiptItem;
use App\Models\BILSaleItem;    

use App\Models\SIV_Store;
use App\Models\SIV_Product;
use App\Models\IVIssueItem;
use App\Models\IVReceiveItem;
use App\Models\IVNormalAdjustmentItem;
use App\Models\IVPhysicalInventoryItem;
use App\Models\IVRequistionItem;
use Illuminate\Support\Facades\DB; // Ensure DB is imported
use Illuminate\Database\QueryException;



use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;

class BLSItemController extends Controller
{
    /**
     * Display a listing of items.
     */
    public function index(Request $request)
    {
       // 1. UPDATE: Add 'product.category' to the with() clause
        $query = BLSItem::with(['itemgroup', 'product.category']); 

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                ->orWhereHas('itemgroup', function ($subQuery) use ($search) {
                    $subQuery->where('name', 'like', '%' . $search . '%');
                });
            });
        }
        
        // Order by itemgroup name, then item name
        $query->orderBy(
            BLSItemGroup::select('name')
                ->whereColumn('bls_itemgroups.id', 'bls_items.itemgroup_id')
        )->orderBy('name', 'asc');

        $items = $query->paginate(50)->withQueryString();

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
            
            // Ensure error is passed correctly as requested previously
            'error' => session('error') ? [
                'message' => session('error'),
                'time' => microtime(true)
            ] : null,

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
        
        // --- MODIFIED LOGIC START ---
        // If an item is linked to stock, check if user tried to change Name or Group
        if ($item->product_id) {
            
            // Check if the requested Name is different from the current Name
            if ($validated['name'] !== $item->name) {
                return redirect()->back()
                    ->with('error', 'Cannot update Name: This item is linked to Inventory. Please rename it via the Products interface.');
            }

            // Check if the requested Group is different from the current Group
            if ($validated['itemgroup_id'] != $item->itemgroup_id) {
                return redirect()->back()
                    ->with('error', 'Cannot update Group: This item is linked to Inventory. Please update the Category via the Products interface.');
            }

            // Safety precaution: Remove them from update array just in case
            unset($updateData['name'], $updateData['itemgroup_id']);
        }
        // --- MODIFIED LOGIC END ---
    
    
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
        // 1. Check if the ITEM itself is used in Billing transactions
        $isUsed = false;
        if (BILInvoiceItem::where('item_id', $item->id)->exists()) $isUsed = true;
        elseif (BILOrderItem::where('item_id', $item->id)->exists()) $isUsed = true;
        elseif (BILReceiptItem::where('item_id', $item->id)->exists()) $isUsed = true;
        elseif (BILSaleItem::where('item_id', $item->id)->exists()) $isUsed = true;

        if ($isUsed) {
            return redirect()->route('systemconfiguration0.items.index')
                ->with('error', 'Cannot delete item: It has been used in existing billing transactions.');
        }

        // 2. Check if linked to a PRODUCT and if that product is used in Inventory transactions
        if ($item->product_id) {
            $productIsUsed = false;
            if (IVIssueItem::where('product_id', $item->product_id)->exists()) $productIsUsed = true;
            elseif (IVReceiveItem::where('product_id', $item->product_id)->exists()) $productIsUsed = true;
            elseif (IVNormalAdjustmentItem::where('product_id', $item->product_id)->exists()) $productIsUsed = true;
            elseif (IVPhysicalInventoryItem::where('product_id', $item->product_id)->exists()) $productIsUsed = true;
            elseif (IVRequistionItem::where('product_id', $item->product_id)->exists()) $productIsUsed = true;

            if ($productIsUsed) {
                return redirect()->route('systemconfiguration0.items.index')
                    ->with('error', 'Cannot delete item: The linked Inventory Product is used in inventory transactions.');
            }
        }

        // 3. Attempt deletion of both Item and Linked Product
        try {
            DB::transaction(function () use ($item) {
                // If there is a linked product, delete it first (or second, depending on FK constraints)
                if ($item->product_id) {
                    $linkedProduct = SIV_Product::find($item->product_id);
                    if ($linkedProduct) {
                        $linkedProduct->delete();
                    }
                }
                // Delete the Item
                $item->delete();
            });
        } catch (QueryException $e) {
            return redirect()->route('systemconfiguration0.items.index')
                ->with('error', 'Unable to delete: Database integrity constraint violation.');
        }

        return redirect()->route('systemconfiguration0.items.index')
            ->with('success', 'Item (and linked stock product) deleted successfully.');
    }


    /**
     * Search for items based on query.
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $priceCategoryId = $request->input('pricecategory_id', 'price1'); 
        $storeId = $request->input('store_id', null); // Get the store_id from the request

        // Ensure only allowed price columns are used
        if (!in_array($priceCategoryId, ['price1', 'price2', 'price3', 'price4'])) {
            $priceCategoryId = 'price1';
        }

        // Start building the query on BLSItem
        $itemsQuery = BLSItem::where('bls_items.name', 'like', '%' . $query . '%')
            ->select(
                'bls_items.id', 
                'bls_items.name', 
                'bls_items.product_id', // Useful to have for reference
                "bls_items.$priceCategoryId as price"
            );

        // Append Stock Quantity Logic
        if ($storeId && is_numeric($storeId) && (int)$storeId > 0) {
            // Construct dynamic column name based on store ID (e.g., qty_1, qty_2)
            $qtyColumn = 'iv_productcontrol.qty_' . (int)$storeId;

            // Join with inventory control to get stock
            // We link BLSItem to Inventory Control via the product_id field
            $itemsQuery->leftJoin('iv_productcontrol', 'iv_productcontrol.product_id', '=', 'bls_items.product_id')
                       ->addSelect(\DB::raw("COALESCE($qtyColumn, 0) as stock_quantity"));
        } else {
            // Default stock to 0 if no store is selected
            $itemsQuery->addSelect(\DB::raw('0 as stock_quantity'));
        }

        $items = $itemsQuery->take(10)->get();

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

    /**
     * Check which stores have stock > 0 for a specific item.
     * Used by the Point of Sale when default store is empty.
     */
    public function checkAvailability($itemId)
    {
        $item = BLSItem::find($itemId);

        // If item doesn't exist or isn't linked to inventory product, return empty
        if (!$item || !$item->product_id) {
            return response()->json([]);
        }

        $stores = SIV_Store::all();
        
        // Fetch the inventory control record for this product
        $productControl = DB::table('iv_productcontrol')
                            ->where('product_id', $item->product_id)
                            ->first();

        $availableStoreIds = [];

        if ($productControl) {
            foreach ($stores as $store) {
                // Construct the column name (e.g., qty_1, qty_2)
                $col = 'qty_' . $store->id;

                // Check if the column exists in the result and has positive stock
                if (isset($productControl->$col) && (float)$productControl->$col > 0) {
                    $availableStoreIds[] = $store->id;
                }
            }
        }

        return response()->json($availableStoreIds);
    }

}

