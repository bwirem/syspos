<?php

namespace App\Http\Controllers;

use App\Models\PROTender;
use App\Models\PROTenderItem;
use App\Models\PROTenderQuotation;

use App\Models\PROPurchase;
use App\Models\FacilityOption;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage; // Import the Storage facade
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

use Inertia\Inertia;
use Illuminate\Support\Facades\Validator; // Import Validator

use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;


class PROTenderController extends Controller
{
    /**
     * Display a listing of tenders.
     */
    
     public function index(Request $request)
     {
         $query = PROTender::with(['tenderitems']); // Eager load tender items and customer
     
         // Filtering by customer name using relationship
         if ($request->filled('search')) {            
             $query->where('description', 'like', '%' . $request->search . '%');          
         }
     
         // Filtering by stage (Ensure 'stage' exists in the PROTender model)
         if ($request->filled('stage')) {
             $query->where('stage', $request->stage);
         }

         $query->where('stage', '<=', '3');
     
         // Paginate and sort tenders
         $tenders = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('ProTender/Index', [
             'tenders' => $tenders,
             'filters' => $request->only(['search', 'stage']),
         ]);
     }
     

    /**
     * Show the form for creating a new tender.
     */
    public function create()
    {    
        $facilityoption = FacilityOption::first();      
        return inertia('ProTender/Create',[
            'facilityoption'=>$facilityoption,
        ]);
    }

    /**
     * Store a newly created tender in storage.
     */
    
    public function store(Request $request)
    {
        // Validate input
        $validated = $request->validate([             
            'description' => 'nullable|string|max:255', //validate store id          
            'facility_id' => 'required|exists:facilityoptions,id', //validate store id       
            'stage' => 'required|integer|min:1',
            'tenderitems' => 'required|array',
            'tenderitems.*.item_id' => 'required|exists:siv_products,id',  
            'tenderitems.*.quantity' => 'required|numeric|min:0',              
        ]);

    
        // Begin database transaction
        DB::transaction(function () use ($validated) {
        
            $transdate = Carbon::now(); 
            $tender = PROTender::create([
                'transdate' => $transdate,
                'description' => $validated['description'],
                'facilityoption_id' => $validated['facility_id'],
                'stage' => $validated['stage'],               
                'user_id' => Auth::id(),
            ]);    
    
            // Create associated tender items
            foreach ($validated['tenderitems'] as $item) {
                $tender->tenderitems()->create([
                    'product_id' => $item['item_id'],
                    'quantity' => $item['quantity'],                    
                ]);
            }     
        
        });
    
        return redirect()->route('procurements0.index')->with('success', 'Tender created successfully.');
    }    

    /**
     * Show the form for editing the specified tender.
     */
    
    public function edit(PROTender $tender)
    {

        // Always load 'facilityoption'
        $relations = ['facilityoption'];

        // Conditionally add other relationships
        if ($tender->stage != "2") {
            $relations[] = 'tenderitems.item';
        } else {
            $relations[] = 'tenderitems.item';
            $relations[] = 'tenderquotations.supplier'; // Correct relationship
        }

        // Load all required relationships in a single query
        $tender->load($relations);

        // Determine the appropriate page based on the stage value
        $page = $tender->stage != "2" ? 'ProTender/Edit' : 'ProTender/Quatation';

        // --- TRANSFORMATION (This is the key part) ---
        if ($tender->stage == "2") { // Only transform if on the Quatation page
            $tender->tenderquotations->transform(function ($quotation) {
                return [
                    'id'        => $quotation->id,
                    'item_name' => $quotation->supplier ? $quotation->supplier->name : '', // Map supplier name
                    'item_id'   => $quotation->supplier ? $quotation->supplier->id : null, // Map supplier ID
                    //'url' => basename($quotation->url), // Extract filename from path.  VERY IMPORTANT!
                    'url' => $quotation->url, // Extract filename from path.  VERY IMPORTANT!
                    'filename' => $quotation->filename,                     
                    'file'=> null,
                    // Add any other fields from $quotation you need in the frontend
                ];
            });
        }
        // --- END TRANSFORMATION ---

        return inertia($page, [
            'tender' => $tender,
        ]);
    }

