<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacilityOption extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'facilityoptions';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [  
        'name',  
        'rounding_factor'
    ];
}