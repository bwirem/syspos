<?php

namespace App\Models;

use App\Enums\StoreType;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IVReceive extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'iv_receive';
  

    protected $fillable = ['transdate','purchase_id','delivery_no','fromstore_id','fromstore_type','tostore_id','stage','total','remarks','user_id'];

    protected $casts = [
        'fromstore_type' => StoreType::class,
        'transdate' => 'datetime', // Good practice to cast date fields
    ];


    public function receiveitems()
    {        
        return $this->hasMany(IVReceiveItem::class, 'receive_id', 'id')
                    ->with('item'); // Include the relationship to IV Products
    }
   
    
    public function fromstore()
    {
        return match ($this->fromstore_type) {
            StoreType::Store => $this->belongsTo(SIV_Store::class, 'fromstore_id'),
            StoreType::Customer => $this->belongsTo(BLSCustomer::class, 'fromstore_id'),
            StoreType::Supplier => $this->belongsTo(SPR_Supplie::class, 'fromstore_id'),
            default => null,
        };
    }


    public function tostore()
    {
        return $this->belongsTo(SIV_Store::class, 'tostore_id', 'id');
    }
    
    
   
}
