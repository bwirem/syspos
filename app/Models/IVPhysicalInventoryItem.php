<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IVPhysicalInventoryItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'iv_physicalinventoryitems';

    protected $fillable = ['physicalinventory_id', 'product_id','butchno','countedqty','expectedqty','price'];

    public function physicalinventory()
    {
        return $this->belongsTo(IVPhysicalInventory::class, 'physicalinventory_id', 'id');
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
        return $this->expectedqty * $this->price;
    }

}