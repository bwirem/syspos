<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PROPurchaseItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'pro_purchaseitems';

    protected $fillable = ['purchase_id', 'product_id', 'quantity','price'];

    public function purchase()
    {
        return $this->belongsTo(PROPurchase::class, 'purchase_id', 'id');
    }

    public function item()
    {
        return $this->belongsTo(SIV_Product::class, 'product_id', 'id');
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