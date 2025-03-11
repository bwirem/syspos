<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILSale extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_sales';
  

    protected $fillable = ['transdate','receiptno','invoiceno','customer_id',
                           'voided','voidsysdate','voidtransdate','voidno','voiduser_id',
                           'totaldue','discount','totalpaid','changeamount', 
                           'yearpart','monthpart','transtype', 'user_id'];


    public function items()
    {        
        return $this->hasMany(BILSaleItem::class, 'sale_id', 'id')
                    ->with('item'); // Include the relationship to IV Items
    }
   
    public function customer()
    {
        return $this->belongsTo(BLSCustomer::class, 'customer_id', 'id');
    }
    
    
   
}
