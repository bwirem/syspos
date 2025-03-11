<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BLSCustomer extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bls_customers';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [
        'name',         
    ];

   
    public function invoices()
    {
        return $this->hasMany(BILInvoice::class, 'customer_id', 'id');
    }
}