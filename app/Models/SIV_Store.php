<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SIV_Store extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'siv_stores';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [  
        'name',  
        'description',                 
    ];
}