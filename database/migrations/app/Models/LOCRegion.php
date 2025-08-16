<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LOCRegion extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'loc_regions';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [      
        'name', // Add other fields here if needed       
    ];
}
