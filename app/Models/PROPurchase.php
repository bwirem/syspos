<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PROPurchase extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'pro_purchase';  

   
    protected $fillable = [
        'transdate',
        'supplier_id',
        'facilityoption_id',
        'stage',
        'total',
        'url',       // Add URL to the fillable array
        'filename',  // Add filename to the fillable array
        'remarks',  // Add remarks to the fillable array
        'user_id',
    ];


    public function purchaseitems()
    {        
        return $this->hasMany(PROPurchaseItem::class, 'purchase_id', 'id');
                    
    }

   
    public function supplier()
    {
        return $this->belongsTo(SPR_Supplier::class, 'supplier_id', 'id');
    }

    public function facilityoption()
    {
        return $this->belongsTo(FacilityOption::class, 'facilityoption_id', 'id');
    }


    /**
     * Calculate the total price of the purchase based on purchase items.
     * The total is based on the price of each item at the time of the purchase.
     *
     * @return float
     */
    public function calculateTotal()
    {
        return $this->purchaseitems->sum(function ($purchaseItem) {
            return $purchaseItem->totalPrice(); // Using the totalPrice method from the PurchaseItem model
        });
    }

    /**
     * Automatically set the total attribute when saving the purchase.
     * Ensures that the total is updated when an purchase is created or modified.
     */
    public static function booted()
    {
        static::saving(function ($purchase) {
            // Calculate total before saving the purchase
            $purchase->total = $purchase->calculateTotal();
        });
    }
    
    
   
}
