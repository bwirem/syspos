<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoanGuarantor extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'loan_guarantors';

    protected $fillable = ['loan_id', 'guarantor_id', 'collateral_doc','collateral_docname','user_id'];

    public function loan()
    {
        return $this->belongsTo(Loan::class, 'loan_id', 'id');
    }

    public function guarantor()
    {
        return $this->belongsTo(BLSGuarantor::class, 'guarantor_id', 'id');
    }
   
}