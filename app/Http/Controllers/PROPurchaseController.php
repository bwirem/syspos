<?php

namespace App\Http\Controllers;

use App\Models\PROPurchase;
use App\Models\PROPurchaseItem;
use App\Models\FacilityOption;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

use Illuminate\Support\Facades\Storage;  // Import Storage facade
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

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

         $query->where('stage', '<=', '4');
     
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

            Log::info('Purchase created successfully:', ['purchase_id' => $purchase->id]);
            return redirect()->route('procurements1.index')->with('success', 'Purchase created successfully.');

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

                 Log::info('Purchase updated successfully:', ['purchase_id' => $purchase->id]);

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
    
            return redirect()->route('procurements1.index')->with('success', 'Purchase updated successfully.');

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

            return redirect()->route('procurements1.index')->with('success', 'Purchase dispatched successfully.');

        } catch (\Exception $e) {
            Log::error('Error dispatching purchase:', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Failed to dispatch purchase. Please try again.', 'error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

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
