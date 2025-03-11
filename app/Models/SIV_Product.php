<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
        'price1',                      
        'price2',                            
        'price3',                              
        'price4', 
        'addtocart',                    
        'defaultqty',                          
        'hasexpiry',                        
        'expirynotice',                    
        'display',                              
        'reorderlevel', 
    ];
}