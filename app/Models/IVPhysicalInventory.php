<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IVPhysicalInventory extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'iv_physicalinventory';
  

    protected $fillable = ['transdate', 'store_id','description','stage', 'user_id'];


    public function physicalinventoryitems()
    {        
        return $this->hasMany(IVPhysicalInventoryItem::class, 'physicalinventory_id', 'id');                  
    }

    
    public function store()
    {
        return $this->belongsTo(SIV_Store::class, 'store_id', 'id');
    }

      /**
     * Calculate the total price of the physicalinventory based on physicalinventory items.
     * The total is based on the price of each item at the time of the physicalinventory.
     *
     * @return float
     */
    public function calculateTotal()
    {
        return $this->physicalinventoryitems->sum(function ($physicalinventoryItem) {
            return $physicalinventoryItem->totalPrice(); // Using the totalPrice method from the PhysicalinventoryItem model
        });
    }

    /**
     * Automatically set the total attribute when saving the physicalinventory.
     * Ensures that the total is updated when an physicalinventory is created or modified.
     */
    // public static function booted()
    // {
    //     static::saving(function ($physicalinventory) {
    //         // Calculate total before saving the physicalinventory
    //         $physicalinventory->total = $physicalinventory->calculateTotal();
    //     });
    // }
    
    
   
}
