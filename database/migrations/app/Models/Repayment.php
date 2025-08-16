<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // If using soft deletes


class Repayment extends Model
{
    use HasFactory, SoftDeletes; // Include SoftDeletes if applicable

    protected $fillable = [
        'loan_id', 'user_id', 'transaction_id', 'amount_paid','interest_paid', 'payment_date', 'balance_before', 'balance_after'
    ];

    protected $casts = [
        'payment_date' => 'date',  // Important for date handling
        'amount_paid' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
    ];


    public function loan()
    {
        return $this->belongsTo(Loan::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

}