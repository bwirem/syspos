<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Enums\TransactionType;


class Transaction extends Model
{
    use HasFactory, SoftDeletes;


    protected $fillable = [
        'customer_id', 'user_id', 'loan_id', 'savings_id', 'amount', 'type', 'payment_type_id', 
        'transaction_reference', 'description', 'expensepost_id'
    ];


    protected $casts = [
        'amount' => 'decimal:2',
        'type' => TransactionType::class, // Cast to your enum
    ];

    public function customer()
    {
        return $this->belongsTo(BLSCustomer::class);
    }


    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function loan()
    {
        return $this->belongsTo(Loan::class);
    }

    public function savingsAccount() // Use singular for belongsTo
    {
        return $this->belongsTo(Saving::class, 'savings_id'); // Specify foreign key if needed
    }

    public function expensePost()  // Follow Laravel naming conventions
    {
        return $this->belongsTo(EXPPost::class);  // Assuming you have an ExpensePost model
    }

    public function paymentType()
    {
        return $this->belongsTo(PaymentType::class, 'payment_type_id');  // Relationship to payment type
    }

}
