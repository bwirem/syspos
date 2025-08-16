<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;


class ChartOfAccountMapping extends Model
{
    use HasFactory, SoftDeletes; 

    protected $fillable = [
        'customer_loan_code', 'customer_loan_interest_code', 'customer_deposit_code'
    ];    
    
}


