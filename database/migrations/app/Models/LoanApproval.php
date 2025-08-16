<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoanApproval extends Model
{
    use HasFactory;

    protected $fillable = [
        'loan_id',
        'approved_by',
        'stage',
        'remarks',
        'status',
    ];

    /**
     * Get the loan associated with this approval.
     */
    public function loan()
    {
        return $this->belongsTo(Loan::class);
    }

    /**
     * Get the user who approved the loan.
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
    
}
