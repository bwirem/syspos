<?php

namespace App\Models;

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
  

    protected $fillable = ['transdate', 'fromstore_id','tostore_id','stage','total', 'user_id'];


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
        return $this->belongsTo(SIV_Store::class, 'tostore_id', 'id');
    }
    
    
   
}
