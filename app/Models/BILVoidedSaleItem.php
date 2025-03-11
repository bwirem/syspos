<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILVoidedSaleItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_voidedsalesitems';

    protected $fillable = ['voidedsale_id', 'item_id','quantity','price'];

    public function receipt()
    {
        return $this->belongsTo(BILVoidedSale::class, 'voidedsale_id', 'id');
    }

    public function item()
    {
        return $this->belongsTo(BLSItem::class, 'item_id', 'id');
    }  
  

}