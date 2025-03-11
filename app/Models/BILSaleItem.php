<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILSaleItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_saleitems';

    protected $fillable = ['sale_id', 'item_id','store_id', 'quantity','price'];

    public function post()
    {
        return $this->belongsTo(BILSale::class, 'sale_id', 'id');
    }

    public function item()
    {
        return $this->belongsTo(BLSItem::class, 'item_id', 'id');
    }

}