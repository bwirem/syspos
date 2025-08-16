<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Loan extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'loans';


    protected $fillable = [       
        'customer_id',
        'user_id',
        'loan_type',
        'loan_amount',
        'loan_duration',
        'interest_rate',
        'interest_amount',
        'monthly_repayment',
        'total_repayment',
        'stage',
        'application_form',
        'status',
        'facilitybranch_id',
        'submit_remarks'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'loan_amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'interest_amount' => 'decimal:2',
        'monthly_repayment' => 'decimal:2',
        'total_repayment' => 'decimal:2',
    ];

    public function customer()
    {
        return $this->belongsTo(BLSCustomer::class, 'customer_id');
    }

    public function loanPackage()
    {
        return $this->belongsTo(BLSPackage::class, 'loan_type');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function loanGuarantors()
    {
        return $this->hasMany(LoanGuarantor::class, 'loan_id', 'id');
    }

    public function blsGuarantors()
    {
        return $this->belongsToMany(BLSGuarantor::class, 'loan_guarantors', 'loan_id', 'guarantor_id')
            ->withPivot('collateral_doc', 'collateral_docname', 'user_id')
            ->withTimestamps();
    }

    public function approvals()
    {
        return $this->hasMany(LoanApproval::class);
    }

    // In your Loan model
    public function payments()
    {
        return $this->hasMany(Repayment::class, 'loan_id', 'id');  // Check foreign key and local key
    }

}

