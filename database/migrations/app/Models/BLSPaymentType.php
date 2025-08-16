<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BLSPaymentType extends Model
{
    protected $table = 'bls_paymenttypes';  // Specify table name
    protected $fillable = ['name', 'chart_of_account_id']; // For mass assignment (if needed)    
}