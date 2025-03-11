<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILReceiptItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_receiptitems';

    protected $fillable = ['receipt_id', 'item_id','store_id', 'quantity','price'];

    public function receipt()
    {
        return $this->belongsTo(BILReceipt::class, 'receipt_id', 'id');
    }

    public function item()
    {
        return $this->belongsTo(BLSItem::class, 'item_id', 'id');
    }

}