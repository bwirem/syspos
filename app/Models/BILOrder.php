<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILOrder extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_orders';
  

    protected $fillable = ['transdate', 'store_id','customer_id','stage','total', 'user_id'];
    
    public function store()
    {
        return $this->belongsTo(SIV_Store::class, 'store_id', 'id');
    }

    public function customer()
    {
        return $this->belongsTo(BLSCustomer::class, 'customer_id', 'id');
    }

    /**
     * Relationship: An order has many order items.
     */
    public function orderitems()
    {
        return $this->hasMany(BILOrderItem::class, 'order_id', 'id');
    }

     /**
     * Calculate the total price of the order based on order items.
     * The total is based on the price of each item at the time of the order.
     *
     * @return float
     */
    public function calculateTotal()
    {
        return $this->orderitems->sum(function ($orderItem) {
            return $orderItem->totalPrice(); // Using the totalPrice method from the OrderItem model
        });
    }

    /**
     * Automatically set the total attribute when saving the order.
     * Ensures that the total is updated when an order is created or modified.
     */
    public static function booted()
    {
        static::saving(function ($order) {
            // Calculate total before saving the order
            $order->total = $order->calculateTotal();
        });
    }
    
    
   
}
