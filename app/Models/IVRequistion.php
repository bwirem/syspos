<?php

namespace App\Models;

use App\Enums\StoreType;

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
  

    protected $fillable = ['transdate', 'delivery_no', 'sale_id', 'fromstore_id','tostore_id','tostore_type','stage','total', 'user_id'];

    protected $casts = [
        'tostore_type' => StoreType::class,
    ];


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
        return match ($this->tostore_type) {
            StoreType::Store => $this->belongsTo(SIV_Store::class, 'tostore_id'),
            StoreType::Customer => $this->belongsTo(BLSCustomer::class, 'tostore_id'),
            StoreType::Supplier => $this->belongsTo(SPR_Supplier::class, 'tostore_id'),
            default => null,
        };
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
    
    public function sale()
    {    
        return $this->belongsTo(BILSale::class, 'sale_id');
    }

    public function history()
    {
        return $this->hasMany(IVRequistionHistory::class, 'requistion_id', 'id')->orderBy('created_at');
    }
   
}
