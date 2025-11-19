<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\HandlesVoiding;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\BILSale;
use App\Models\FacilityOption;
use Illuminate\Support\Facades\Validator;
use Barryvdh\DomPDF\Facade\Pdf;
use Inertia\Inertia;

class BilSalesHistoryController extends Controller
{
    // This trait provides the voidInvoice() and voidReceipt() methods.
    use HandlesVoiding;

    /**
     * Display a paginated list of non-voided sales based on filter criteria.
     *
     * @param Request $request
     * @return \Inertia\Response
     */
    public function saleHistory(Request $request)
    {
        // --- 1. Set Default Dates ---
        $today = now()->format('Y-m-d');
        $startDate = $request->input('start_date', $today);
        $endDate = $request->input('end_date', $today);

        // --- 2. Build the Query ---
        $query = BILSale::with(['items', 'customer']); // Eager load relations

        // Filtering by customer name, receipt number, or invoice number
        if ($request->filled('search')) {
            $searchTerm = '%' . $request->search . '%';
            $query->where(function ($q) use ($searchTerm) {
                $q->whereHas('customer', function ($subQ) use ($searchTerm) {
                    $subQ->where('first_name', 'like', $searchTerm)
                         ->orWhere('surname', 'like', $searchTerm)
                         ->orWhere('other_names', 'like', $searchTerm)
                         ->orWhere('company_name', 'like', $searchTerm);
                })->orWhere('receiptno', 'like', $searchTerm)
                  ->orWhere('invoiceno', 'like', $searchTerm);
            });
        }

        // --- 3. Always Apply Date Filter ---
        $parsedStartDate = Carbon::parse($startDate)->startOfDay();
        $parsedEndDate = Carbon::parse($endDate)->endOfDay();
        $query->whereBetween('created_at', [$parsedStartDate, $parsedEndDate]);

        // Only show sales that are not voided
        $query->where('voided', '=', 0);

        // Paginate and sort sales, ensuring filters are kept on pagination links
        $sales = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        // --- 4. Return Data to Inertia View ---
        return Inertia::render('BilHistory/SaleHistory', [
            'sales' => $sales,
            'filters' => [
                'search'     => $request->input('search', ''),
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ],
        ]);
    }

    /**
     * Display the detailed preview page for a single sale.
     *
     * @param BILSale $sale
     * @return \Inertia\Response
     */
    public function previewSale(BILSale $sale)
    {       
        // Eager load all necessary relationships for the preview component
        $sale->load(['customer','items.item']); 

        return Inertia::render('BilHistory/SalePreview', [
            'sale' => $sale,           
        ]);
    }

    /**
     * Handle the request to void a sale.
     *
     * @param Request $request
     * @param BILSale $sale
     * @return \Illuminate\Http\RedirectResponse
     */    

    public function postVoidSale(Request $request, BILSale $sale)
    {
        $validated = $request->validate([
            'remarks' => 'required|string|min:5|max:255',
        ]);

        try {
            if ($sale->invoiceno) {
                // --- THE FIX IS HERE ---
                // Pass the entire $sale object, not just the invoiceno string.
                $this->voidInvoice($sale, now(), $validated['remarks']);
            } else {
                // This part for cash sales remains the same.
                $this->voidReceipt($sale->receiptno, now(), $validated['remarks']);
            }
            
            return redirect()->route('billing3.preview', $sale->id)
                            ->with('success', 'Sale voided successfully.');

        } catch (\Exception $e) {
            \Log::error('Failed to void sale: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return back()->with('error', 'Failed to void sale.');
        }
    }

    /**
     * Generate and stream the Invoice/Receipt PDF.
     */
    public function printInvoice(BILSale $sale)
    {
        $sale->load(['customer', 'items.item']);

        // Fetch Facility Details
        $facility = FacilityOption::first(); 

        $pdf = Pdf::loadView('pdfs.sale_invoice', [
            'sale' => $sale,
            'facility' => $facility, // <--- Pass variable to view
        ]);

        return $pdf->stream('invoice_' . ($sale->invoiceno ?? $sale->receiptno) . '.pdf');
    }

    /**
     * Generate and stream the Delivery Note PDF.
     */
    public function printDeliveryNote(BILSale $sale)
    {
        $sale->load(['customer', 'items.item']);

        // Fetch Facility Details
        $facility = FacilityOption::first();

        $pdf = Pdf::loadView('pdfs.sale_delivery_note', [
            'sale' => $sale,
            'facility' => $facility, // <--- Pass variable to view
        ]);

        return $pdf->stream('delivery_note_' . ($sale->invoiceno ?? $sale->receiptno) . '.pdf');
    }
}