    public function update(Request $request, PROTender $tender)
    {
        // Validate input
        $validated = $request->validate([             
            'description' => 'nullable|string|max:255', //validate store id             
            'facility_id' => 'required|exists:facilityoptions,id', //validate store id  
            'stage' => 'required|integer|min:1',
            'tenderitems' => 'required|array',
            'tenderitems.*.id' => 'nullable|exists:pro_tenderitems,id',
            'tenderitems.*.item_id' => 'required|exists:siv_products,id',
            'tenderitems.*.quantity' => 'required|numeric|min:0',            
        ]);
    
        // Update the tender within a transaction
        DB::transaction(function () use ($validated, $tender) {
            // Retrieve existing item IDs before the update
            $oldItemIds = $tender->tenderitems()->pluck('id')->toArray();
            
            $existingItemIds = [];
            $newItems = [];
    
            foreach ($validated['tenderitems'] as $item) {
                if (!empty($item['id'])) {
                    $existingItemIds[] = $item['id'];
                } else {
                    $newItems[] = $item;
                }
            }
    
            // Identify and delete removed items
            $itemsToDelete = array_diff($oldItemIds, $existingItemIds);
            $tender->tenderitems()->whereIn('id', $itemsToDelete)->delete();
    
            // Add new items
            foreach ($newItems as $item) {
                $tender->tenderitems()->create([
                    'product_id' => $item['item_id'],
                    'quantity' => $item['quantity'],                   
                ]);
            }
    
            // Update existing items
            foreach ($validated['tenderitems'] as $item) {
                if (!empty($item['id'])) {
                    $tenderItem = PROTenderItem::find($item['id']);
    
                    if ($tenderItem) {
                        $tenderItem->update([
                            'product_id' => $item['item_id'],
                            'quantity' => $item['quantity'],                            
                        ]);
                    }
                }
            }
                   
            // Update the tender details
            $tender->update([                 
                'description' => $validated['description'],
                'facilityoption_id' => $validated['facility_id'],
                'stage' => $validated['stage'],                
                'user_id' => Auth::id(),
            ]);
        });
    
        return redirect()->route('procurements0.index')->with('success', 'Tender updated successfully.');
    }

