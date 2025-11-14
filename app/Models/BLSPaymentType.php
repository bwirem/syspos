<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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


    /**
     * Get the chart of account that is linked to this payment type.
     */
    public function chartOfAccount(): BelongsTo
    {
        // Eloquent will automatically use 'chart_of_account_id' as the foreign key.
        return $this->belongsTo(ChartOfAccount::class, 'chart_of_account_id');
    }
}