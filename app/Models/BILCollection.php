<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILCollection extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_collections';
  

    protected $fillable = ['transdate','receiptno','customer_id','paymentsource',
                           'refunded','refundsysdate','refundtransdate','refunduser_id',
                           'paytype000001','paytype000002','paytype000003','paytype000004', 
                           'yearpart','monthpart','transtype', 'user_id'];

    public function customer()
    {
        return $this->belongsTo(BLSCustomer::class, 'customer_id', 'id');
    }
    
    
   
}
