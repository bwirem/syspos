<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILInvoiceItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_invoiceitems';

    protected $fillable = ['invoice_id', 'item_id','store_id', 'quantity','price'];

    public function invoice()
    {
        return $this->belongsTo(BILInvoice::class, 'invoice_id', 'id');
    }

    public function item()
    {
        return $this->belongsTo(BLSItem::class, 'item_id', 'id');
    }

}