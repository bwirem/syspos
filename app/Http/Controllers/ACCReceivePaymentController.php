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
            'items' => 'required|array|min:1',
            'items.*.receivable_id' => 'required|integer|exists:chart_of_accounts,id',
            'items.*.receivable_type' => 'required|string',
            'items.*.amount' => 'required|numeric|min:0.01',
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
                'payment_method' => $validated['payment_method'],
                'reference_number' => $request->reference_number,
                'currency' => $request->currency ?? 'USD',
                'user_id' => Auth::id(),
            ]);
            foreach ($validated['items'] as $item) $payment->items()->create($item);
            if ($request->hasFile('documents')) {
                 foreach ($request->file('documents') as $file) {
                    $path = $file->store('received_payment_docs', 'public');
                    $payment->documents()->create(['url' => $path, 'filename' => $file->getClientOriginalName(), 'type' => $file->getClientMimeType(), 'size' => $file->getSize()]);
                }
            }
        });

        return redirect()->route('accounting0.index')->with('success', 'Payment received and recorded successfully.');
    }

    public function show(ACCReceivePayment $payment)
    {
        $payment->load(['payer', 'items.receivable', 'documents', 'facilityoption']);
        return Inertia::render('ACCReceivePayment/Show', ['receivedPayment' => $payment]);
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
            'payer_type' => 'required|string',
            'payer_id' => 'required|integer|exists:bls_customers,id',
            'payment_method' => 'required|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|exists:acc_receivepaymentitems,id',
            'items.*.receivable_id' => 'required|integer|exists:chart_of_accounts,id',
            'items.*.receivable_type' => 'required|string',
            'items.*.amount' => 'required|numeric|min:0.01',
            'documents' => 'nullable|array',
            'documents.*' => 'file|mimes:pdf,jpg,png,jpeg,doc,docx|max:5120',
            'documents_to_delete' => 'nullable|array',
            'documents_to_delete.*' => 'integer|exists:acc_receivepaymentdocuments,id',
        ]);

        DB::transaction(function () use ($validated, $request, $payment) {
            // 1. Update the main payment record
            $payment->update([
                'transdate' => $validated['transdate'],
                'facilityoption_id' => $validated['facilityoption_id'],
                'payer_id' => $validated['payer_id'],
                'payer_type' => $validated['payer_type'],
                'payment_method' => $validated['payment_method'],
                'reference_number' => $request->reference_number,
                'description' => $request->description,
                'currency' => $request->currency,
            ]);

            // 2. Sync Items
            $itemIdsToKeep = collect($validated['items'])->pluck('id')->filter();
            $payment->items()->whereNotIn('id', $itemIdsToKeep)->delete();

            foreach ($validated['items'] as $itemData) {
                $payment->items()->updateOrCreate(
                    ['id' => $itemData['id'] ?? null],
                    $itemData
                );
            }

            // 3. Sync Documents: Delete orphans
            if (!empty($validated['documents_to_delete'])) {
                $docsToDelete = $payment->documents()->whereIn('id', $validated['documents_to_delete'])->get();
                foreach ($docsToDelete as $doc) {
                    Storage::disk('public')->delete($doc->url);
                    $doc->delete();
                }
            }

            // 4. Add new documents
            if ($request->hasFile('documents')) {
                foreach ($request->file('documents') as $file) {
                    $path = $file->store('received_payment_docs', 'public');
                    $payment->documents()->create(['url' => $path, 'filename' => $file->getClientOriginalName(), 'type' => $file->getClientMimeType(), 'size' => $file->getSize()]);
                }
            }

            // 5. Recalculate total and save
            $totalAmount = $payment->fresh()->items->sum('amount');
            $payment->update(['total_amount' => $totalAmount]);
        });

        return redirect()->route('accounting0.index')->with('success', 'Received payment updated successfully.');
    }

    public function destroy(ACCReceivePayment $payment)
    {
        DB::transaction(fn() => $payment->delete());
        return redirect()->route('accounting0.index')->with('success', 'Received payment record deleted.');
    }

    public function searchPayers(Request $request)
    {
        $query = $request->input('query', '');
        $customers = BLSCustomer::where(function($q) use ($query) {
                $q->where('company_name', 'LIKE', "%{$query}%")
                  ->orWhere('first_name', 'LIKE', "%{$query}%")
                  ->orWhere('surname', 'LIKE', "%{$query}%");
            })
            ->limit(10)
            ->get();

        return response()->json([
            // UPDATE THIS to use the new accessor
            'data' => $customers->map(function ($customer) {
                return [
                    'id' => $customer->id,
                    'name' => $customer->display_name, // Use the accessor here
                    'type' => BLSCustomer::class,
                ];
            })
        ]);
    }


    public function searchReceivables(Request $request)
    {
        $query = $request->input('query', '');
        $accounts = ChartOfAccount::where(fn($q) => $q->where('account_name', 'LIKE', "%{$query}%")->orWhere('account_code', 'LIKE', "%{$query}%"))->where('is_active', true)->limit(10)->get(['id', 'account_name', 'account_code']);
        return response()->json(['data' => $accounts->map(fn($a) => ['id' => $a->id, 'name' => "{$a->account_name} ({$a->account_code})", 'type' => ChartOfAccount::class])]);
    }
}