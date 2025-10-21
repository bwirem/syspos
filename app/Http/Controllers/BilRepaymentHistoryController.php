<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\HandlesVoiding;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\BILInvoicePayment;
use Inertia\Inertia;

class BilRepaymentHistoryController extends Controller
{
    // This trait provides the voidPayment() method.
    use HandlesVoiding;

    /**
     * Display a paginated list of non-voided repayments based on filter criteria.
     *
     * @param Request $request
     * @return \Inertia\Response
     */
    public function repaymentHistory(Request $request)
    {
        // --- 1. Set Default Dates ---
        $today = now()->format('Y-m-d');
        $startDate = $request->input('start_date', $today);
        $endDate = $request->input('end_date', $today);

        // --- 2. Build the Query ---
        $query = BILInvoicePayment::with(['items', 'customer']); // Eager load relations

        // Filtering by customer name or associated invoice number
        if ($request->filled('search')) {
            $searchTerm = '%' . $request->search . '%';
            $query->where(function ($q) use ($searchTerm) {
                $q->whereHas('customer', function ($subQ) use ($searchTerm) {
                    $subQ->where('first_name', 'like', $searchTerm)
                         ->orWhere('surname', 'like', $searchTerm)
                         ->orWhere('other_names', 'like', $searchTerm)
                         ->orWhere('company_name', 'like', $searchTerm);
                })
                ->orWhereHas('items', function ($subQ) use ($searchTerm) {
                    $subQ->where('invoiceno', 'like', $searchTerm);
                });
            });
        }

        // --- 3. Always Apply Date Filter ---
        $parsedStartDate = Carbon::parse($startDate)->startOfDay();
        $parsedEndDate = Carbon::parse($endDate)->endOfDay();
        $query->whereBetween('created_at', [$parsedStartDate, $parsedEndDate]);

        // Only show repayments that are not voided
        $query->where('voided', '=', 0);

        // Paginate and sort repayments
        $repayments = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        // --- 4. Return Data to Inertia View ---
        return Inertia::render('BilHistory/RepaymentHistory', [
            'repayments' => $repayments,
            'filters' => [
                'search'     => $request->input('search', ''),
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ],
        ]);
    }
     
    /**
     * Display the detailed preview page for a single repayment.
     *
     * @param BILInvoicePayment $repayment
     * @return \Inertia\Response
     */
    public function previewRepayment(BILInvoicePayment $repayment)
    {       
        // Eager load all necessary relationships for the preview component
        $repayment->load(['customer','items']); 

        return Inertia::render('BilHistory/RepaymentPreview', [
            'repayment' => $repayment,           
        ]);
    }

    /**
     * Handle the request to void a repayment.
     *
     * @param Request $request
     * @param BILInvoicePayment $repayment
     * @return \Illuminate\Http\RedirectResponse
     */
    public function postVoidRepayment(Request $request, BILInvoicePayment $repayment)
    {
        // 1. Validate the incoming request for remarks
        $validated = $request->validate([
            'remarks' => 'required|string|min:5|max:255',
        ]);

        try {
            // Safety check to prevent voiding an already-voided transaction
            if ($repayment->voided) {
                return back()->with('error', 'This repayment has already been voided.');
            }

            // 2. Delegate the complex reversal logic to the private `voidPayment` function from the trait
            $this->voidPayment(
                $repayment,
                now(),
                $validated['remarks']
            );

            // 3. On success, redirect back to the same preview page.
            return redirect()->route('billing4.preview', $repayment->id)
                             ->with('success', 'Repayment voided successfully!');

        } catch (\Exception $e) {
            \Log::error('Failed to void repayment: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            // Redirect back with a generic error message
            return back()->with('error', 'An unexpected error occurred while voiding the repayment.');
        }
    }
}