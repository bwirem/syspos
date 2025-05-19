<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BILPhysicalStockBalance extends Model
{
    protected $table = 'iv_physicalstockbalances'; // Example table name
    public $timestamps = true; // Or false if you manually manage

    protected $fillable = [
        'transdate',
        'store_id',
        'product_id',
        'quantity',
    ];

    protected $casts = [
        'transdate' => 'date',
    ];
}