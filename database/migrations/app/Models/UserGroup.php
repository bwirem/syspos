<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class UserGroup extends Model
{
    use HasFactory;

    protected $table = 'usergroups';

    protected $fillable = ['name'];

    /**
     * Get the functions associated with the user group.
     */
    public function userGroupFunctions()
    {
        return $this->hasMany(UserGroupFunction::class, 'usergroup_id');
    }

    /**
     * Get the module items associated with the user group.
     */
    public function userGroupModuleItems()
    {
        return $this->hasMany(UserGroupModuleItem::class, 'usergroup_id');
    }
}