    public function quotation(Request $request, PROTender $tender)
    {
        // Validate request fields
        $validator = Validator::make($request->all(), [
            'description' => 'required|string|max:255',
            'facility_id' => 'required|exists:facilityoptions,id',
            'stage' => 'required|integer|in:1,2,3,5',
            'tenderquotations' => 'sometimes|array',
            'tenderquotations.*.item_id' => 'required|exists:siv_suppliers,id',
            'tenderquotations.*.item_name' => 'required|string',
            'tenderquotations.*.filename' => 'nullable|string',
            'tenderquotations.*.url' => 'nullable|string',
            'tenderquotations.*.type' => 'nullable|string|max:50',
            'tenderquotations.*.size' => 'nullable|integer|min:1',
            'tenderquotations.*.description' => 'nullable|string|max:500',
            'tenderquotations.*.file' => 'nullable|file|mimes:pdf,doc,docx|max:5120', // Validate the file
        ]);
    
        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator);
        }
    
        DB::transaction(function () use ($request, $tender) {
            // Update tender details
            $tender->update([
                'description' => $request->description,
                'facilityoption_id' => $request->facility_id,
                'stage' => $request->stage,
            ]);
    
            $existingQuotationIds = $tender->tenderquotations()->pluck('id')->toArray();
            $updatedQuotationIds = [];
    
            if ($request->has('tenderquotations')) {
                foreach ($request->tenderquotations as $index => $quotationData) {
    
                    // Find or create quotation
                    $quotation = PROTenderQuotation::updateOrCreate(
                        ['tender_id' => $tender->id, 'supplier_id' => $quotationData['item_id']],
                        [
                            'filename' => $quotationData['filename'] ?? null,
                            'url' => $quotationData['url'] ?? null,
                            'type' => $quotationData['type'] ?? null,
                            'size' => $quotationData['size'] ?? null,
                            'description' => $quotationData['description'] ?? null,
                        ]
                    );
    
                    $updatedQuotationIds[] = $quotation->id;
    
                    // Handle file upload
                    if ($request->hasFile("tenderquotations.{$index}.file")) {
                        $file = $request->file("tenderquotations.{$index}.file");
    
                        // Generate a unique filename.  This is CRITICAL to prevent overwriting other files!
                        $filename = uniqid() . '.' . $file->getClientOriginalExtension();
    
                        // Delete old file if exists
                        if ($quotation->url && Storage::disk('public')->exists($quotation->url)) {
                            Storage::disk('public')->delete($quotation->url);
                        }
    
                        // Store file WITH the unique filename
                        $path = $file->storeAs('tender_quotations', $filename, 'public'); //Store with unique name
    
                        $quotation->update([
                            'filename' => $file->getClientOriginalName(), // Store the original file name
                            'url' => $path, // Store the file path in the storage
                            'type' => $file->getClientOriginalExtension(), // Store the file extension
                            'size' => $file->getSize(), // Store the file size in bytes
                        ]);
                    }
                }
    
                // Remove unselected quotations
                $quotationsToDelete = array_diff($existingQuotationIds, $updatedQuotationIds);
    
                PROTenderQuotation::whereIn('id', $quotationsToDelete)->get()->each(function ($quotation) { // Use get() before each
                    if ($quotation->url && Storage::disk('public')->exists($quotation->url)) {
                        Storage::disk('public')->delete($quotation->url);
                    }
                    $quotation->delete();
                });

                
            } else {
                // If no quotations, delete all existing ones
                $tender->tenderquotations()->get()->each(function ($quotation) { // Use get() before each
                    if ($quotation->url && Storage::disk('public')->exists($quotation->url)) {
                        Storage::disk('public')->delete($quotation->url);
                    }
                    $quotation->delete();
                });
            }
        });
    
        return redirect()->route('procurements0.index')->with('success', 'Tender updated successfully.');
    }  
    
  
    
    public function award(Request $request, PROTender $tender)
    {
        Log::info('Start processing tender award:', ['tender' => $tender, 'request_data' => $request->all()]);

        // 1. Validate the request data
        $validator = Validator::make($request->all(), [
            'supplier.item_id' => 'required|exists:siv_suppliers,id',
            'url' => 'nullable|string',
            'filename' => 'nullable|string',
            'remarks' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            Log::error('Validation errors:', $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // 2. Extract data from the request
        $supplierId = $request->input('supplier.item_id');
        $url = $request->input('url');
        $filename = $request->input('filename');
        $remarks = $request->input('remarks');

        try {
            // Begin database transaction
            DB::transaction(function () use ($tender, $supplierId, $url, $filename,$remarks) { // Pass $url and $filename to use
                $transdate = Carbon::now();

                // Create the PROPurchase
                $purchase = PROPurchase::create([
                    'transdate' => $transdate,
                    'supplier_id' => $supplierId,
                    'facilityoption_id' => $tender->facilityoption_id,
                    'stage' => 1,
                    'total' => 0, // Will update later
                    'url' => $url, // Set the URL
                    'filename' => $filename, // Set the filename
                    'remarks' => $remarks, // Set the filename
                    'user_id' => Auth::id(),
                ]);

                // Load tender items
                $tenderItems = $tender->tenderitems;  // Access tenderitems as a property

                $total = 0;  // Initialize total

                // Create associated PROPurchase items
                foreach ($tenderItems as $item) {
                    // Fetch product price (replace with your actual logic)
                    $productPrice = $this->getProductPrice($item->product_id);

                    // Create purchase item
                    $purchaseItem = $purchase->purchaseitems()->create([
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'price' => $productPrice, // Assign fetched price
                    ]);

                    $total += $item->quantity * $productPrice;  // Update total
                }

                // Update PROPurchase total
                $purchase->update(['total' => $total]);
            });

            // Update Tender Stage and other details
            $tender->stage = 3;
            // $tender->awarded_url = $url;
            // $tender->awarded_filename = $filename;
            $tender->save();

            Log::info('Tender awarded successfully:', ['tender_id' => $tender->id, 'supplier_id' => $supplierId]);
            return response()->json(['message' => 'Tender awarded successfully'], Response::HTTP_OK);

        } catch (\Exception $e) {
            Log::error('Error awarding tender:', ['tender_id' => $tender->id, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Failed to award tender. Please try again.', 'error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    // Helper function to get product price (replace with your actual logic)
    private function getProductPrice($productId)
    {
        // Example: Fetch price from a products table
        // $product = Product::find($productId);
        // return $product ? $product->price : 0;

        // Replace this with your actual implementation
        return 0;  // Default price
    }

       
    /**
     * Remove the specified tender from storage.
     */
    public function destroy(PROTender $tender)
    {
        // Delete the tender and associated items
        $tender->tenderitems()->delete();
        $tender->delete();

        return redirect()->route('procurements0.index')
            ->with('success', 'Tender deleted successfully.');
    }
}
