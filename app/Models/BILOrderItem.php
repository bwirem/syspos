<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILOrderItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_orderitems';

    protected $fillable = ['order_id', 'item_id', 'quantity','price'];

    public function order()
    {
        return $this->belongsTo(BILOrder::class, 'order_id', 'id');
    }

    public function item()
    {
        return $this->belongsTo(BLSItem::class, 'item_id', 'id');
    }
   
    /**
     * Calculate the total price for this order item.
     * 
     * @return float
     */
    public function totalPrice()
    {
        return $this->quantity * $this->price;
    }

}