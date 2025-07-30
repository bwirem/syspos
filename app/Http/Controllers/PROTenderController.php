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


        $tender = null; // Initialize tender variable

    
        // Begin database transaction
        DB::transaction(function () use ($validated, & $tender) {
        
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

        if ($tender) {
            return redirect()->route('procurements0.edit', $tender->id)
                ->with('success', 'Tender created successfully. You can now add items.');
        }else {
             return back()->withInput()->with('error', 'Failed to create tender due to an unexpected issue after transaction.');
        }       
       
    }    

    /**
     * Show the form for editing the specified tender.
     */
    
     public function edit(PROTender $tender)
     {
         // Always load 'facilityoption'
         $relations = ['facilityoption', 'tenderitems.item'];
     
         // Conditionally add quotation relationships
         if ($tender->stage != "1") {
             $relations[] = 'tenderquotations.supplier';
         }
     
         // Load all necessary relationships
         $tender->load($relations);
     
         // Determine the correct page based on stage
         if ($tender->stage == "2") {
             $page = 'ProTender/Quatation';
         } elseif ($tender->stage == "3") {
             $page = 'ProTender/Evaluation';
         } else {
             $page = 'ProTender/Edit';
         }
     
         // Transform quotations only if beyond stage 1
         if ($tender->stage != "1") {
            $tender->tenderquotations->transform(function ($quotation) {
                return [
                    'id'        => $quotation->id,
                    'supplier_name' => $quotation->supplier ? 
                        ($quotation->supplier->supplier_type === 'individual' 
                            ? "{$quotation->supplier->first_name} " . 
                              ($quotation->supplier->other_names ? "{$quotation->supplier->other_names} " : '') . 
                              "{$quotation->supplier->surname}" 
                            : $quotation->supplier->company_name) 
                        : '',
                    'supplier_id'   => $quotation->supplier?->id ?? null,
                    'url'       => $quotation->url,
                    'filename'  => $quotation->filename,
                    'file'      => null,
                ];
            });
            
         }
     
         return inertia($page, [
             'tender' => $tender,
         ]);
     }
     

    public function update(Request $request, PROTender $tender)
    {
        if($tender->stage == "1" ){
          
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

        }else{

            $validated = $request->validate([            
                
                'stage' => 'required|integer|min:1',
                'remarks' => 'required|string|max:255',                 
            ]);

            // Update the tender details
            $tender->update([   
                'stage' => $validated['stage'],                
                'user_id' => Auth::id(),
            ]);
            
        }

        if($tender->stage == "1" ){
            return redirect()->route('procurements0.index')
                ->with('success', 'Tender updated successfully. You can now add items.');
           
        }else{
           
            return redirect()->route('procurements0.edit', $tender->id)
            ->with('success', 'Tender updated successfully. You can now add quotations.');    
        }
    
        
    }

    public function quotation(Request $request, PROTender $tender)
    {
        // Validate request fields (Your existing validation seems mostly okay, but ensure filename/url allow null if appropriate)
        $validator = Validator::make($request->all(), [
            'description' => 'sometimes|required|string|max:255', // 'sometimes' if not always sent or part of this specific update
            'facility_id' => 'sometimes|required|exists:facilityoptions,id',
            'stage' => 'sometimes|required|integer|in:1,2,3,5',
            'tenderquotations' => 'sometimes|array',
            'tenderquotations.*.id' => 'nullable|integer|exists:pro_tenderquotations,id', // ID of existing quotation
            'tenderquotations.*.item_id' => 'required|exists:siv_suppliers,id', // This is supplier_id
            'tenderquotations.*.item_name' => 'required|string', // This is supplier_name (for validation display mostly)
            'tenderquotations.*.file' => 'nullable|file|mimes:pdf,doc,docx|max:5120', // 5MB
            // The following are mostly for data coming from frontend if no new file / or for existing records
            // If a new file is uploaded, these will be overridden by the file's properties.
            'tenderquotations.*.filename' => 'nullable|string|max:255',
            'tenderquotations.*.url' => 'nullable|string|max:255',
            'tenderquotations.*.type' => 'nullable|string|max:100',
            'tenderquotations.*.size' => 'nullable|integer',
            'tenderquotations.*.description' => 'nullable|string|max:500',
            'tenderquotations.*.remove_file' => 'nullable|in:true,false',
        ]);

        if ($validator->fails()) {
            // Important: Log the errors to see what exactly failed validation
            \Log::error('Quotation Validation Failed:', $validator->errors()->toArray());
            return redirect()->back()->withErrors($validator)->withInput();
        }

        DB::transaction(function () use ($request, $tender) {
            // Update tender details if they are part of this request's responsibility
            if ($request->has('description') && $request->has('facility_id') && $request->has('stage')) {
                $tender->update([
                    'description' => $request->description,
                    'facilityoption_id' => $request->facility_id, // Match your DB column name
                    'stage' => $request->stage,
                ]);
            }

            $existingQuotationIds = $tender->tenderquotations()->pluck('id')->toArray();
            $processedQuotationIds = []; // Keep track of IDs processed in this request

            if ($request->has('tenderquotations')) {
                foreach ($request->tenderquotations as $index => $quotationData) {
                    $fileDataForDb = []; // Initialize array for file-related DB data

                    // Handle file upload FIRST if a file is present for this entry
                    if ($request->hasFile("tenderquotations.{$index}.file")) {
                        $file = $request->file("tenderquotations.{$index}.file");
                        $uniqueStorageFilename = uniqid('quotation_') . '_' . time() . '.' . $file->getClientOriginalExtension();
                        $path = $file->storeAs('tender_quotations/' . $tender->id, $uniqueStorageFilename, 'public');

                        $fileDataForDb = [
                            'filename' => $file->getClientOriginalName(), // User-friendly original name
                            'url' => $path,                              // Actual storage path/URL
                            'type' => $file->getClientMimeType(),       // MIME type
                            'size' => $file->getSize(),                  // Size in bytes
                            'description' => $quotationData['description'] ?? $file->getClientOriginalName(), // Use provided desc or filename
                        ];
                    } else {
                        // No new file uploaded for this entry.
                        // Use existing data from frontend if it's an update to non-file fields, or if it's a new entry without a file.
                        // Crucially, these values from frontend should be '' or actual values, not null, if DB columns are NOT NULL.
                        // If DB columns are NULLABLE, then `?? null` is fine.
                        // Assuming DB columns are NOT NULL and frontend sends '' for empty:
                        $fileDataForDb = [
                            'filename' => $quotationData['filename'] ?? '',
                            'url' => $quotationData['url'] ?? '', // This will be '' for a new entry without a file
                            'type' => $quotationData['type'] ?? '',
                            'size' => $quotationData['size'] ?? 0,
                            'description' => $quotationData['description'] ?? ($quotationData['filename'] ?? ''),
                        ];
                    }

                    // Prepare data for updateOrCreate, excluding file data if new file was processed
                    $attributesToFind = [
                        'tender_id' => $tender->id,
                        'supplier_id' => $quotationData['item_id']
                    ];
                    if (!empty($quotationData['id'])) { // If an existing quotation ID is provided
                        $attributesToFind = ['id' => $quotationData['id']];
                    }


                    $valuesToSet = [
                        'tender_id' => $tender->id, // Ensure tender_id is always set
                        'supplier_id' => $quotationData['item_id'], // Ensure supplier_id is always set
                        // Non-file related fields that might be updated or set initially
                        // 'price' => $quotationData['price'] ?? 0,
                        // 'notes' => $quotationData['notes'] ?? '',
                    ];

                    // Merge file data. If a new file was uploaded, $fileDataForDb contains fresh info.
                    // If no new file, it contains data sent from frontend (possibly for existing file or empty).
                    $valuesToSet = array_merge($valuesToSet, $fileDataForDb);


                    // Before updateOrCreate, check if it's an existing record to handle file deletion
                    $existingRecord = null;
                    if(!empty($quotationData['id'])) {
                        $existingRecord = PROTenderQuotation::find($quotationData['id']);
                    } else {
                        // Attempt to find by tender_id and supplier_id if no ID given (for true create part of updateOrCreate)
                        $existingRecord = PROTenderQuotation::where('tender_id', $tender->id)
                                                        ->where('supplier_id', $quotationData['item_id'])
                                                        ->first();
                    }

                    // If a new file was uploaded for an existing record, delete the old physical file.
                    if ($request->hasFile("tenderquotations.{$index}.file") && $existingRecord && $existingRecord->url) {
                        if (Storage::disk('public')->exists($existingRecord->url)) {
                            Storage::disk('public')->delete($existingRecord->url);
                        }
                    }
                    // Handle explicit file removal for existing records
                    elseif (filter_var($quotationData['remove_file'] ?? false, FILTER_VALIDATE_BOOLEAN) && $existingRecord && $existingRecord->url) {
                        if (Storage::disk('public')->exists($existingRecord->url)) {
                            Storage::disk('public')->delete($existingRecord->url);
                        }
                        // Set file attributes to null/empty for DB if file is removed
                        $valuesToSet['filename'] = ''; // Or null if DB allows
                        $valuesToSet['url'] = '';      // Or null if DB allows
                        $valuesToSet['type'] = '';      // Or null if DB allows
                        $valuesToSet['size'] = 0;       // Or null if DB allows
                    }


                    $quotation = PROTenderQuotation::updateOrCreate(
                        $attributesToFind, // Use ID if present for finding, otherwise tender_id & supplier_id
                        $valuesToSet       // Values to update or create with (now includes correct file info)
                    );

                    $processedQuotationIds[] = $quotation->id;
                }
            }

            // Remove quotations that were in DB but not in the current request's processed list
            $quotationsToDelete = array_diff($existingQuotationIds, $processedQuotationIds);
            if (!empty($quotationsToDelete)) {
                $quotations = PROTenderQuotation::whereIn('id', $quotationsToDelete)->get();
                foreach($quotations as $q) {
                    if ($q->url && Storage::disk('public')->exists($q->url)) {
                        Storage::disk('public')->delete($q->url);
                    }
                    $q->delete();
                }
            }

        });


        if($tender->stage == "2" ){
            return redirect()->route('procurements0.index')
                             ->with('success', 'Tender quotations updated successfully.');
           
        }else{
           
            return redirect()->route('procurements0.edit', $tender->id)
                            ->with('success', 'Tender quotations updated successfully. You can now add evaluations.');    
        }

       
    }
  
    
    public function award(Request $request, PROTender $tender)
    {
        //Log::info('Start processing tender award:', ['tender' => $tender, 'request_data' => $request->all()]);

        // 1. Validate the request data
        $validator = Validator::make($request->all(), [
            'awarded_supplier_id' => 'required|exists:siv_suppliers,id',
            'url' => 'nullable|string',
            'filename' => 'nullable|string',
            'remarks' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            Log::error('Validation errors:', $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // 2. Extract data from the request
        $supplierId = $request->input('awarded_supplier_id');
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
            $tender->stage = 4;
            // $tender->awarded_url = $url;
            // $tender->awarded_filename = $filename;
            $tender->save();

            return redirect()->route('procurements0.index')->with('success', 'Tender awarded successfully.');

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
