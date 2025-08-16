<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Enums\AccountType; // Make sure to import this


class ACCJournalEntryLine extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'acc_journal_entry_lines';


    protected $fillable = [
        'journal_entry_id', 'account_id', 'debit', 'credit',
    ];

    protected $casts = [
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
    ];

    
    public function journalEntry()
    {
        // RECOMMENDED: Also be explicit on the inverse side of the relationship.
        return $this->belongsTo(ACCJournalEntry::class, 'journal_entry_id');
    }


    public function chartOfAccount() // Or account()
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }
}