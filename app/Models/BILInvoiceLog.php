<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILInvoiceLog extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_invoiceslog';
  

    protected $fillable = ['transdate','reference','invoiceno','customer_id',
                           'debitamount','creditamount',
                           'yearpart','monthpart','transtype','transdescription', 'user_id'];
   
    public function customer()
    {
        return $this->belongsTo(BLSCustomer::class, 'customer_id', 'id');
    }
    
    
   
}
