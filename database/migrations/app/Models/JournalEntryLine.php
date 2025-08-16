<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Enums\AccountType; // Make sure to import this


class JournalEntryLine extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'journal_entry_id', 'account_id', 'debit', 'credit',
    ];

    protected $casts = [
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
    ];


    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }


    public function chartOfAccount() // Or account()
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }
}