<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Enums\AccountType; // Make sure to import this


class ChartOfAccount extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'account_code', 'account_name', 'account_type', 'description', 'is_active', 'parent_account_id'
    ];

    protected $casts = [
        'account_type' => AccountType::class,
        'is_active' => 'boolean',
    ];


    public function parentAccount()
    {
        return $this->belongsTo(self::class, 'parent_account_id');
    }

    public function childAccounts()
    {
        return $this->hasMany(self::class, 'parent_account_id');
    }


    public function journalEntryLines()
    {
        return $this->hasMany(JournalEntryLine::class,  'account_id');
    }
}


