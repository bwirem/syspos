<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IVRequistion extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'iv_requistion';
  

    protected $fillable = ['transdate', 'fromstore_id','tostore_id','stage','total', 'user_id'];


    public function requistionitems()
    {        
        return $this->hasMany(IVRequistionItem::class, 'requistion_id', 'id');                  
    }

   
    public function fromstore()
    {
        return $this->belongsTo(SIV_Store::class, 'fromstore_id', 'id');
    }

    public function tostore()
    {
        return $this->belongsTo(SIV_Store::class, 'tostore_id', 'id');
    }

    /**
     * Calculate the total price of the requistion based on requistion items.
     * The total is based on the price of each item at the time of the requistion.
     *
     * @return float
     */
    public function calculateTotal()
    {
        return $this->requistionitems->sum(function ($requistionItem) {
            return $requistionItem->totalPrice(); // Using the totalPrice method from the RequistionItem model
        });
    }

    /**
     * Automatically set the total attribute when saving the requistion.
     * Ensures that the total is updated when an requistion is created or modified.
     */
    public static function booted()
    {
        static::saving(function ($requistion) {
            // Calculate total before saving the requistion
            $requistion->total = $requistion->calculateTotal();
        });
    }
    
    
   
}
