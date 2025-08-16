<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Enums\AccountType; // Make sure to import this


class ACCJournalEntry extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'acc_journal_entries';



    protected $fillable = [
        'entry_date', 'reference_number', 'description',
    ];

    protected $casts = [
        'entry_date' => 'date',
    ];   

    public function journalEntryLines()
    {
        // THE FIX: Explicitly provide the correct foreign key name 'journal_entry_id'
        return $this->hasMany(ACCJournalEntryLine::class, 'journal_entry_id');
    }

}



