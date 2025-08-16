<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserGroupModuleItem extends Model
{
    use HasFactory;

    protected $table = 'usergroupmoduleitems';

    protected $fillable = [
        'usergroup_id',
        'moduleitemkey',
    ];

    /**
     * Get the user group that owns the module item.
     */
    public function userGroup()
    {
        return $this->belongsTo(UserGroup::class, 'usergroup_id');
    }

    /**
     * Get the functions associated with this module item.
     */
    public function userGroupFunctions()
    {
        return $this->hasMany(UserGroupFunction::class, 'usergroupmoduleitem_id');
    }
}
