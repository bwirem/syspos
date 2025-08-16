<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EXPPostItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'exp_expensepostitems';

    protected $fillable = ['expensepost_id', 'item_id', 'remarks', 'amount'];

    public function expensePost()
    {
        return $this->belongsTo(EXPPost::class, 'expensepost_id', 'id');
    }

    public function item()
    {
        return $this->belongsTo(SEXPItem::class, 'item_id', 'id');
    }

         /**
     * Calculate the total price for this order item.
     * 
     * @return float
     */
    public function totalPrice()
    {
        return $this->amount;
    }

}
