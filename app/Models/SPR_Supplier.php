<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Enums\SupplierType;

class SPR_Supplier extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'siv_suppliers';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'supplier_type',
        'first_name',
        'other_names',
        'surname',
        'company_name',
        'email',
        'phone',            
    ];
           
    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'supplier_type' => 'string',       
    ];

    /**
     * The accessors to append to the model's array form.
     * THIS IS THE LINE YOU NEED TO ADD.
     *
     * @var array
     */
    protected $appends = ['display_name'];

    // Accessor to get the human-readable label
    public function getSupplierTypeNameAttribute()
    {
        return SupplierType::from($this->supplier_type)->label();
    }

    // In App\Models\SPR_Supplier.php
    public function purchaseorders()
    {
        return $this->hasMany(\App\Models\PROPurchase::class, 'supplier_id');
    }

    /**
     * Get the correct display name for the supplier.
     * (Your existing accessor is perfect)
     */
    public function getDisplayNameAttribute(): string
    {
        if ($this->supplier_type === 'company' && !empty($this->company_name)) {
            return $this->company_name;
        }

        return trim("{$this->first_name} {$this->other_names} {$this->surname}");
    }
   
}