<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IVRequistionItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'iv_requistionitems';

    protected $fillable = ['requistion_id', 'product_id', 'quantity','price'];

    public function requistion()
    {
        return $this->belongsTo(IVRequistion::class, 'requistion_id', 'id');
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