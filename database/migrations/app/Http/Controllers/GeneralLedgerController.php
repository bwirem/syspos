<?php
namespace App\Http\Controllers;

use App\Models\JournalEntry;
use Illuminate\Http\Request;

class GeneralLedgerController extends Controller
{
    public function index()
    {
        $entries = JournalEntry::with(['journalEntryLines.chartOfAccount'])
            ->orderBy('entry_date', 'desc')
            ->get();

        return inertia('Accounting/GeneralLedger/Index', [
            'entries' => $entries,
        ]);
    }
}
