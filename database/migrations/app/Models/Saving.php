<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Enums\SavingsStatus;


class Saving extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'customer_id', 'user_id', 'balance', 'interest_rate', 'accrued_interest', 'status'
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'accrued_interest' => 'decimal:2',
        'status' => SavingsStatus::class, // Assuming you have the SavingsStatus enum
    ];

    public function customer()
    {
        return $this->belongsTo(BLSCustomer::class); // Replace Customer with your customer model
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class, 'savings_id'); // savings_id in the transactions table
    }
}
