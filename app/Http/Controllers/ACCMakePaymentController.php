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
            'items' => 'required|array|min:1',
            'items.*.payable_id' => 'required|integer|exists:chart_of_accounts,id',
            'items.*.payable_type' => 'required|string',
            'items.*.amount' => 'required|numeric|min:0.01',
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
                'payment_method' => $validated['payment_method'],
                'reference_number' => $request->reference_number,
                'currency' => $request->currency ?? 'USD',
                'user_id' => Auth::id(),
            ]);
            foreach ($validated['items'] as $item) $payment->items()->create($item);
            if ($request->hasFile('documents')) {
                foreach ($request->file('documents') as $file) {
                    $path = $file->store('payment_documents', 'public');
                    $payment->documents()->create(['url' => $path, 'filename' => $file->getClientOriginalName(), 'type' => $file->getClientMimeType(), 'size' => $file->getSize()]);
                }
            }
        });

        return redirect()->route('accounting1.index')->with('success', 'Payment created successfully.');
    }

    public function show(ACCMakePayment $payment)
    {
        $payment->load(['recipient', 'items.payable', 'documents', 'facilityoption']);
        return Inertia::render('ACCMakePayment/Show', ['payment' => $payment]);
    }

    public function edit(ACCMakePayment $payment)
    {
        $payment->load(['recipient', 'items.payable', 'documents', 'facilityoption']);
        return Inertia::render('ACCMakePayment/Edit', ['payment' => $payment, 'facilities' => FacilityOption::all(['id', 'name'])]);
    }

    
   
    public function update(Request $request, ACCMakePayment $payment)
    {
        // Note: For file uploads with PUT/PATCH, the front-end must send a POST request with a `_method: 'PUT'` field.
        $validated = $request->validate([
            'transdate' => 'required|date',
            'facilityoption_id' => 'required|exists:facilityoptions,id',
            'recipient_type' => 'required|string',
            'recipient_id' => 'required|integer|exists:siv_suppliers,id',
            'payment_method' => 'required|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|exists:acc_makepaymentitems,id', // For existing items
            'items.*.payable_id' => 'required|integer|exists:chart_of_accounts,id',
            'items.*.payable_type' => 'required|string',
            'items.*.amount' => 'required|numeric|min:0.01',
            'documents' => 'nullable|array',
            'documents.*' => 'file|mimes:pdf,jpg,png,jpeg,doc,docx|max:5120',
            'documents_to_delete' => 'nullable|array',
            'documents_to_delete.*' => 'integer|exists:acc_makepaymentdocuments,id',
        ]);

        DB::transaction(function () use ($validated, $request, $payment) {
            // 1. Update the main payment record's details
            $payment->update([
                'transdate' => $validated['transdate'],
                'facilityoption_id' => $validated['facilityoption_id'],
                'recipient_id' => $validated['recipient_id'],
                'recipient_type' => $validated['recipient_type'],
                'payment_method' => $validated['payment_method'],
                'reference_number' => $request->reference_number,
                'description' => $request->description,
                'currency' => $request->currency,
            ]);

            // 2. Sync Items: Delete orphans, then update or create the rest.
            $itemIdsToKeep = collect($validated['items'])->pluck('id')->filter();
            $payment->items()->whereNotIn('id', $itemIdsToKeep)->delete();

            foreach ($validated['items'] as $itemData) {
                $payment->items()->updateOrCreate(
                    ['id' => $itemData['id'] ?? null], // Condition to find existing item
                    $itemData // Data to update or create with
                );
            }

            // 3. Sync Documents: Delete any marked for removal
            if (!empty($validated['documents_to_delete'])) {
                $docsToDelete = $payment->documents()->whereIn('id', $validated['documents_to_delete'])->get();
                foreach ($docsToDelete as $doc) {
                    Storage::disk('public')->delete($doc->url);
                    $doc->delete();
                }
            }

            // 4. Add any new documents
            if ($request->hasFile('documents')) {
                foreach ($request->file('documents') as $file) {
                    $path = $file->store('payment_documents', 'public');
                    $payment->documents()->create(['url' => $path, 'filename' => $file->getClientOriginalName(), 'type' => $file->getClientMimeType(), 'size' => $file->getSize()]);
                }
            }

            // 5. Recalculate the total amount and save it
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
            })
            ->limit(10)
            ->get();

        return response()->json([
            // We now use the `display_name` accessor to create the `name` attribute
            // that the frontend search dropdown expects.
            'data' => $suppliers->map(function ($supplier) {
                return [
                    'id' => $supplier->id,
                    'name' => $supplier->display_name, // Use the new accessor here
                    'type' => SPR_Supplier::class,
                ];
            })
        ]);
    }

    public function searchPayables(Request $request)
    {
        $query = $request->input('query', '');
        $accounts = ChartOfAccount::where(fn($q) => $q->where('account_name', 'LIKE', "%{$query}%")->orWhere('account_code', 'LIKE', "%{$query}%"))->where('is_active', true)->limit(10)->get(['id', 'account_name', 'account_code']);
        return response()->json(['data' => $accounts->map(fn($a) => ['id' => $a->id, 'name' => "{$a->account_name} ({$a->account_code})", 'type' => ChartOfAccount::class])]);
    }
}