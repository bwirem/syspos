<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILVoidedSale extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_voidedsales';
  

    protected $fillable = ['transdate','receiptno','invoiceno','customer_id',
                           'totaldue','totalpaid','balancedue','paidforinvoice','status',
                           'voidsource','voided','voidsysdate','voidtransdate','voidno','voiduser_id',
                           'currency_id','yearpart','monthpart','transtype', 'user_id',
                           'paytype000001','paytype000002','paytype000003','paytype000004','reasons'];

    
    public function items()
    {        
        return $this->hasMany(BILVoidedSaleItem::class, 'voidedsale_id', 'id')
                    ->with('item'); // Include the relationship to IV Items
    }
   
    public function customer()
    {
        return $this->belongsTo(BLSCustomer::class, 'customer_id', 'id');
    }
    
    
   
}
