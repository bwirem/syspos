<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // Import BelongsTo

class SIV_Product extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'siv_products';

    // ... $fillable array remains the same ...
    protected $fillable = [           
        'category_id', 'name', 'displayname', 'package_id', 'prevcost',
        'costprice', 'averagecost', 'addtocart', 'defaultqty',                          
        'hasexpiry', 'expirynotice', 'display', 'reorderlevel', 
    ];

    /**
     * Get the category that owns the product.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(SIV_ProductCategory::class, 'category_id');
    }

    /**
     * Get the unit of measure (packaging) for the product.
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(SIV_Packaging::class, 'package_id');
    }

    /**
     * Define a one-to-one relationship with BLSItem.
     */
    public function blsItem(): HasOne
    {
        return $this->hasOne(BLSItem::class, 'product_id');
    }
}