<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserGroupFunction extends Model
{
    use HasFactory;

    protected $table = 'usergroupfunctions';

    protected $fillable = [
        'usergroup_id',
        'functionaccesskey',
        'usergroupmoduleitem_id',
    ];

    /**
     * Get the user group that owns the function access.
     */
    public function userGroup()
    {
        return $this->belongsTo(UserGroup::class, 'usergroup_id');
    }

    /**
     * Get the module item that this function belongs to.
     */
    public function userGroupModuleItem()
    {
        return $this->belongsTo(UserGroupModuleItem::class, 'usergroupmoduleitem_id');
    }
}
