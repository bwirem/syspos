<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EXP_Payment extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'exp_expensepayments';

    protected $fillable = ['expensepost_id', 'paymentmethod', 'amount'];

    public function expensePost()
    {
        return $this->belongsTo(EXPPost::class, 'expensepost_id', 'id');
    }   

}
