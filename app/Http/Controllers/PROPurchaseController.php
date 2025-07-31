<?php

namespace App\Http\Controllers;

use App\Models\PROPurchase;
use App\Models\PROPurchaseItem;

use App\Models\SIV_Supplier;
use App\Models\IVReceive;
use App\Models\IVReceiveItem;
use App\Enums\StoreType; // Assuming you have a StoreType enums

use App\Models\FacilityOption;
use App\Models\SIV_Store;    // Assuming you have a Store Model

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

use Illuminate\Support\Facades\Storage;  // Import Storage facade
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException; // For custom validation exceptions
use App\Models\SIV_Product; // Assuming you have a Product model


// Add necessary imports for PDF generation
use Barryvdh\DomPDF\Facade\Pdf;  // If using barryvdh/laravel-dompdf  


class PROPurchaseController extends Controller
{
    /**
     * Display a listing of purchases.
     */
    
     public function index(Request $request)
     {
         $query = PROPurchase::with(['purchaseitems', 'supplier']); // Eager load purchase items and customer
     
         // Filtering by customer name using relationship       

         if ($request->filled('search')) {
            $query->whereHas('supplier', function ($q) use ($request) {                 
                $q->where('first_name', 'like', '%' . $request->search . '%')
               ->orWhere('surname', 'like', '%' . $request->search . '%')
               ->orWhere('other_names', 'like', '%' . $request->search . '%')
               ->orWhere('company_name', 'like', '%' . $request->search . '%');
            });
        }
     
         // Filtering by stage (Ensure 'stage' exists in the PROPurchase model)
         if ($request->filled('stage')) {
             $query->where('stage', $request->stage);
         }

         $query->where('stage', '<', '4');
     
         // Paginate and sort purchases
         $purchases = $query->orderBy('created_at', 'desc')->paginate(10);
     
         return inertia('ProPurchase/Index', [
             'purchases' => $purchases,
             'filters' => $request->only(['search', 'stage']),
         ]);
     }
     

    /**
     * Show the form for creating a new purchase.
     */
    public function create()
    {
        $facilityoption = FacilityOption::first();      
        return inertia('ProPurchase/Create',[
            'facilityoption'=>$facilityoption,
        ]);      
    }

    /**
     * Store a newly created purchase in storage.
     */
        
