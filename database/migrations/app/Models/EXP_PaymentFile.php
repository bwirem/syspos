<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EXP_PaymentFile extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'exp_expensepaymentfiles';

    protected $fillable = ['expensepost_id','url', 'name', 'type','size', 'description',];

    public function expensePost()
    {
        return $this->belongsTo(EXPPost::class, 'expensepost_id', 'id');
    }   

}
