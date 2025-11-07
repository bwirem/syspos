<?php

namespace App\Http\Controllers;

// Import necessary classes and traits
use App\Http\Controllers\Traits\GeneratesUniqueNumbers;
use App\Http\Controllers\Traits\ManagesItems;
use App\Services\InventoryService;

// Import Models and Enums
use App\Models\PROPurchase;
use App\Models\PROPurchaseItem;
use App\Models\SIV_Store;
use App\Models\SIV_Product;
use App\Models\SIV_Supplier;
use App\Models\FacilityOption;
use App\Models\BILProductCostLog;
use App\Models\ACCMakePayment; // Import MakePayment model
use App\Models\ChartOfAccount; // Import Chart of Account model
use App\Models\ChartOfAccountMapping; // Import Chart of Account Mapping model
use App\Enums\StoreType;

// Import Laravel/PHP classes
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf; // <-- Add this
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class PROPurchaseController extends Controller
{
    use GeneratesUniqueNumbers, ManagesItems;

    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    // ... methods index, create, store, edit, update, approve, dispatch ...

    public function index(Request $request)
    {
        $query = PROPurchase::with(['purchaseitems', 'supplier']);

        if ($request->filled('search')) {
            $query->whereHas('supplier', function ($q) use ($request) {
                $q->where('first_name', 'like', '%' . $request->search . '%')
                  ->orWhere('surname', 'like', '%' . $request->search . '%')
                  ->orWhere('other_names', 'like', '%' . $request->search . '%')
                  ->orWhere('company_name', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        $query->where('stage', '<', '4');
        $purchases = $query->orderBy('created_at', 'desc')->paginate(10);

        return inertia('ProPurchase/Index', [
            'purchases' => $purchases,
            'filters' => $request->only(['search', 'stage']),
        ]);
    }

    public function create()
    {
        return inertia('ProPurchase/Create', [
            'facilityoption' => FacilityOption::first(),
        ]);
    }


    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:siv_suppliers,id',
            'facility_id' => 'required|exists:facilityoptions,id',
            'stage' => 'required|integer|min:1',
            'purchaseitems' => 'required|array|min:1',
            'purchaseitems.*.item_id' => 'required|exists:siv_products,id',
            'purchaseitems.*.quantity' => 'required|numeric|min:0.01',
            'purchaseitems.*.price' => 'required|numeric|min:0',
            'remarks' => 'nullable|string|max:255',
            'file' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        try {
            $purchase = DB::transaction(function () use ($validated, $request) {
                $url = null;
                $filename = null;
                if ($request->hasFile('file')) {
                    $file = $request->file('file');
                    $filename = time() . '_' . $file->getClientOriginalName();
                    $url = $file->storeAs('purchases', $filename, 'public');
                }

                $purchase = PROPurchase::create([
                    'transdate' => now(),
                    'supplier_id' => $validated['supplier_id'],
                    'facilityoption_id' => $validated['facility_id'],
                    'stage' => $validated['stage'],
                    'user_id' => Auth::id(),
                    'remarks' => $validated['remarks'] ?? null,
                    'url' => $url,
                    'filename' => $filename,
                ]);

                $this->syncItems($purchase, $validated['purchaseitems'], 'purchaseitems');
                $purchase->load('purchaseitems');
                $purchase->save();

                return $purchase;
            });

            return redirect()->route('procurements1.edit', $purchase->id)
                ->with('success', 'Purchase created successfully.');

        } catch (\Exception $e) {
            Log::error('Error creating purchase:', ['error' => $e->getMessage()]);
            return back()->with('error', 'Failed to create purchase. Please try again.');
        }
    }

    public function edit(PROPurchase $purchase)
    {
        $purchase->load(['supplier', 'facilityoption', 'purchaseitems.item']);
        $pageName = match ((int) $purchase->stage) {
            2 => 'ProPurchase/Dispatch',
            3 => 'ProPurchase/Receive',
            default => 'ProPurchase/Edit',
        };
        return inertia($pageName, ['purchase' => $purchase, 'stores' => SIV_Store::all()]);
    }

    public function update(Request $request, PROPurchase $purchase)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:siv_suppliers,id',
            'facility_id' => 'required|exists:facilityoptions,id',
            'stage' => 'required|integer|min:1',
            'purchaseitems' => 'required|array|min:1',
            'purchaseitems.*.id' => 'nullable|exists:pro_purchaseitems,id',
            'purchaseitems.*.item_id' => 'required|exists:siv_products,id',
            'purchaseitems.*.quantity' => 'required|numeric|min:0.01',
            'purchaseitems.*.price' => 'required|numeric|min:0',
            'remarks' => 'nullable|string|max:255',
            'file' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        try {
            DB::transaction(function () use ($validated, $request, $purchase) {
                $url = $purchase->url;
                $filename = $purchase->filename;
                if ($request->hasFile('file')) {
                    if ($purchase->url) Storage::disk('public')->delete($purchase->url);
                    $file = $request->file('file');
                    $filename = time() . '_' . $file->getClientOriginalName();
                    $url = $file->storeAs('purchases', $filename, 'public');
                }

                $purchase->fill([
                    'supplier_id' => $validated['supplier_id'],
                    'facilityoption_id' => $validated['facility_id'],
                    'stage' => $validated['stage'],
                    'remarks' => $validated['remarks'] ?? null,
                    'url' => $url,
                    'filename' => $filename,
                    'user_id' => Auth::id(),
                ]);

                $this->syncItems($purchase, $validated['purchaseitems'], 'purchaseitems');
                $purchase->save();
            });

            return redirect()->route('procurements1.index')->with('success', 'Purchase updated successfully.');
        } catch (\Exception $e) {
            Log::error('Error updating purchase:', ['error' => $e->getMessage()]);
            return back()->with('error', 'Failed to update purchase. Please try again.');
        }
    }
    
    public function approve(Request $request, PROPurchase $purchase)
    {
        $validated = $request->validate(['stage' => 'required|integer|in:2']);

        try {
            $purchase->update(['stage' => $validated['stage'], 'user_id' => Auth::id()]);
            return redirect()->route('procurements1.edit', $purchase->id)
                ->with('success', 'Purchase approved successfully. You can now dispatch it.');
        } catch (\Exception $e) {
            Log::error('Error approving purchase:', ['error' => $e->getMessage()]);
            return back()->with('error', 'Failed to approve purchase.');
        }
    }

    public function dispatch(Request $request, PROPurchase $purchase)
    {
        // The frontend sends dispatch_remarks now
        $validated = $request->validate([
            'stage' => 'required|integer|in:3',
            'recipient_name' => 'required|string|max:255',
            'recipient_contact' => 'required|string|max:255',
            'dispatch_remarks' => 'nullable|string|max:1000',
        ]);

        try {
            DB::transaction(function () use ($purchase, $validated, $request) {
                // 1. Generate unique dispatch number
                $dispatchNumber = $this->generateUniqueNumber(PROPurchase::class, 'dispatch_number', 'DIS-');

                // 2. Load relationships needed for both update and PDF
                $purchase->load('supplier', 'facilityoption', 'purchaseitems.item');
                
                // Temporarily assign data for PDF generation
                $purchase->dispatch_number = $dispatchNumber;
                $purchase->dispatch_remarks = $validated['dispatch_remarks'] ?? null;

                // 3. Generate PDF
                $pdf = PDF::loadView('pdfs.dispatch_note', [
                    'purchase' => $purchase,
                    'recipient_name' => $validated['recipient_name'],
                    'recipient_contact' => $validated['recipient_contact']
                ]);

                // 4. Define path and filename and save the PDF
                $filename = 'dispatch_note_po_' . $purchase->id . '_' . time() . '.pdf';
                $path = 'dispatch_notes/' . $filename;
                Storage::disk('public')->put($path, $pdf->output());

                // 5. Update the purchase order with all dispatch information
                $purchase->update([
                    'stage' => $validated['stage'],
                    'recipient_name' => $validated['recipient_name'],
                    'recipient_contact' => $validated['recipient_contact'],
                    'dispatch_remarks' => $validated['dispatch_remarks'] ?? null,
                    'dispatch_number' => $dispatchNumber,
                    'dispatch_document_url' => $path,
                    'dispatch_document_filename' => $filename,
                    'user_id' => Auth::id(),
                ]);
            });

            return redirect()->route('procurements1.edit', $purchase->id)->with('success', 'Purchase dispatched successfully and dispatch note generated.');

        } catch (\Exception $e) {
            Log::error('Error dispatching purchase:', ['error' => $e->getMessage()]);
            return back()->with('error', 'Failed to dispatch purchase: ' . $e->getMessage());
        }
    }

    /**
     * Receive goods and create a corresponding pending payment.
     */
    public function receive(Request $request, PROPurchase $purchase)
    {
        if ($purchase->stage != 3) {
            return back()->with('error', 'This Purchase Order is not in the "Dispatched" stage and cannot be received.');
        }

        $validated = $request->validate([
            'receiving_store_id' => ['required', Rule::exists(SIV_Store::class, 'id')],
            'grn_number' => ['nullable', 'string', 'max:100', Rule::unique('iv_receive', 'delivery_no')->where('fromstore_id', $purchase->supplier_id)->where('fromstore_type', StoreType::Supplier->value)],
            'receive_remarks' => 'nullable|string|max:1000',
            'stage' => 'required|integer|in:4',
            'items_received' => 'required|array|min:1',
            'items_received.*.purchase_item_id' => ['required', Rule::exists(PROPurchaseItem::class, 'id')->where('purchase_id', $purchase->id)],
            'items_received.*.quantity_received' => 'required|numeric|min:0.01',

            // --- ADDED VALIDATION ---
            'delivery_note_file' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:5120', // Max 5MB
            'invoice_file' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:5120',       // Max 5MB
        ]);

        try {
            DB::transaction(function () use ($purchase, $validated, $request) {
                $purchase->load('supplier', 'facilityoption');
                $itemsForService = [];
                foreach ($validated['items_received'] as $receivedItemData) {
                    $purchaseItem = PROPurchaseItem::with('item')->find($receivedItemData['purchase_item_id']);
                    $product = $purchaseItem->item;
                    
                    $quantityReceived = (float) $receivedItemData['quantity_received'];
                    $newCostPrice = (float) $purchaseItem->price;

                    $currentStock = $this->inventoryService->getProductQuantity($product->id);
                    $currentAverageCost = (float) $product->averagecost;
                    $totalQuantity = $currentStock + $quantityReceived;
                    $newAverageCost = ($totalQuantity > 0) ? (($currentStock * $currentAverageCost) + ($quantityReceived * $newCostPrice)) / $totalQuantity : $newCostPrice;

                    $product->prevcost = $product->costprice;
                    $product->costprice = $newCostPrice;
                    $product->averagecost = $newAverageCost;
                    $product->save();

                    BILProductCostLog::create(['sysdate' => now(), 'transdate' => $purchase->transdate, 'product_id' => $product->id, 'costprice' => $newCostPrice]);
                    
                    $purchaseItem->increment('quantity_received_total', $quantityReceived);
                    
                    $itemsForService[] = ['product_id' => $purchaseItem->product_id, 'quantity' => $quantityReceived, 'price' => $newCostPrice];
                }

                // And update it to this:
                $this->inventoryService->createReceiveRecord(
                    $validated['receiving_store_id'],
                    $purchase->supplier_id,
                    StoreType::Supplier->value,
                    $itemsForService,
                    $validated['grn_number'],
                    1, // stage
                    $validated['receive_remarks'],
                    $purchase->id // <-- PASS THE PURCHASE ID AS THE NEW ARGUMENT
                );
                
                // --- Start: Auto-create Pending MakePayment ---
                $totalReceivedValue = collect($itemsForService)->sum(fn($item) => $item['quantity'] * $item['price']);

                if ($totalReceivedValue > 0) {
                    
                    // First, create the main payment record
                    $pendingPayment = ACCMakePayment::create([
                        'transdate' => now(),
                        'facilityoption_id' => $purchase->facilityoption_id,
                        'recipient_type' => get_class($purchase->supplier),
                        'recipient_id' => $purchase->supplier_id,
                        'payment_method' => 'GRN Auto-Generated',
                        'reference_number' => $validated['grn_number'],
                        'description' => "Auto-payment for goods on GRN #{$validated['grn_number']} from PO #{$purchase->id}",
                        'currency' => 'TZS', // TODO: Make this dynamic (e.g., from facility settings)
                        'total_amount' => $totalReceivedValue,
                        'stage' => 1, // 1 = Pending
                        'user_id' => Auth::id(),
                    ]);

                    // Get the payable account ID once to be more efficient
                    $payableAccountId = ChartOfAccountMapping::first()->account_payable_id;

                    // Now, create a detailed item line for each product received
                    foreach ($validated['items_received'] as $receivedItemData) {
                        // Find the corresponding purchase item to get the price and product details
                        $purchaseItem = PROPurchaseItem::with('item')->find($receivedItemData['purchase_item_id']);
                        if ($purchaseItem) {
                            $product = $purchaseItem->item;
                            $amount = (float)$receivedItemData['quantity_received'] * (float)$purchaseItem->price;
                            $description = "Payment for " . $receivedItemData['quantity_received'] . " x " . $product->name . " @ " . $purchaseItem->price;

                            $pendingPayment->items()->create([
                                'payable_id' => $payableAccountId,
                                'payable_type' => ChartOfAccount::class,
                                'amount' => $amount,
                                'description' => $description,
                            ]);
                        }
                    }

                    // --- NEW LOGIC TO HANDLE FILE UPLOADS ---
                    if ($request->hasFile('delivery_note_file')) {
                        $file = $request->file('delivery_note_file');
                        $filename = time() . '_delivery_' . $file->getClientOriginalName();
                        $url = $file->storeAs('payment_documents/' . $pendingPayment->id, $filename, 'public');

                        $pendingPayment->documents()->create([
                            'url' => $url,
                            'filename' => $filename,
                            'type' => 'Delivery Note',
                            'size' => $file->getSize(),
                            'description' => 'Delivery note for GRN #' . ($validated['grn_number'] ?? 'N/A'),
                        ]);
                    }

                    if ($request->hasFile('invoice_file')) {
                        $file = $request->file('invoice_file');
                        $filename = time() . '_invoice_' . $file->getClientOriginalName();
                        $url = $file->storeAs('payment_documents/' . $pendingPayment->id, $filename, 'public');

                        $pendingPayment->documents()->create([
                            'url' => $url,
                            'filename' => $filename,
                            'type' => 'Invoice',
                            'size' => $file->getSize(),
                            'description' => 'Supplier invoice for GRN #' . ($validated['grn_number'] ?? 'N/A'),
                        ]);
                    }
                    // --- END OF NEW LOGIC ---
                }
                // --- End: Auto-create Pending MakePayment ---

                $purchase->update(['stage' => $validated['stage'], 'user_id' => Auth::id()]);
            });

            return redirect()->route('procurements1.index')->with('success', "Goods received for PO #{$purchase->id}. A pending receipt and payment have been created.");

        } catch (Exception $e) {
            Log::error('Error receiving purchase order:', ['purchase_id' => $purchase->id, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return back()->with('error', 'Failed to process goods receipt: ' . $e->getMessage())->withInput();
        }
    }
    
    public function destroy(PROPurchase $purchase)
    {
        try {
            if ($purchase->stage > 1) {
                return redirect()->route('procurements1.index')->with('error', 'Cannot delete a purchase that has been approved or processed.');
            }
            DB::transaction(function () use ($purchase) {
                $purchase->purchaseitems()->delete();
                $purchase->delete();
            });
            return redirect()->route('procurements1.index')->with('success', 'Purchase deleted successfully.');
        } catch (Exception $e) {
            Log::error('Error deleting purchase:', ['purchase_id' => $purchase->id, 'error' => $e->getMessage()]);
            return back()->with('error', 'Failed to delete purchase.');
        }
    }
}