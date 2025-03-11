<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILInvoicePayment extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_invoicepayments';
  

    protected $fillable = ['transdate','receiptno','customer_id',
                           'voided','voidsysdate','voidtransdate','voidno','voiduser_id',
                           'totaldue','totalpaid','currency_id', 
                           'yearpart','monthpart','transtype', 'user_id'];

   
    public function customer()
    {
        return $this->belongsTo(BLSCustomer::class, 'customer_id', 'id');
    }
    
    
   
}
