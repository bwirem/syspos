<?php


namespace App\Http\Controllers;

use App\Models\ChartOfAccount;
use App\Models\JournalEntryLine;
use Illuminate\Http\Request;

class ProfitAndLossController extends Controller
{
    public function index(Request $request)
    {
        // Optional: Accept date range
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $query = JournalEntryLine::with('chartOfAccount')
            ->whereHas('chartOfAccount', function ($q) {
                $q->whereIn('account_type', ['revenue', 'expense']);
            });

        if ($startDate && $endDate) {
            $query->whereHas('journalEntry', function ($q) use ($startDate, $endDate) {
                $q->whereBetween('entry_date', [$startDate, $endDate]);
            });
        }

        $lines = $query->get();

        $grouped = [
            'revenue' => [],
            'expense' => [],
        ];

        foreach ($lines as $line) {
            $account = $line->chartOfAccount;
            if (!$account) continue;

            $type = $account->account_type;
            $key = $account->id;

            if (!isset($grouped[$type][$key])) {
                $grouped[$type][$key] = [
                    'account_name' => $account->account_name,
                    'total' => 0,
                ];
            }

            $amount = $line->debit - $line->credit;
            $grouped[$type][$key]['total'] += $type === 'revenue' ? -$amount : $amount;
        }

        return inertia('Accounting/ProfitAndLoss/Index', [
            'revenues' => array_values($grouped['revenue']),
            'expenses' => array_values($grouped['expense']),
        ]);
    }
}
