<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserGroupPrinter extends Model
{
    use HasFactory;

    // Explicitly define the table name to match your migration
    protected $table = 'usergroupprinters';

    // Allow mass assignment for all columns
    protected $guarded = [];

    // Cast booleans to native PHP types
    protected $casts = [
        'autoprint' => 'boolean',
        'printtoscreen' => 'boolean',
        'printedwhen' => 'integer',
    ];

    /**
     * Relationship to UserGroup
     */
    public function usergroup()
    {
        return $this->belongsTo(UserGroup::class, 'usergroup_id');
    }
}