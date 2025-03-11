<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IVNormalAdjustmentItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'iv_normaladjustmentitems';

    protected $fillable = ['normaladjustment_id', 'product_id', 'quantity','price'];

    public function normaladjustment()
    {
        return $this->belongsTo(IVNormalAdjustment::class, 'normaladjustment_id', 'id');
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