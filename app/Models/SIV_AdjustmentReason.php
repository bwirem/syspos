<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SIV_AdjustmentReason extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'siv_adjustmentreasons';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [      
        'name', 
        'action',     
    ];
}