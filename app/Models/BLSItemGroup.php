<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BLSItemGroup extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bls_itemgroups';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [      
        'name', 
    ];

    public function items()
    {        
        return $this->hasMany(BLSItem::class, 'itemgroup_id', 'id');                 
    }
}