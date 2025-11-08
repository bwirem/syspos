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
use App\Models\BLSPaymentType; // <-- Import the new model

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
    // ... index() method is unchanged ...
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
     * UPDATED: Now fetches payment types for the form.
     */
    public function create()
    {
        return Inertia::render('ACCMakePayment/Create', [
            'paymentTypes' => BLSPaymentType::all(['id', 'name']),
        ]);
    }

    /**
     * UPDATED: Validation for payment_method is now more strict.
     */
    public function store(Request $request)
    {      

        $validated = $request->validate([
            'transdate' => 'required|date',
            'recipient_type' => 'required|string',
            'recipient_id' => 'required|integer|exists:siv_suppliers,id',
            'payment_method' => 'required|string|exists:bls_paymenttypes,name', // Validate against the table
            'reference_number' => 'nullable|string|max:255',
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
                'stage' => 1,
                'recipient_id' => $validated['recipient_id'],
                'recipient_type' => $validated['recipient_type'],
                'payment_method' => $request->payment_method,
                'reference_number' => $request->reference_number,
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

            $payment->load(['recipient', 'items', 'facilityoption.chartOfAccount']);
            $this->createJournalEntryForPayment($payment);
        });

        return redirect()->route('accounting1.index')->with('success', 'Payment created successfully.');
    }

    /**
     * UPDATED: Now fetches payment types for the form.
     */
    public function edit(ACCMakePayment $payment)
    {
        $payment->load(['recipient', 'items.payable', 'documents', 'facilityoption']);
        return Inertia::render('ACCMakePayment/Edit', [
            'payment' => $payment,
            'paymentTypes' => BLSPaymentType::all(['id', 'name']),
        ]);
    }

    /**
     * UPDATED: Validation for payment_method is now more strict.
     */
    public function update(Request $request, ACCMakePayment $payment)
    {       
       
        $validated = $request->validate([
            'transdate' => 'required|date',
            'recipient_id' => 'required|integer|exists:siv_suppliers,id',
            'recipient_type' => 'required|string',
            'payment_method' => 'required|string|exists:bls_paymenttypes,name', // Validate against the table
            'reference_number' => 'nullable|string|max:255',
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
            
            $payment->update($request->only(['transdate', 'recipient_id', 'recipient_type', 'payment_method', 'reference_number', 'description', 'currency']));

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

    public function destroy(ACCMakePayment $payment)
    {
        DB::transaction(function () use ($payment) {
            foreach ($payment->documents as $document) Storage::disk('public')->delete($document->url);
            $payment->delete();
        });
        return redirect()->route('accounting1.index')->with('success', 'Payment deleted successfully.');
    }

    /**
     * Approve a pending payment.
     */
    public function approve(ACCMakePayment $payment)
    {
        // Add authorization check if needed, e.g., if ($payment->stage != 1) abort(403);
        
        $payment->update(['stage' => 2]); // 2 = Approved

        return redirect()->back()->with('success', 'Payment #' . $payment->id . ' has been approved.');
    }

    /**
     * Mark an approved payment as paid and create the final journal entry.
     */
    public function pay(ACCMakePayment $payment)
    {
        // Add authorization check if needed, e.g., if ($payment->stage != 2) abort(403);

        DB::transaction(function () use ($payment) {
            $payment->update(['stage' => 3]); // 3 = Paid
            
            // Load necessary relationships before creating the journal entry
            $payment->load(['recipient', 'items', 'facilityoption.chartOfAccount']);
            
            // Call the existing method to create the journal entries
            $this->createJournalEntryForPayment($payment);
        });

        return redirect()->back()->with('success', 'Payment #' . $payment->id . ' marked as paid and journalized.');
    }

     /**
     * Show the confirmation page before approving a payment.
     */
    public function showApproveConfirm(ACCMakePayment $payment)
    {
        // Ensure only pending payments can access this page
        if ($payment->stage !== 1) {
            return redirect()->route('accounting1.edit', $payment->id)->with('error', 'This payment is not pending approval.');
        }
        $payment->load(['recipient', 'items.payable']);
        return Inertia::render('ACCMakePayment/Approval', [
            'payment' => $payment,
        ]);
    }

    /**
     * Show the confirmation page before marking a payment as paid.
     */
    public function showPayConfirm(ACCMakePayment $payment)
    {
        // Ensure only approved payments can access this page
        if ($payment->stage !== 2) {
            return redirect()->route('accounting1.edit', $payment->id)->with('error', 'This payment has not been approved for payment.');
        }
        $payment->load(['recipient', 'items.payable', 'facilityoption.chartOfAccount']);
        return Inertia::render('ACCMakePayment/Payment', [
            'payment' => $payment,
        ]);
    }

    private function createJournalEntryForPayment(ACCMakePayment $payment): void
    {
        $cashOrBankAccount = $payment->facilityoption->chartOfAccount;
        if (!$cashOrBankAccount) {
            throw new Exception("Facility #{$payment->facilityoption_id} does not have a default Chart of Account assigned.");
        }

        $journalEntry = ACCJournalEntry::create([
            'entry_date' => $payment->transdate,
            'description' => "Payment #{$payment->id} to {$payment->recipient->display_name}",
            'reference_number' => $payment->reference_number,
        ]);

        $journalEntry->journalEntryLines()->create([
            'account_id' => $cashOrBankAccount->id,
            'credit' => $payment->total_amount,
        ]);

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

    public function searchPayables(Request $request)
    {
        $query = $request->input('query', '');
        $accounts = ChartOfAccount::where(fn($q) => $q->where('account_name', 'LIKE', "%{$query}%")->orWhere('account_code', 'LIKE', "%{$query}%"))->where('is_active', true)->limit(10)->get(['id', 'account_name', 'account_code']);
        return response()->json(['data' => $accounts->map(fn($a) => ['id' => $a->id, 'name' => "{$a->account_name} ({$a->account_code})", 'type' => ChartOfAccount::class])]);
    }
}