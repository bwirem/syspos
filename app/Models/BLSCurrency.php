<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BLSCurrency extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bls_currencies';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [      
        'name', 
        'exchangerate', 
        'currencysymbol',    
    ];
}