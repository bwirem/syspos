<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BLSPackage extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bls_packages';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [        
        'name', 
        'interest_type',                   
        'interest_rate',                         
        'duration',
        'duration_unit',
    ];
  
}