<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILProductExpiryDates extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'iv_productexpirydates';
  

    protected $fillable = ['store_id','product_id','expirydate','quantity','butchno','butchbarcode'];

    public function store()
    {
        return $this->belongsTo(SIV_Store::class, 'store_id', 'id');
    }

    public function product()
    {
        return $this->belongsTo(SIV_Product::class, 'product_id', 'id');
    }
    
    
   
}
