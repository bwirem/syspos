<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Enums\CustomerType;

class BLSCustomer extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bls_customers';

    protected $fillable = [
        'customer_type',
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
        'customer_type' => 'string',       
    ];

    /**
     * The accessors to append to the model's array form.
     * THIS IS THE CRITICAL LINE TO ADD.
     *
     * @var array
     */
    protected $appends = ['display_name'];


    // Accessor to get the human-readable label
    public function getCustomerTypeNameAttribute()
    {
        return CustomerType::from($this->customer_type)->label();
    }
   
    public function invoices()
    {
        return $this->hasMany(BILInvoice::class, 'customer_id', 'id');
    }


    /**
     * Get the correct display name for the customer.
     * THIS IS THE ACCESSOR METHOD TO ADD.
     *
     * @return string
     */
    public function getDisplayNameAttribute(): string
    {
        if ($this->customer_type === 'company' && !empty($this->company_name)) {
            return $this->company_name;
        }

        return trim("{$this->first_name} {$this->other_names} {$this->surname}");
    }
}