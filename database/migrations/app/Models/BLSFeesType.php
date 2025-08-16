<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BLSFeesType extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bls_feestypes';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [      
        'name', 
        'amount', 
        'chart_of_account_id',
    ];

    
}