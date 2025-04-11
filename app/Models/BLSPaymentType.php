<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BLSPaymentType extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bls_paymenttypes';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [      
        'name', 
        'chart_of_account_id'
    ];
}