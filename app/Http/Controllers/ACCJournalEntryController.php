<?php

namespace App\Http\Controllers;

use App\Models\ACCJournalEntry;
use App\Models\ChartOfAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Exception;

class ACCJournalEntryController extends Controller
{
    public function index(Request $request)
    {
        $query = ACCJournalEntry::withSum('journalEntryLines as total_debit', 'debit')
            ->withSum('journalEntryLines as total_credit', 'credit');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('description', 'like', "%{$search}%")->orWhere('reference_number', 'like', "%{$search}%");
        }

        $journalEntries = $query->latest()->paginate(15)->withQueryString();

        return Inertia::render('ACCJournalEntry/Index', [
            'journalEntries' => $journalEntries,
            'filters' => $request->only(['search']),
            'success' => session('success'),
        ]);
    }

    public function create()
    {
        return Inertia::render('ACCJournalEntry/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'entry_date' => 'required|date',
            'reference_number' => 'nullable|string|max:255',
            'description' => 'required|string|max:255',
            'lines' => 'required|array|min:2',
            'lines.*.account_id' => 'required|exists:chart_of_accounts,id',
            'lines.*.debit' => 'required|numeric|min:0',
            'lines.*.credit' => 'required|numeric|min:0',
        ]);

        $debits = collect($validated['lines'])->sum('debit');
        $credits = collect($validated['lines'])->sum('credit');

        if (round($debits, 2) !== round($credits, 2) || $debits === 0) {
            throw ValidationException::withMessages(['lines' => 'The total debits must equal the total credits and not be zero.']);
        }

        DB::transaction(function () use ($validated) {
            $journalEntry = ACCJournalEntry::create([
                'entry_date' => $validated['entry_date'],
                'reference_number' => $validated['reference_number'],
                'description' => $validated['description'],
            ]);

            foreach ($validated['lines'] as $line) {
                if ($line['debit'] > 0 || $line['credit'] > 0) {
                    $journalEntry->journalEntryLines()->create($line);
                }
            }
        });

        return redirect()->route('accounting2.index')->with('success', 'Journal Entry created successfully.');
    }

    public function edit(ACCJournalEntry $journalEntry)
    {
        $journalEntry->load('journalEntryLines.chartOfAccount');
        return Inertia::render('ACCJournalEntry/Edit', [
            'journalEntry' => $journalEntry,
        ]);
    }

    public function update(Request $request, ACCJournalEntry $journalEntry)
    {
        $validated = $request->validate([
            'entry_date' => 'required|date',
            'description' => 'required|string|max:255',
            'lines' => 'required|array|min:2',
            // ... same line validation as store
        ]);
        
        $debits = collect($validated['lines'])->sum('debit');
        $credits = collect($validated['lines'])->sum('credit');

        if (round($debits, 2) !== round($credits, 2) || $debits === 0) {
            throw ValidationException::withMessages(['lines' => 'The total debits must equal the total credits and not be zero.']);
        }

        DB::transaction(function () use ($validated, $journalEntry) {
            $journalEntry->update([
                'entry_date' => $validated['entry_date'],
                'reference_number' => $validated['reference_number'],
                'description' => $validated['description'],
            ]);

            // Simple sync: delete old lines and create new ones
            $journalEntry->journalEntryLines()->delete();
            foreach ($validated['lines'] as $line) {
                if ($line['debit'] > 0 || $line['credit'] > 0) {
                    $journalEntry->journalEntryLines()->create($line);
                }
            }
        });

        return redirect()->route('accounting2.index')->with('success', 'Journal Entry updated successfully.');
    }

    public function destroy(ACCJournalEntry $journalEntry)
    {
        // onDelete('cascade') in the migration will handle deleting the lines.
        $journalEntry->delete();
        return redirect()->route('accounting2.index')->with('success', 'Journal Entry deleted successfully.');
    }

    public function searchAccounts(Request $request)
    {
        $query = $request->input('query', '');
        $accounts = ChartOfAccount::where(fn($q) => $q->where('account_name', 'LIKE', "%{$query}%")->orWhere('account_code', 'LIKE', "%{$query}%"))->where('is_active', true)->limit(10)->get(['id', 'account_name', 'account_code']);
        return response()->json(['data' => $accounts]);
    }
}