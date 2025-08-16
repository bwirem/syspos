<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacilityBranch extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'facilitybranches';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [  
        'facilityoption_id',  
        'name',  
    ];
}