    public function store(Request $request)
    {
        //Log::info('Start processing purchase creation:', ['request_data' => $request->all()]);

        // 1. Validate input
        $validator = Validator::make($request->all(), [
            'supplier_id' => 'required|exists:siv_suppliers,id',
            'facility_id' => 'required|exists:facilityoptions,id',
            'stage' => 'required|integer|min:1',
            'purchaseitems' => 'required|array',
            'purchaseitems.*.item_id' => 'required|exists:siv_products,id',
            'purchaseitems.*.quantity' => 'required|numeric|min:0',
            'purchaseitems.*.price' => 'required|numeric|min:0',
            'remarks' => 'nullable|string|max:255',
            'file' => 'nullable|file|mimes:pdf,doc,docx|max:5120', // Adjust mimes and size as needed
        ]);

        if ($validator->fails()) {
            Log::error('Validation errors:', $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $validator->validated();  // Get the validated data


        try {
            // 2. Handle File Upload
            $url = null;
            $filename = null;

            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $filename = time() . '_' . $file->getClientOriginalName();  // Generate unique filename
                $url = $file->storeAs('purchases', $filename, 'public');  // Store in storage/app/public/purchases
            }

            // 3. Declare $purchase BEFORE the transaction
            $purchase = null;

            // Begin database transaction
            DB::transaction(function () use ($validated, $url, $filename, &$purchase) {
                $transdate = Carbon::now();
                // Assign value to $purchase variable inside transaction
                $purchase = PROPurchase::create([
                    'transdate' => $transdate,
                    'supplier_id' => $validated['supplier_id'],
                    'facilityoption_id' => $validated['facility_id'],
                    'stage' => $validated['stage'],
                    'total' => 0, // Will update later
                    'user_id' => Auth::id(),
                    'remarks' => $validated['remarks'] ?? null,  // Store remarks
                    'url' => $url,            // Store the file URL
                    'filename' => $filename,       // Store the filename
                ]);

                // Create associated purchase items
                foreach ($validated['purchaseitems'] as $item) {
                    $purchase->purchaseitems()->create([
                        'product_id' => $item['item_id'],
                        'quantity' => $item['quantity'],
                        'price' => $item['price'],
                    ]);
                }

                $purchase->load('purchaseitems'); // Ensure all items are fetched
                $calculatedTotal = $purchase->purchaseitems->sum(fn($item) => $item->quantity * $item->price);  // Compute total
                $purchase->update(['total' => $calculatedTotal]);
            });


            if ($purchase) {
                return redirect()->route('procurements1.edit', $purchase->id)
                    ->with('success', 'Purchase created successfully. You can now add items.');
            }else {
                return back()->withInput()->with('error', 'Failed to create purchase due to an unexpected issue after transaction.');
            }

        } catch (\Exception $e) {
            Log::error('Error creating purchase:', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Failed to create purchase. Please try again.', 'error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Show the form for editing the specified purchase.
     */
  

    
    public function edit(PROPurchase $purchase)
    {
        // Eager load necessary relationships
        $purchase->load(['supplier', 'facilityoption', 'purchaseitems.item']);

        // Determine which Inertia page component to render based on the purchase stage
        $stage = (int) $purchase->stage; // Cast to integer for reliable comparison
        $pageName = ''; // Use a different variable name to avoid confusion, or remove the first $page assignment

        switch ($stage) {
            case 1: // Pending
                $pageName = 'ProPurchase/Edit'; // Fully editable form
                break;
            case 2: // Approved
                $pageName = 'ProPurchase/Dispatch'; // Dispatch specific page
                break;
            case 3: // Dispatched
                $pageName = 'ProPurchase/Receive'; // Receive specific page
                break;
            case 4: // Received
                // For "Received" stage, you might want a page that shows received details
                // and potentially allows actions like "Mark as Paid" or "Close PO".
                // If Edit.jsx handles this by becoming read-only and showing appropriate buttons, that's fine.
                $pageName = 'ProPurchase/Edit'; // Or 'ProPurchase/ViewReceived' or 'ProPurchase/Close'
                break;
            case 5: // Paid / Completed / Closed etc.
                // Typically a read-only view or a more restricted edit.
                $pageName = 'ProPurchase/Edit'; // Or 'ProPurchase/ViewCompleted'
                break;
            default:
                // Fallback for unknown or unexpected stages
                \Log::warning("Purchase order {$purchase->id} has an unrecognized stage: {$stage}. Falling back to Edit view.");
                $pageName = 'ProPurchase/Edit'; // Fallback to a general edit/view page
                break;
        }

        // Render the determined Inertia page component with the purchase data
        return inertia($pageName, [
            'purchase' => $purchase,
            'stores' => SIV_Store::all(),
            // 'auth' and 'flash' messages are typically shared globally via HandleInertiaRequests middleware
            // 'errors' are also typically shared globally from session for validation errors on redirect back
        ]);
    }
     
        

    /**
     * Update the specified purchase in storage.
     */
 
    public function update(Request $request, PROPurchase $purchase)
    {
       
        // 1. Validate input
        $validator = Validator::make($request->all(), [
            'supplier_id' => 'required|exists:siv_suppliers,id',
            'facility_id' => 'required|exists:facilityoptions,id',
            'total' => 'required|numeric|min:0',
            'stage' => 'required|integer|min:1',
            'purchaseitems' => 'required|array',
            'purchaseitems.*.id' => 'nullable|exists:pro_purchaseitems,id',
            'purchaseitems.*.item_id' => 'required|exists:siv_products,id',
            'purchaseitems.*.quantity' => 'required|numeric|min:0',
            'purchaseitems.*.price' => 'required|numeric|min:0',
            'remarks' => 'nullable|string|max:255',
            'file' => 'nullable|file|mimes:pdf,doc,docx|max:5120', // Adjust mimes and size as needed
        ]);

        if ($validator->fails()) {
            Log::error('Validation errors:', $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $validator->validated();
    
        try {
            // Begin database transaction
            DB::transaction(function () use ($validated, $request, $purchase) {

                // 2. Handle File Upload
                $url = $purchase->url; // Keep the old url
                $filename = $purchase->filename; // Keep the old filename

                if ($request->hasFile('file')) {
                    // Delete the old file (if it exists)
                    if ($purchase->url) {
                        Storage::disk('public')->delete($purchase->url);
                    }

                    $file = $request->file('file');
                    $filename = time() . '_' . $file->getClientOriginalName();  // Generate unique filename
                    $url = $file->storeAs('purchases', $filename, 'public');  // Store in storage/app/public/purchases
                }


                // Update purchase details, url, and filename
                $purchase->update([
                    'supplier_id' => $validated['supplier_id'],
                    'facilityoption_id' => $validated['facility_id'],
                    'stage' => $validated['stage'],
                    'total' => $validated['total'],
                    'remarks' => $validated['remarks'] ?? null,
                    'url' => $url, // save new url or the same
                    'filename' => $filename,  // save the new filename or the same
                    'user_id' => Auth::id(),
                ]);

                // Retrieve existing item IDs before the update
                $oldItemIds = $purchase->purchaseitems()->pluck('id')->toArray();
                $existingItemIds = [];
                $newItems = [];

                foreach ($validated['purchaseitems'] as $item) {
                    if (!empty($item['id'])) {
                        $existingItemIds[] = $item['id'];
                    } else {
                        $newItems[] = $item;
                    }
                }

                // Identify and delete removed items
                $itemsToDelete = array_diff($oldItemIds, $existingItemIds);
                $purchase->purchaseitems()->whereIn('id', $itemsToDelete)->delete();

                // Add new items
                foreach ($newItems as $item) {
                    $purchase->purchaseitems()->create([
                        'product_id' => $item['item_id'],
                        'quantity' => $item['quantity'],
                        'price' => $item['price'],
                    ]);
                }

                // Update existing items
                foreach ($validated['purchaseitems'] as $item) {
                    if (!empty($item['id'])) {
                        $purchaseItem = PROPurchaseItem::find($item['id']);

                        if ($purchaseItem) {
                            $purchaseItem->update([
                                'product_id' => $item['item_id'],
                                'quantity' => $item['quantity'],
                                'price' => $item['price'],
                            ]);
                        }
                    }
                }

                // Reload the relationship to ensure all items are fetched
                $purchase->load('purchaseitems');

                 // Compute the total based on updated purchase items
                 $calculatedTotal = $purchase->purchaseitems->sum(fn($item) => $item->quantity * $item->price);

                 // Update purchase with the correct total
                 $purchase->update(['total' => $calculatedTotal]);
              
            });            
    
            return redirect()->route('procurements1.index')->with('success', 'Purchase updated successfully.');

        } catch (\Exception $e) {
            Log::error('Error updating purchase:', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Failed to update purchase. Please try again.', 'error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }


    public function approve(Request $request, PROPurchase $purchase)
    {
       
        // 1. Validate input
        $validator = Validator::make($request->all(), [
            'supplier_id' => 'required|exists:siv_suppliers,id',
            'facility_id' => 'required|exists:facilityoptions,id',
            'total' => 'required|numeric|min:0',
            'stage' => 'required|integer|min:1',
            // 'purchaseitems' => 'required|array',
            // 'purchaseitems.*.id' => 'nullable|exists:pro_purchaseitems,id',
            // 'purchaseitems.*.item_id' => 'required|exists:siv_products,id',
            // 'purchaseitems.*.quantity' => 'required|numeric|min:0',
            // 'purchaseitems.*.price' => 'required|numeric|min:0',
            // 'remarks' => 'nullable|string|max:255',
            // 'file' => 'nullable|file|mimes:pdf,doc,docx|max:5120', // Adjust mimes and size as needed
        ]);

        if ($validator->fails()) {
            Log::error('Validation errors:', $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $validator->validated();
    
        try {
            // // Begin database transaction
             DB::transaction(function () use ($validated, $request, $purchase) {

            //     // 2. Handle File Upload
            //     $url = $purchase->url; // Keep the old url
            //     $filename = $purchase->filename; // Keep the old filename

            //     if ($request->hasFile('file')) {
            //         // Delete the old file (if it exists)
            //         if ($purchase->url) {
            //             Storage::disk('public')->delete($purchase->url);
            //         }

            //         $file = $request->file('file');
            //         $filename = time() . '_' . $file->getClientOriginalName();  // Generate unique filename
            //         $url = $file->storeAs('purchases', $filename, 'public');  // Store in storage/app/public/purchases
            //     }


            //     // Update purchase details, url, and filename
                $purchase->update([
                    // 'supplier_id' => $validated['supplier_id'],
                    // 'facilityoption_id' => $validated['facility_id'],
                    'stage' => $validated['stage'],
                    // 'total' => $validated['total'],
                    // 'remarks' => $validated['remarks'] ?? null,
                    // 'url' => $url, // save new url or the same
                    // 'filename' => $filename,  // save the new filename or the same
                    'user_id' => Auth::id(),
                ]);

            //     // Retrieve existing item IDs before the update
            //     $oldItemIds = $purchase->purchaseitems()->pluck('id')->toArray();
            //     $existingItemIds = [];
            //     $newItems = [];

            //     foreach ($validated['purchaseitems'] as $item) {
            //         if (!empty($item['id'])) {
            //             $existingItemIds[] = $item['id'];
            //         } else {
            //             $newItems[] = $item;
            //         }
            //     }

            //     // Identify and delete removed items
            //     $itemsToDelete = array_diff($oldItemIds, $existingItemIds);
            //     $purchase->purchaseitems()->whereIn('id', $itemsToDelete)->delete();

            //     // Add new items
            //     foreach ($newItems as $item) {
            //         $purchase->purchaseitems()->create([
            //             'product_id' => $item['item_id'],
            //             'quantity' => $item['quantity'],
            //             'price' => $item['price'],
            //         ]);
            //     }

            //     // Update existing items
            //     foreach ($validated['purchaseitems'] as $item) {
            //         if (!empty($item['id'])) {
            //             $purchaseItem = PROPurchaseItem::find($item['id']);

            //             if ($purchaseItem) {
            //                 $purchaseItem->update([
            //                     'product_id' => $item['item_id'],
            //                     'quantity' => $item['quantity'],
            //                     'price' => $item['price'],
            //                 ]);
            //             }
            //         }
            //     }

            //     // Reload the relationship to ensure all items are fetched
            //     $purchase->load('purchaseitems');

            //      // Compute the total based on updated purchase items
            //      $calculatedTotal = $purchase->purchaseitems->sum(fn($item) => $item->quantity * $item->price);

            //      // Update purchase with the correct total
            //      $purchase->update(['total' => $calculatedTotal]);

            //      Log::info('Purchase updated successfully:', ['purchase_id' => $purchase->id]);

             });

            
            return redirect()->route('procurements1.edit', $purchase->id)
                ->with('success', 'Purchase approved successfully. You can now dispatch it.');    
              
    
          

        } catch (\Exception $e) {
            Log::error('Error updating purchase:', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Failed to update purchase. Please try again.', 'error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }


    public function dispatch(Request $request, PROPurchase $purchase)
    {   
        
        // 1. Validate input including recipient data
        $validator = Validator::make($request->all(), [
            'supplier_id' => 'required|exists:siv_suppliers,id',
            'facility_id' => 'required|exists:facilityoptions,id',
            'total' => 'required|numeric|min:0',
            'stage' => 'required|integer|min:3|max:3', // make sure the satge is dispatch           
           
            'recipient_name' => 'required|string|max:255',
            'recipient_contact' => 'required|string|max:255',
            'url' => 'nullable|string',
            'filename' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            Log::error('Validation errors:', $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $validator->validated();

        try {
             // Extract recipient data from request
             $recipientName = $request->input('recipient_name');
             $recipientContact = $request->input('recipient_contact');

            // Begin database transaction
            DB::transaction(function () use ($purchase, $validated, $recipientName, $recipientContact) {

                 // Generate Dispatch Number
                $dispatchNumber = $this->generateDispatchNumber();

                // // Generate Purchase Order PDF
                // $pdf = Pdf::loadView('purchase_order', ['purchase' => $purchase, 'recipientName' => $recipientName, 'recipientContact' => $recipientContact]);
                // $pdfFilename = 'purchase_order_' . $purchase->id . '_' . time() . '.pdf';

                // // Save the PDF to storage. Adjust path as needed
                // Storage::disk('public')->put('purchase_orders/' . $pdfFilename, $pdf->output());
                // $pdfPath = 'purchase_orders/' . $pdfFilename;

                // update stage

                 $purchase->recipient_name = $recipientName;
                 $purchase->recipient_contact = $recipientContact;
                $purchase->dispatch_number = $dispatchNumber;
                // $purchase->purchase_order_path = $pdfPath;  // save path to the pdf
                 $purchase->stage = $validated['stage'];

                 $purchase->save();


                //Log::info('Purchase dispatched successfully:', ['purchase_id' => $purchase->id]);
                // You could trigger an event to send a notification here (e.g., email)                
            });    
  

            return redirect()->route('procurements1.edit', $purchase->id)->with('success', 'Purchase dispatched successfully.');

        } catch (\Exception $e) {
            Log::error('Error dispatching purchase:', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Failed to dispatch purchase. Please try again.', 'error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
     
  
    public function receive(Request $request, PROPurchase $purchase)
    {
       
        // Pre-condition: Ensure the purchase order is in 'Dispatched' (stage 3)
        if ($purchase->stage != 3) {
            // Assuming you have an accessor like 'stage_name' or 'stage_label' on PROPurchase model
            $currentStageName = method_exists($purchase, 'getStageLabelAttribute') ? $purchase->stage_label : 'Stage ' . $purchase->stage;
            return back()->with('error', 'Purchase Order cannot be received. It is not in "Dispatched" stage. Current stage: ' . $currentStageName)
                         ->withInput();
        }

        $validator = Validator::make($request->all(), [
            'receiving_store_id' => ['required', Rule::exists(SIV_Store::class, 'id')],
            'grn_number'         => [
                'nullable',
                'string',
                'max:100',
                // Ensure GRN is unique on PROPurchase if set there, and on IVReceive if set there
                //Rule::unique('pro_purchase', 'grn_number')->ignore($purchase->id),
                //Rule::unique('iv_receives', 'grn_reference') // Ensure this column name matches your iv_receives table
            ],
            'receive_remarks'    => 'nullable|string|max:1000',
            'stage'              => 'required|integer|in:4', // Expecting to set stage to 4 (Received)

            'items_received'          => 'required|array|min:1', // At least one item must be processed
            'items_received.*.purchase_item_id' => [
                'required',
                Rule::exists(PROPurchaseItem::class, 'id')->where('purchase_id', $purchase->id)
            ],
            'items_received.*.item_id' => ['required', Rule::exists(SIV_Product::class, 'id')],
            'items_received.*.quantity_received' => 'required|numeric|min:0.001', // Must receive a positive quantity if item is included
            'items_received.*.remarks' => 'nullable|string|max:255', // Per-item remarks
        ], [
            'items_received.min' => 'At least one item must be marked for receiving with a quantity greater than zero.',
            'grn_number.unique' => 'The GRN number has already been used.',
            'items_received.*.quantity_received.min' => 'The quantity to receive for ":attribute" must be greater than 0.',
            // You can add more custom messages here if needed
        ]);

        // Custom validation logic (after initial rules pass)
        $validator->after(function ($validator) use ($request) {
            if ($validator->failed()) { // Don't run if basic validation already failed
                return;
            }
            if ($request->has('items_received')) {
                foreach ($request->input('items_received') as $index => $receivedItemData) {
                    // Ensure keys exist before accessing, though 'required' rule should handle this
                    if (!isset($receivedItemData['purchase_item_id']) || !isset($receivedItemData['quantity_received'])) {
                        continue;
                    }

                    $purchaseItem = PROPurchaseItem::find($receivedItemData['purchase_item_id']);
                    $itemName = $purchaseItem ? ($purchaseItem->item_name ?? ($purchaseItem->item->name ?? "Item #{$receivedItemData['item_id']}")) : "Unknown Item";


                    if ($purchaseItem) {
                        $quantityToReceive = (float) $receivedItemData['quantity_received'];
                        // quantity_ordered on PROPurchaseItem is 'quantity'
                        $maxReceivable = (float) $purchaseItem->quantity - (float) $purchaseItem->quantity_received_total;

                        if ($quantityToReceive < 0) { // Though min:0.001 should catch this
                            $validator->errors()->add(
                                "items_received.{$index}.quantity_received",
                                "Quantity for \"{$itemName}\" cannot be negative."
                            );
                        } elseif ($quantityToReceive > $maxReceivable) {
                            $validator->errors()->add(
                                "items_received.{$index}.quantity_received",
                                "Quantity for \"{$itemName}\" ({$quantityToReceive}) exceeds remaining receivable ({$maxReceivable})."
                            );
                        }
                    } else {
                        // This should be caught by Rule::exists, but as a fallback:
                        $validator->errors()->add(
                           "items_received.{$index}.purchase_item_id",
                           "Invalid purchase item ID."
                       );
                    }
                }
            }
        });

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $validatedData = $validator->validated();

        try {
            DB::transaction(function () use ($purchase, $validatedData, $request) {
                $grnTotalValue = 0;
                $itemsForGrnCreation = [];
                $anyItemReceived = false;

                foreach ($validatedData['items_received'] as $receivedItemData) {
                    $purchaseItem = PROPurchaseItem::find($receivedItemData['purchase_item_id']);
                    // This check is mostly for safety, validator `after` hook should handle it.
                    if (!$purchaseItem) {
                         throw ValidationException::withMessages(["items_received.{$loop->index}.purchase_item_id" => "Invalid purchase item encountered during processing."]);
                    }

                    $quantityReceived = (float) $receivedItemData['quantity_received'];

                    if ($quantityReceived > 0) {
                        $anyItemReceived = true;

                        // 1. Update Purchase Order Item's received quantity
                        $purchaseItem->quantity_received_total = ($purchaseItem->quantity_received_total ?? 0) + $quantityReceived;
                        $purchaseItem->save();

                        // 2. Prepare item for Goods Received Note (IVReceiveItem)
                        $itemsForGrnCreation[] = new IVReceiveItem([ // Use new IVReceiveItem for fillable assignment
                            'product_id' => $purchaseItem->product_id, // or $receivedItemData['item_id']
                            'quantity'   => $quantityReceived,
                            'price'      => $purchaseItem->price, // Price from the original purchase item
                            'remarks'    => $receivedItemData['remarks'] ?? null,
                        ]);
                        $grnTotalValue += $quantityReceived * (float) $purchaseItem->price;
                    }
                }

                if (!$anyItemReceived) {
                    // This should be caught by 'items_received.min:1' and 'quantity_received.min:0.001'
                    // if frontend correctly filters out zero-quantity items.
                    throw ValidationException::withMessages(['items_received' => 'No items were submitted with a quantity greater than zero to receive.']);
                }

                // 3. Create the main IVReceive record (Goods Received Note)
                $ivReceive = IVReceive::create([
                    'transdate'       => Carbon::now(),
                    'tostore_id'      => $validatedData['receiving_store_id'],
                    'fromstore_type'  => StoreType::Supplier->value, // Assumes StoreType enum
                    'fromstore_id'    => $purchase->supplier_id,
                    'stage'           => 1, // Example: 1 for 'Posted' or 'Completed' GRN. Adjust as per IVReceive lifecycle.
                    'total'           => $grnTotalValue,
                    'remarks'         => $validatedData['receive_remarks'] ?? null,
                    'grn_reference'   => $validatedData['grn_number'] ?? null, // Field for GRN on IVReceive table
                    'purchase_id' => $purchase->id, // Link GRN to PO
                    'user_id'         => Auth::id(),
                    'facility_id'     => $purchase->facility_id ?? $purchase->facilityoption_id, // Use facility from PO
                ]);

                // 4. Save associated IVReceiveItem records
                if (!empty($itemsForGrnCreation)) {
                    $ivReceive->receiveitems()->saveMany($itemsForGrnCreation); // Assumes `receiveitems` relationship on IVReceive model
                }

                // 5. Update the Purchase Order status and details
                $purchase->stage = $validatedData['stage']; // Set to 4 (Received)
                //$purchase->receive_remarks = $validatedData['receive_remarks'] ?? $purchase->receive_remarks; // Keep old if new is null
                //$purchase->grn_number = $validatedData['grn_number'] ?? $purchase->grn_number; // Save GRN on PO
                
                // Optionally store the last receiving store on the PO itself
                //$purchase->receiving_store_id = $validatedData['receiving_store_id'];

                // Check if all items in the PO are now fully received
                $allItemsFullyReceived = true;
                // Refresh purchase items from DB to get latest quantity_received_total
                foreach ($purchase->purchaseitems()->get() as $poItem) {
                    if (($poItem->quantity_received_total ?? 0) < $poItem->quantity) {
                        $allItemsFullyReceived = false;
                        break;
                    }
                }

                if ($allItemsFullyReceived) {
                    // If you have a specific "Fully Received" stage distinct from "Received" (e.g. stage 4 is partially received, stage 5 is fully)
                    // $purchase->stage = YOUR_FULLY_RECEIVED_STAGE_NUMBER;
                    // For now, stage 4 covers both partial and full receipt from this action's perspective.
                }
                // If any stock/inventory updates need to happen based on IVReceive, trigger them here.
                // e.g., $ivReceive->postToInventory();

                $purchase->save();
            });

            $poNumber = $purchase->purchase_order_number ?? "ID {$purchase->id}";
            return redirect()->route('procurements1.index')->with('success', "Goods received successfully for Purchase Order {$poNumber}.");

        } catch (ValidationException $e) {
            // Validation errors thrown manually from within the transaction or by the validator after hook
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            Log::error('Error receiving purchase order:', [
                'purchase_id' => $purchase->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return back()->with('error', 'Failed to record goods receipt due to a system error. Please try again. Details: ' . $e->getMessage())->withInput();
        }
    }


/**
 * Ensure your models have the necessary fillable properties, relationships, and accessors.
 *
 * Model: PROPurchase
 * - fillable: ['stage', 'receive_remarks', 'grn_number', 'receiving_store_id', ...]
 * - relationships: purchaseitems(), supplier(), facilityoption(), receivingStore() (optional)
 * - accessors: getStageLabelAttribute() (optional, for display)
 *
 * Model: PROPurchaseItem
 * - fillable: ['quantity_received_total', ...]
 * - relationships: item() (to SIV_Product), proPurchase()
 * - accessors: getItemNameAttribute() (or similar for clearer error messages)
 *
 * Model: IVReceive
 * - fillable: ['transdate', 'tostore_id', 'fromstore_type', 'fromstore_id', 'stage', 'total', 'remarks', 'grn_reference', 'purchase_id', 'user_id', 'facility_id', ...]
 * - relationships: receiveitems() (to IVReceiveItem), toStore(), fromSupplier() (if polymorphic or specific), purchaseOrder()
 *
 * Model: IVReceiveItem
 * - fillable: ['iv_receive_id', 'product_id', 'quantity', 'price', 'remarks', ...]
 * - relationships: product(), ivReceive()
 *
 * Enum: App\Enums\StoreType (Example)
 * namespace App\Enums;
 * enum StoreType: int
 * {
 *     case Supplier = 1;
 *     case Store = 2;
 *     // ... other types
 * }
 */


    // Helper function to generate a unique dispatch number
    private function generateDispatchNumber()
    {
        // Implement your dispatch number generation logic here.
        // For example, you might use a combination of the current date and time,
        // a random number, and a sequence number from a database table.

        return 'DISPATCH-' . time() . '-' . rand(1000, 9999);
    }
    
    
   
    /**
     * Remove the specified purchase from storage.
     */
    public function destroy(PROPurchase $purchase)
    {
        // Delete the purchase and associated items
        $purchase->purchaseitems()->delete();
        $purchase->delete();

        return redirect()->route('procurements1.index')
            ->with('success', 'Purchase deleted successfully.');
    }
}
