<?php

namespace App\Http\Controllers;

// Correct Model Imports
use App\Models\ACCMakePayment;
use App\Models\ACCJournalEntry;
use App\Models\ChartOfAccount;
use App\Models\FacilityOption;
use App\Models\SPR_Supplier;
use App\Models\User;
use App\Models\ChartOfAccountMapping;
use App\Models\BLSPaymentType;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Exception;
use Illuminate\Support\Facades\Log;

class ACCMakePaymentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = ACCMakePayment::with(['recipient', 'user', 'facilityoption']);

        if ($request->filled('search')) {
            $query->whereHasMorph('recipient', [SPR_Supplier::class], function ($q) use ($request) {
                $search = $request->search;
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('surname', 'like', "%{$search}%");
            });
        }

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        $payments = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('ACCMakePayment/Index', [
            'payments' => $payments,
            'filters' => $request->only(['search', 'stage']),
            'success' => session('success'),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('ACCMakePayment/Create', [
            // 'paymentTypes' are no longer needed here, they are fetched for the 'pay' screen
        ]);
    }

    /**
     * Store a newly created pending payment.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'transdate' => 'required|date',
            'recipient_type' => 'required|string',
            'recipient_id' => 'required|integer|exists:siv_suppliers,id',
            'description' => 'nullable|string',
            'currency' => 'required|string|max:3',
            'items' => 'required|array|min:1',
            'items.*.amount' => 'required|numeric|min:0.01',
            'items.*.description' => 'nullable|string|max:255',
            'document_rows' => 'nullable|array',
            'document_rows.*.description' => 'required_with:document_rows.*.file|string|max:255',
            'document_rows.*.file' => 'nullable|file|mimes:pdf,jpg,png,jpeg,doc,docx|max:5120',
        ]);

        DB::transaction(function () use ($validated, $request) {
            $defaultFacility = FacilityOption::firstOrFail();
            $payableAccountId = ChartOfAccountMapping::firstOrFail()->account_payable_id;
            $totalAmount = collect($validated['items'])->sum('amount');
            
            $payment = ACCMakePayment::create([
                'transdate' => $validated['transdate'],
                'total_amount' => $totalAmount,
                'facilityoption_id' => $defaultFacility->id,
                'stage' => 1, // 1 = Pending
                'recipient_id' => $validated['recipient_id'],
                'recipient_type' => $validated['recipient_type'],
                'description' => $request->description,
                'currency' => $request->currency,
                'user_id' => Auth::id(),
            ]);

            foreach ($validated['items'] as $itemData) {
                $payment->items()->create([
                    'amount' => $itemData['amount'],
                    'description' => $itemData['description'] ?? null,
                    'payable_id' => $payableAccountId,
                    'payable_type' => ChartOfAccount::class,
                ]);
            }

            if ($request->has('document_rows')) {
                foreach ($request->document_rows as $index => $docRow) {
                    if ($request->hasFile("document_rows.{$index}.file")) {
                        $file = $request->file("document_rows.{$index}.file");
                        $path = $file->store('payment_documents', 'public');
                        $payment->documents()->create(['url' => $path, 'filename' => $file->getClientOriginalName(), 'type' => $file->getClientMimeType(), 'size' => $file->getSize(), 'description' => $docRow['description']]);
                    }
                }
            }
        });

        return redirect()->route('accounting1.index')->with('success', 'Payment created successfully.');
    }

    /**
     * Show the form for editing an existing payment.
     */
    public function edit(ACCMakePayment $payment)
    {
        $payment->load(['recipient', 'items.payable', 'documents', 'facilityoption']);
        return Inertia::render('ACCMakePayment/Edit', [
            'payment' => $payment,
            // 'paymentTypes' are only needed for the final pay screen
        ]);
    }

    /**
     * Update an existing pending payment.
     */
    public function update(Request $request, ACCMakePayment $payment)
    {
        if ($payment->stage !== 1) {
            return redirect()->back()->with('error', 'Only pending payments can be edited.');
        }

        $validated = $request->validate([
            'transdate' => 'required|date',
            'recipient_id' => 'required|integer|exists:siv_suppliers,id',
            'recipient_type' => 'required|string',
            'description' => 'nullable|string',
            'currency' => 'required|string|max:3',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|exists:acc_makepaymentitems,id',
            'items.*.amount' => 'required|numeric|min:0.01',
            'items.*.description' => 'nullable|string|max:255',
            'document_rows' => 'nullable|array',
            'document_rows.*.description' => 'required_with:document_rows.*.file|string|max:255',
            'document_rows.*.file' => 'nullable|file|mimes:pdf,jpg,png,jpeg,doc,docx|max:5120',
            'documents_to_delete' => 'nullable|array',
            'documents_to_delete.*' => 'integer|exists:acc_makepaymentdocuments,id',
        ]);

        DB::transaction(function () use ($validated, $request, $payment) {
            $payableAccountId = ChartOfAccountMapping::firstOrFail()->account_payable_id;
            
            $payment->update($request->only(['transdate', 'recipient_id', 'recipient_type', 'description', 'currency']));

            $itemIdsToKeep = collect($validated['items'])->pluck('id')->filter();
            $payment->items()->whereNotIn('id', $itemIdsToKeep)->delete();

            foreach ($validated['items'] as $itemData) {
                $payload = [
                    'amount' => $itemData['amount'],
                    'description' => $itemData['description'] ?? null,
                    'payable_id' => $payableAccountId,
                    'payable_type' => ChartOfAccount::class,
                ];
                $payment->items()->updateOrCreate(['id' => $itemData['id'] ?? null], $payload);
            }

            if (!empty($validated['documents_to_delete'])) {
                $docsToDelete = $payment->documents()->whereIn('id', $validated['documents_to_delete'])->get();
                foreach ($docsToDelete as $doc) {
                    Storage::disk('public')->delete($doc->url);
                    $doc->delete();
                }
            }
            
            if ($request->has('document_rows')) {
                foreach ($request->document_rows as $index => $docRow) {
                    if ($request->hasFile("document_rows.{$index}.file")) {
                        $file = $request->file("document_rows.{$index}.file");
                        $path = $file->store('payment_documents/' . $payment->id, 'public');
                        $payment->documents()->create(['url' => $path, 'filename' => $file->getClientOriginalName(), 'type' => $file->getClientMimeType(), 'size' => $file->getSize(), 'description' => $docRow['description']]);
                    }
                }
            }

            $totalAmount = $payment->fresh()->items->sum('amount');
            $payment->update(['total_amount' => $totalAmount]);
        });

        return redirect()->route('accounting1.index')->with('success', 'Payment updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ACCMakePayment $payment)
    {
        if ($payment->stage !== 1) {
            return redirect()->back()->with('error', 'Only pending payments can be deleted.');
        }

        DB::transaction(function () use ($payment) {
            foreach ($payment->documents as $document) {
                Storage::disk('public')->delete($document->url);
            }
            $payment->items()->delete();
            $payment->documents()->delete();
            $payment->delete();
        });

        return redirect()->route('accounting1.index')->with('success', 'Payment deleted successfully.');
    }

    /**
     * Show the confirmation page before approving a payment.
     */
    public function showApproveConfirm(ACCMakePayment $payment)
    {
        if ($payment->stage !== 1) {
            return redirect()->route('accounting1.edit', $payment->id)->with('error', 'This payment is not pending approval.');
        }
        $payment->load(['recipient', 'items.payable']);
        return Inertia::render('ACCMakePayment/Approval', [
            'payment' => $payment,
        ]);
    }

    /**
     * Approve a pending payment.
     */
    public function approve(ACCMakePayment $payment)
    {
        if ($payment->stage !== 1) {
            return redirect()->back()->with('error', 'This payment cannot be approved.');
        }
        
        $payment->update(['stage' => 2]); // 2 = Approved

        return redirect()->route('accounting1.edit', $payment->id)->with('success', 'Payment #' . $payment->id . ' has been approved.');
    }
    
    /**
     * Show the confirmation page before marking a payment as paid.
     */
    public function showPayConfirm(ACCMakePayment $payment)
    {
        if ($payment->stage !== 2) {
            return redirect()->route('accounting1.edit', $payment->id)->with('error', 'This payment has not been approved for payment.');
        }
        $payment->load(['recipient', 'items.payable', 'facilityoption.chartOfAccount']);
        return Inertia::render('ACCMakePayment/Payment', [
            'payment' => $payment,
            'paymentTypes' => BLSPaymentType::all(['id', 'name']),
        ]);
    }

    /**
     * Mark an approved payment as paid and create the final journal entry.
     */
    public function pay(Request $request, ACCMakePayment $payment)
    {
        if ($payment->stage !== 2) {
            return redirect()->back()->with('error', 'This payment is not ready to be paid.');
        }

        $validated = $request->validate([
            'payment_method' => 'required|string|exists:bls_paymenttypes,name',
            'reference_number' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($payment, $validated) {
            $payment->update([
                'stage' => 3, // 3 = Paid
                'payment_method' => $validated['payment_method'],
                'reference_number' => $validated['reference_number'],
            ]);
            
            $payment->load(['recipient', 'items', 'facilityoption.chartOfAccount']);
            //$this->createJournalEntryForPayment($payment);
        });

        return redirect()->route('accounting1.edit', $payment->id)->with('success', 'Payment marked as paid and journalized.');
    }

    /**
     * Creates the double-entry journal records for a given payment.
     */
    private function createJournalEntryForPayment(ACCMakePayment $payment): void
    {
        $cashOrBankAccount = $payment->facilityoption->chartOfAccount;
        if (!$cashOrBankAccount) {
            throw new Exception("Facility #{$payment->facilityoption_id} does not have a default Chart of Account assigned for payments.");
        }

        $journalEntry = ACCJournalEntry::create([
            'entry_date' => $payment->transdate,
            'description' => "Payment #{$payment->id} to {$payment->recipient->display_name}",
            'reference_number' => $payment->reference_number,
        ]);

        // Credit the asset account (Cash/Bank) that the money came FROM
        $journalEntry->journalEntryLines()->create([
            'account_id' => $cashOrBankAccount->id,
            'credit' => $payment->total_amount,
        ]);

        // Debit the liability account (Accounts Payable) that was paid
        foreach ($payment->items as $item) {
            $journalEntry->journalEntryLines()->create([
                'account_id' => $item->payable_id,
                'debit' => $item->amount,
            ]);
        }

        if (round($journalEntry->journalEntryLines()->sum('debit'), 2) !== round($journalEntry->journalEntryLines()->sum('credit'), 2)) {
            throw new Exception("Journal entry for Payment #{$payment->id} is not balanced.");
        }
    }

    /**
     * Search for recipients (Suppliers).
     */
    public function searchRecipients(Request $request)
    {
        $query = $request->input('query', '');
        $suppliers = SPR_Supplier::where(function ($q) use ($query) {
                $q->where('company_name', 'LIKE', "%{$query}%")
                  ->orWhere('first_name', 'LIKE', "%{$query}%")
                  ->orWhere('surname', 'LIKE', "%{$query}%");
            })->limit(10)->get();

        return response()->json(['data' => $suppliers->map(fn($s) => ['id' => $s->id, 'name' => $s->display_name, 'type' => SPR_Supplier::class])]);
    }
}