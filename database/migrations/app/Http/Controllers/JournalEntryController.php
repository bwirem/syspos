<?php

namespace App\Http\Controllers;

use App\Models\JournalEntry;
use Illuminate\Http\Request;

class JournalEntryController extends Controller
{
    /**
     * Display a listing of the journal entries.
     */
    public function index()
    {
        $journalEntries = JournalEntry::with(['journalEntryLines.chartOfAccount'])
            ->orderBy('entry_date', 'desc')
            ->get();

        return inertia('Accounting/JournalEntries/Index', [
            'journalEntries' => $journalEntries,
        ]);
    }
}

