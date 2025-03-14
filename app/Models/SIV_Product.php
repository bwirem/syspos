<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SIV_Product extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'siv_products';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [           
        'category_id',
        'name', 
        'displayname',       
        'package_id',
        'prevcost',
        'costprice',
        'averagecost',
        'addtocart',                    
        'defaultqty',                          
        'hasexpiry',                        
        'expirynotice',                    
        'display',                              
        'reorderlevel', 
    ];

    /**
     * Define a one-to-one relationship with BLSItem.
     */
    public function blsItem(): HasOne
    {
        return $this->hasOne(BLSItem::class, 'product_id');
    }
}
