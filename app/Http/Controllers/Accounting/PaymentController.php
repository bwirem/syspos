<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ACCPayment;



class PaymentController extends Controller
{
    // List payments, with optional filter by direction
    
    public function index(Request $request)
    {
        $query = ACCPayment::query();

        if ($request->has('direction')) {
            $query->where('direction', $request->direction);
        }

        $payments = $query;//->with('party')->orderBy('payment_date', 'desc')->get();

        // if ($request->wantsJson() || $request->ajax()) {
        //     return response()->json([
        //         'payments' => $payments
        //     ]);
        // }

        return inertia('Accounting/Payments/Index', [
            'auth' => [
                'user' => $request->user(),
            ],
            // optional: include initial list for SSR or SEO
            'payments' => $payments,
        ]);
    }

    // Store new payment (receive or make)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'payment_reference' => 'required|unique:acc_payments,payment_reference',
            'party_type' => 'required|string',
            'party_id' => 'required|integer',
            'direction' => 'required|in:in,out',
            'amount' => 'required|numeric|min:0.01',
            'method' => 'nullable|string',
            'currency' => 'required|string',
            'payment_date' => 'required|date',
            'description' => 'nullable|string',
        ]);

        $payment = ACCPayment::create($validated);

        return response()->json(['message' => 'Payment recorded', 'payment' => $payment], 201);
    }

    // Get summary report grouped by direction
    public function reportByDirection()
    {
        $report = ACCPayment::select('direction')
            ->selectRaw('SUM(amount) as total_amount')
            ->groupBy('direction')
            ->get();

        return response()->json(['report' => $report]);
    }

    // Get balances per party (received - made)
    public function balancesPerParty()
    {
        $payments = ACCPayment::select('party_id', 'party_type')
            ->selectRaw("SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as total_received")
            ->selectRaw("SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as total_made")
            ->groupBy('party_id', 'party_type')
            ->get();

        $balances = $payments->map(function ($p) {
            return [
                'party_id' => $p->party_id,
                'party_type' => $p->party_type,
                'total_received' => $p->total_received,
                'total_made' => $p->total_made,
                'balance' => $p->total_received - $p->total_made,
            ];
        });

        return response()->json(['balances' => $balances]);
    }
}

