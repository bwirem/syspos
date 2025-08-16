<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'facilitybranch_id',
        'usergroup_id',        
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function loanApprovals()
    {
        return $this->hasMany(LoanApproval::class, 'approved_by');
    }

    /**
     * The facility branches that belong to the user.
     */
   
     public function facilityBranches(): BelongsToMany  
     {
        return $this->belongsToMany(FacilityBranch::class, 'facilitybranch_user', 'user_id', 'facilitybranch_id');
     }


    // User.php
    public function userGroup()
    {
        return $this->belongsTo(UserGroup::class, 'usergroup_id'); // Ensure this is correct
    }

}
