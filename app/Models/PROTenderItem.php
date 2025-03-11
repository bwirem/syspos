<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PROTenderItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'pro_tenderitems';

    protected $fillable = ['tender_id', 'product_id', 'quantity'];

    public function tender()
    {
        return $this->belongsTo(PROTender::class, 'tender_id', 'id');
    }

    public function item()
    {
        return $this->belongsTo(SIV_Product::class, 'product_id', 'id');
    }
   
}