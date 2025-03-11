<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserGroup extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'usergroups';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [      
        'name',
    ];
}