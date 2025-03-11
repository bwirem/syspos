<?php

namespace App\Models;

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
  

    protected $fillable = ['transdate', 'fromstore_id','tostore_id','stage','total', 'user_id'];


    public function items()
    {        
        return $this->hasMany(IVReceiveItem::class, 'receive_id', 'id')
                    ->with('item'); // Include the relationship to IV Products
    }
   
    public function fromstore()
    {
        return $this->belongsTo(IVStore::class, 'fromstore_id', 'id');
    }

    public function tostore()
    {
        return $this->belongsTo(IVStore::class, 'tostore_id', 'id');
    }
    
    
   
}
