<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BLSPriceCategory extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bls_pricecategories';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [  
        'useprice1',         
        'useprice2',          
        'useprice3',            
        'useprice4', 
        'price1',            
        'price2',          
        'price3',               
        'price4',   
    ];
}