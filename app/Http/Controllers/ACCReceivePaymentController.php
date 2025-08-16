<?php

namespace App\Http\Controllers;

use App\Models\ACCReceivePayment;
use App\Models\FacilityOption;
use App\Models\BLSCustomer;
use App\Models\ChartOfAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ACCReceivePaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = ACCReceivePayment::with(['payer', 'user', 'facilityoption']);
        if ($request->filled('search')) {
            $query->whereHasMorph('payer', [BLSCustomer::class], function ($q) use ($request) {
                $search = $request->search;
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('surname', 'like', "%{$search}%");
            });
        }
        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }
        $receivedPayments = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('ACCReceivePayment/Index', [
            'receivedPayments' => $receivedPayments,
            'filters' => $request->only(['search', 'stage']),
            'success' => session('success'),
        ]);
    }

    public function create()
    {
        return Inertia::render('ACCReceivePayment/Create', [
            'facilities' => FacilityOption::all(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'transdate' => 'required|date',
            'facilityoption_id' => 'required|exists:facilityoptions,id',
            'payer_type' => 'required|string',
            'payer_id' => 'required|integer|exists:bls_customers,id',
            'payment_method' => 'required|string|max:100',
            'reference_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.receivable_id' => 'required|integer|exists:chart_of_accounts,id',
            'items.*.receivable_type' => 'required|string',
            'items.*.amount' => 'required|numeric|min:0.01',
            'document_rows' => 'nullable|array',
            'document_rows.*.description' => 'required_with:document_rows.*.file|string|max:255',
            'document_rows.*.file' => 'nullable|file|mimes:pdf,jpg,png,jpeg,doc,docx|max:5120',
        ]);

        DB::transaction(function () use ($validated, $request) {
            $total = collect($validated['items'])->sum('amount');
            $payment = ACCReceivePayment::create([
                'transdate' => $validated['transdate'],
                'total_amount' => $total,
                'facilityoption_id' => $validated['facilityoption_id'],
                'stage' => 1,
                'payer_id' => $validated['payer_id'],
                'payer_type' => $validated['payer_type'],
                'payment_method' => $request->payment_method,
                'reference_number' => $request->reference_number,
                'description' => $request->description,
                'currency' => $request->currency ?? 'USD',
                'user_id' => Auth::id(),
            ]);

            $cleanedItems = collect($validated['items'])->map(fn($item) => collect($item)->except('receivable')->all());
            foreach ($cleanedItems as $item) {
                $payment->items()->create($item);
            }

            if ($request->has('document_rows')) {
                foreach ($request->document_rows as $index => $docRow) {
                    if ($request->hasFile("document_rows.{$index}.file")) {
                        $file = $request->file("document_rows.{$index}.file");
                        $path = $file->store('received_payment_docs', 'public');
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

        return redirect()->route('accounting0.index')->with('success', 'Payment received and recorded successfully.');
    }

    public function edit(ACCReceivePayment $payment)
    {
        $payment->load(['payer', 'items.receivable', 'documents', 'facilityoption']);
        return Inertia::render('ACCReceivePayment/Edit', [
            'receivedPayment' => $payment,
            'facilities' => FacilityOption::all(['id', 'name']),
        ]);
    }
   
    public function update(Request $request, ACCReceivePayment $payment)
    {
        $validated = $request->validate([
            'transdate' => 'required|date',
            'facilityoption_id' => 'required|exists:facilityoptions,id',
            'payer_id' => 'required|integer|exists:bls_customers,id',
            'items' => 'required|array|min:1',
            'document_rows' => 'nullable|array',
            'document_rows.*.description' => 'required_with:document_rows.*.file|string|max:255',
            'document_rows.*.file' => 'nullable|file|mimes:pdf,jpg,png,jpeg,doc,docx|max:5120',
            'documents_to_delete' => 'nullable|array',
            'documents_to_delete.*' => 'integer|exists:acc_receivepaymentdocuments,id',
        ]);

        DB::transaction(function () use ($validated, $request, $payment) {
            $payment->update($request->only(['transdate', 'facilityoption_id', 'payer_id', 'payer_type', 'payment_method', 'reference_number', 'description', 'currency']));

            $cleanedItems = collect($validated['items'])->map(fn($item) => collect($item)->except('receivable')->all());
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
                        $path = $file->store('received_payment_docs', 'public');
                        $payment->documents()->create(['url' => $path, 'filename' => $file->getClientOriginalName(), 'type' => $file->getClientMimeType(), 'size' => $file->getSize(), 'description' => $docRow['description']]);
                    }
                }
            }

            $totalAmount = $payment->fresh()->items->sum('amount');
            $payment->update(['total_amount' => $totalAmount]);
        });

        return redirect()->route('accounting0.index')->with('success', 'Received payment updated successfully.');
    }

    public function destroy(ACCReceivePayment $payment)
    {
        DB::transaction(function () use ($payment) {
            foreach ($payment->documents as $document) {
                Storage::disk('public')->delete($document->url);
            }
            $payment->delete();
        });
        return redirect()->route('accounting0.index')->with('success', 'Received payment record deleted.');
    }

    public function searchPayers(Request $request)
    {
        $query = $request->input('query', '');
        $customers = BLSCustomer::where(function($q) use ($query) {
                $q->where('company_name', 'LIKE', "%{$query}%")
                  ->orWhere('first_name', 'LIKE', "%{$query}%")
                  ->orWhere('surname', 'LIKE', "%{$query}%");
            })->limit(10)->get();

        return response()->json(['data' => $customers->map(fn($c) => ['id' => $c->id, 'name' => $c->display_name, 'type' => BLSCustomer::class])]);
    }

    public function searchReceivables(Request $request)
    {
        $query = $request->input('query', '');
        $accounts = ChartOfAccount::where(fn($q) => $q->where('account_name', 'LIKE', "%{$query}%")->orWhere('account_code', 'LIKE', "%{$query}%"))->where('is_active', true)->limit(10)->get(['id', 'account_name', 'account_code']);
        return response()->json(['data' => $accounts->map(fn($a) => ['id' => $a->id, 'name' => "{$a->account_name} ({$a->account_code})", 'type' => ChartOfAccount::class])]);
    }
}