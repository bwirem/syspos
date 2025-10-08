<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacilityOption extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'facilityoptions';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [  
        'name',  
        'chart_of_account_id',
        'affectstockatcashier',
        'doubleentryissuing',
        'allownegativestock',
        'default_customer_id',
    ];


    // In app/Models/FacilityOption.php

    public function chartOfAccount()
    {
        return $this->belongsTo(ChartOfAccount::class);
    }
}