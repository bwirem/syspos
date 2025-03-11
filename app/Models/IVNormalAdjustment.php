<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IVNormalAdjustment extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'iv_normaladjustment';
  

    protected $fillable = ['transdate', 'store_id','adjustmentreason_id','stage','restore_stage', 'user_id'];


    public function normaladjustmentitems()
    {        
        return $this->hasMany(IVNormalAdjustmentItem::class, 'normaladjustment_id', 'id');                  
    }

    
    public function store()
    {
        return $this->belongsTo(SIV_Store::class, 'store_id', 'id');
    }

    public function adjustmentreason()
    {
        return $this->belongsTo(SIV_AdjustmentReason::class, 'adjustmentreason_id', 'id');
    }

    /**
     * Calculate the total price of the normaladjustment based on normaladjustment items.
     * The total is based on the price of each item at the time of the normaladjustment.
     *
     * @return float
     */
    public function calculateTotal()
    {
        return $this->normaladjustmentitems->sum(function ($normaladjustmentItem) {
            return $normaladjustmentItem->totalPrice(); // Using the totalPrice method from the NormaladjustmentItem model
        });
    }

    /**
     * Automatically set the total attribute when saving the normaladjustment.
     * Ensures that the total is updated when an normaladjustment is created or modified.
     */
    public static function booted()
    {
        static::saving(function ($normaladjustment) {
            // Calculate total before saving the normaladjustment
            $normaladjustment->total = $normaladjustment->calculateTotal();
        });
    }
    
    
   
}
