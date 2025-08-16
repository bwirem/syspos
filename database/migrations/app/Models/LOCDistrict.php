<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LOCDistrict extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'loc_districts';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [       
        'name', // Add other fields here if needed
        'region_id',
    ];
}
