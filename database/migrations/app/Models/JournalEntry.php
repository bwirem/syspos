<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Enums\AccountType; // Make sure to import this


class JournalEntry extends Model
{
    use HasFactory, SoftDeletes;


    protected $fillable = [
        'entry_date', 'reference_number', 'description', 'transaction_id',
    ];

    protected $casts = [
        'entry_date' => 'date',
    ];


    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function journalEntryLines()
    {
        return $this->hasMany(JournalEntryLine::class);
    }

}



