<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SEXPItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'sexp_items';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [
        'itemgroup_id',  
        'name',
    ];
}