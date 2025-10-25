<?php

namespace App\Models;

use App\Enums\StoreType;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IVIssue extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'iv_issue';
  

    protected $fillable = ['transdate', 'delivery_no', 'fromstore_id','tostore_id','tostore_type','stage','total', 'user_id'];

    protected $casts = [
        'tostore_type' => StoreType::class,        
    ];

    public function items()
    {        
        return $this->hasMany(IVIssueItem::class, 'issue_id', 'id')
                    ->with('item'); // Include the relationship to IV Products
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
    
    
   
}
