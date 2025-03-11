<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SPR_Supplier extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'siv_suppliers';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [      
        'name',                 
    ];
   
}