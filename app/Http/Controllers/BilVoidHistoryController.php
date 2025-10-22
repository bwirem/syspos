<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\GeneratesUniqueNumbers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Inertia\Inertia;

// Import all necessary Models and Enums for this controller's responsibilities
use App\Models\{
    BILVoidedSale,
    BILRefund,
    BILCollection,
    BILDebtor,
    BILDebtorLog,
    BLSPaymentType
};
use App\Enums\{
    PaymentSources,
    VoidSources,
    BillingTransTypes
};

class BilVoidHistoryController extends Controller
{
    // This trait provides generateUniqueNumber()
    use GeneratesUniqueNumbers;

    /**
     * Display a paginated list of voided sales based on filter criteria.
     *
     * @param Request $request
     * @return \Inertia\Response
     */
    public function voidHistory(Request $request)
    {
        // --- 1. Set Default Dates ---
        $today = now()->format('Y-m-d');
        $startDate = $request->input('start_date', $today);
        $endDate = $request->input('end_date', $today);

        // --- 2. Build the Query ---
        $query = BILVoidedSale::with(['customer']); // Eager load customer

        // Filtering by customer name, invoice number, or receipt number
        if ($request->filled('search')) {
            $searchTerm = '%' . $request->search . '%';
            $query->where(function ($q) use ($searchTerm) {
                $q->whereHas('customer', function ($subQ) use ($searchTerm) {
                    $subQ->where('first_name', 'like', $searchTerm)
                         ->orWhere('surname', 'like', $searchTerm)
                         ->orWhere('other_names', 'like', $searchTerm)
                         ->orWhere('company_name', 'like', $searchTerm);
                })->orWhere('invoice_number', 'like', $searchTerm)
                  ->orWhere('receiptno', 'like', $searchTerm);
            });
        }

        // --- 3. Always Apply Date Filter ---
        $parsedStartDate = Carbon::parse($startDate)->startOfDay();
        $parsedEndDate = Carbon::parse($endDate)->endOfDay();
        $query->whereBetween('created_at', [$parsedStartDate, $parsedEndDate]);

        // Paginate and sort voided sales
        $voidsales = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        // --- 4. Return Data to Inertia View ---
        return Inertia::render('BilHistory/VoidHistory', [
            'voidsales' => $voidsales,
            'filters' => [
                'search'     => $request->input('search', ''),
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ],
        ]);
    }

    /**
     * Display the detailed preview page for a single voided sale.
     *
     * @param BILVoidedSale $voidsale
     * @return \Inertia\Response
     */
    public function previewVoid(BILVoidedSale $voidsale)
    {       
        // Eager load all relationships needed for the preview and potential refund action
        $voidsale->load(['customer', 'items.item', 'invoicepaymentdetails']); 

        return Inertia::render('BilHistory/VoidPreview', [
            'sale' => $voidsale,           
        ]);
    }

    /**
     * Show the form for creating a new refund for a voided sale.
     *
     * @param BILVoidedSale $voidsale
     * @return \Inertia\Response
     */
    public function createRefund(BILVoidedSale $voidsale)
    {
        $voidsale->load(['customer', 'items.item']);        

        return Inertia::render('BilHistory/VoidRefund', [
            'voided_sale' => $voidsale,
            'payment_methods' => BLSPaymentType::all(),            
        ]);
    }

    /**
     * Store a new refund record and update all associated financial records.
     *
     * @param Request $request
     * @param BILVoidedSale $voidsale
     * @return \Illuminate\Http\RedirectResponse
     */
    public function storeRefund(Request $request, BILVoidedSale $voidsale)
    {
        // --- 1. Validation ---
        $maxRefundable = $voidsale->totalpaid - $voidsale->refunded_amount;
        $validated = $request->validate([
            'transdate' => 'required|date',
            'refund_amount' => "required|numeric|min:0.01|max:{$maxRefundable}",
            'paymentmethod_id' => 'required|exists:bls_paymenttypes,id',
            'remarks' => 'nullable|string|max:255',
            'voidedsale_id' => 'required|exists:bil_voidedsales,id',
        ]);

        // --- 2. Database Transaction ---
        DB::transaction(function () use ($validated, $voidsale) {
            $transdate = Carbon::parse($validated['transdate']);
            $yearpart = $transdate->year;
            $monthpart = $transdate->month;
            $refundAmount = $validated['refund_amount'];           
            $refundNo = $this->generateUniqueNumber(BILRefund::class, 'refundno', 'REF');

            // B. Create the BILRefund record
            BILRefund::create([
                'transdate' => $transdate, 'refundno' => $refundNo, 'customer_id' => $voidsale->customer_id,
                'voidedsale_id' => $voidsale->id, 'refund_amount' => $refundAmount,
                'paymentmethod_id' => $validated['paymentmethod_id'], 'remarks' => $validated['remarks'],
                'yearpart' => $yearpart, 'monthpart' => $monthpart, 'transtype' => BillingTransTypes::Refund->value,
                'user_id' => Auth::id(),
            ]);

            // C. Update the BILVoidedSale record
            $voidsale->increment('refunded_amount', $refundAmount);
            if ($voidsale->refunded_amount >= $voidsale->totalpaid) {
                $voidsale->is_refunded = true;
            }
            $voidsale->save();

            // D. Create a negative BILCollection entry for the cash flow
            $paymentMethodColumn = 'paytype' . str_pad($validated['paymentmethod_id'], 6, '0', STR_PAD_LEFT);
            BILCollection::create([
                'transdate' => $transdate, 'receiptno' => $refundNo, 'paymentsource' => $voidsale->voidsource,
                'customer_id' => $voidsale->customer_id, $paymentMethodColumn => -$refundAmount,
                'yearpart' => $yearpart, 'monthpart' => $monthpart, 'transtype' => BillingTransTypes::Refund->value,
                'user_id' => Auth::id(),
            ]);            
        });

        // --- 3. Redirect on Success ---
        return redirect()->route('billing5.voidsalehistory')->with('success', 'Refund processed successfully!');
    }

}