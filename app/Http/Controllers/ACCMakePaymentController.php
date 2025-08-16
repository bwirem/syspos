<?php

namespace App\Http\Controllers;

// Correct Model Imports
use App\Models\ACCMakePayment;
use App\Models\ChartOfAccount;
use App\Models\FacilityOption;
use App\Models\SPR_Supplier;
use App\Models\User;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ACCMakePaymentController extends Controller
{
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

    public function create()
    {
        return Inertia::render('ACCMakePayment/Create', [
            'facilities' => FacilityOption::all(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'transdate' => 'required|date',
            'facilityoption_id' => 'required|exists:facilityoptions,id',
            'recipient_type' => 'required|string',
            'recipient_id' => 'required|integer|exists:siv_suppliers,id',
            'payment_method' => 'required|string|max:100',
            'reference_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.payable_id' => 'required|integer|exists:chart_of_accounts,id',
            'items.*.payable_type' => 'required|string',
            'items.*.amount' => 'required|numeric|min:0.01',
            'document_rows' => 'nullable|array',
            'document_rows.*.description' => 'required_with:document_rows.*.file|string|max:255',
            'document_rows.*.file' => 'nullable|file|mimes:pdf,jpg,png,jpeg,doc,docx|max:5120',
        ]);

        DB::transaction(function () use ($validated, $request) {
            $totalAmount = collect($validated['items'])->sum('amount');
            $payment = ACCMakePayment::create([
                'transdate' => $validated['transdate'],
                'total_amount' => $totalAmount,
                'facilityoption_id' => $validated['facilityoption_id'],
                'stage' => 1,
                'recipient_id' => $validated['recipient_id'],
                'recipient_type' => $validated['recipient_type'],
                'payment_method' => $request->payment_method,
                'reference_number' => $request->reference_number,
                'description' => $request->description,
                'currency' => $request->currency,
                'user_id' => Auth::id(),
            ]);

            // Clean the `items` array to remove the UI-only `payable` object before creating.
            $cleanedItems = collect($validated['items'])->map(fn($item) => collect($item)->except('payable')->all());
            foreach ($cleanedItems as $item) {
                $payment->items()->create($item);
            }

            // Save documents from the structured `document_rows`
            if ($request->has('document_rows')) {
                foreach ($request->document_rows as $index => $docRow) {
                    if ($request->hasFile("document_rows.{$index}.file")) {
                        $file = $request->file("document_rows.{$index}.file");
                        $path = $file->store('payment_documents', 'public');
                        $payment->documents()->create([
                            'url' => $path,
                            'filename' => $file->getClientOriginalName(),
                            'type' => $file->getClientMimeType(),
                            'size' => $file->getSize(),
                            'description' => $docRow['description'],
                        ]);
                    }
                }
            }
        });

        return redirect()->route('accounting1.index')->with('success', 'Payment created successfully.');
    }

    public function edit(ACCMakePayment $payment)
    {
        $payment->load(['recipient', 'items.payable', 'documents', 'facilityoption']);
        return Inertia::render('ACCMakePayment/Edit', [
            'payment' => $payment,
            'facilities' => FacilityOption::all(['id', 'name']),
        ]);
    }

    public function update(Request $request, ACCMakePayment $payment)
    {
        $validated = $request->validate([
            'transdate' => 'required|date',
            'facilityoption_id' => 'required|exists:facilityoptions,id',
            'recipient_id' => 'required|integer|exists:siv_suppliers,id',
            'recipient_type' => 'required|string',
            'payment_method' => 'required|string|max:100',
            'reference_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|exists:acc_makepaymentitems,id',
            'items.*.payable_id' => 'required|integer|exists:chart_of_accounts,id',
            'items.*.payable_type' => 'required|string',
            'items.*.amount' => 'required|numeric|min:0.01',
            'document_rows' => 'nullable|array',
            'document_rows.*.description' => 'required_with:document_rows.*.file|string|max:255',
            'document_rows.*.file' => 'nullable|file|mimes:pdf,jpg,png,jpeg,doc,docx|max:5120',
            'documents_to_delete' => 'nullable|array',
            'documents_to_delete.*' => 'integer|exists:acc_makepaymentdocuments,id',
        ]);

        DB::transaction(function () use ($validated, $request, $payment) {
            $payment->update($request->only(['transdate', 'facilityoption_id', 'recipient_id', 'recipient_type', 'payment_method', 'reference_number', 'description', 'currency']));

            $cleanedItems = collect($validated['items'])->map(fn($item) => collect($item)->except('payable')->all());
            $itemIdsToKeep = $cleanedItems->pluck('id')->filter();
            $payment->items()->whereNotIn('id', $itemIdsToKeep)->delete();
            foreach ($cleanedItems as $itemData) {
                $payment->items()->updateOrCreate(['id' => $itemData['id'] ?? null], $itemData);
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
                        $path = $file->store('payment_documents', 'public');
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