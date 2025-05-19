<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BILProductCostLog extends Model
{
    protected $table = 'iv_productcostslog'; // Example table name
    public $timestamps = false; // C# 'sysdate' implies manual timestamping or DB default

    protected $fillable = [
        'sysdate', // Or just use created_at if timestamps = true
        'transdate',
        'product_id',
        'costprice',
    ];

    protected $casts = [
        'sysdate' => 'datetime',
        'transdate' => 'date',
    ];

    // If you want to automatically set sysdate
    // protected static function boot()
    // {
    //     parent::boot();
    //     static::creating(function ($model) {
    //         if (empty($model->sysdate)) {
    //             $model->sysdate = now();
    //         }
    //     });
    // }
}