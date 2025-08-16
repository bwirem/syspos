<?php

namespace App\Http\Controllers;

use App\Models\ACCJournalEntry;
use App\Models\ChartOfAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Exception;

class ACCJournalEntryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = ACCJournalEntry::withSum('journalEntryLines as total_debit', 'debit')
            ->withSum('journalEntryLines as total_credit', 'credit');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('description', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%");
        }

        // // THE FIX: Explicitly define the table for the 'created_at' column to avoid SQL ambiguity.
        $journalEntries  = $query->latest('acc_journal_entries.created_at')->paginate(15)->withQueryString();

        return Inertia::render('ACCJournalEntry/Index', [
            'journalEntries' => $journalEntries,
            'filters' => $request->only(['search']),
            'success' => session('success'),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('ACCJournalEntry/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
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

        // Ensure the transaction is balanced and not empty.
        if (round($debits, 2) !== round($credits, 2) || $debits == 0) {
            throw ValidationException::withMessages(['lines' => 'The total debits must equal the total credits and not be zero.']);
        }

        DB::transaction(function () use ($validated) {
            $journalEntry = ACCJournalEntry::create([
                'entry_date' => $validated['entry_date'],
                'reference_number' => $validated['reference_number'],
                'description' => $validated['description'],
            ]);

            // Create a line for each entry that has a value.
            foreach ($validated['lines'] as $line) {
                if ($line['debit'] > 0 || $line['credit'] > 0) {
                    $journalEntry->journalEntryLines()->create($line);
                }
            }
        });

        return redirect()->route('accounting2.index')->with('success', 'Journal Entry created successfully.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(ACCJournalEntry $journalEntry)
    {
        // Eager load the lines and the account name for each line.
        $journalEntry->load('journalEntryLines.chartOfAccount');
        return Inertia::render('ACCJournalEntry/Edit', [
            'journalEntry' => $journalEntry,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ACCJournalEntry $journalEntry)
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

        if (round($debits, 2) !== round($credits, 2) || $debits == 0) {
            throw ValidationException::withMessages(['lines' => 'The total debits must equal the total credits and not be zero.']);
        }

        DB::transaction(function () use ($validated, $journalEntry) {
            $journalEntry->update([
                'entry_date' => $validated['entry_date'],
                'reference_number' => $validated['reference_number'],
                'description' => $validated['description'],
            ]);

            // Simple synchronization strategy: delete old lines and create the new ones.
            $journalEntry->journalEntryLines()->forceDelete(); // Use forceDelete since the model uses SoftDeletes
            foreach ($validated['lines'] as $line) {
                if ($line['debit'] > 0 || $line['credit'] > 0) {
                    $journalEntry->journalEntryLines()->create($line);
                }
            }
        });

        return redirect()->route('accounting2.index')->with('success', 'Journal Entry updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ACCJournalEntry $journalEntry)
    {
        // The `onDelete('cascade')` in the migration ensures all lines are deleted too.
        $journalEntry->delete();
        return redirect()->route('accounting2.index')->with('success', 'Journal Entry deleted successfully.');
    }

    /**
     * Search for accounts for the form dropdown.
     */
    public function searchAccounts(Request $request)
    {
        $query = $request->input('query', '');
        $accounts = ChartOfAccount::where(fn($q) => $q->where('account_name', 'LIKE', "%{$query}%")->orWhere('account_code', 'LIKE', "%{$query}%"))
            ->where('is_active', true)
            ->limit(10)
            ->get(['id', 'account_name', 'account_code']);
            
        return response()->json(['data' => $accounts]);
    }
}