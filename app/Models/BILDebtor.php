<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILDebtor extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_debtors';
  

    protected $fillable = ['transdate','customer_id','debtortype','balance','user_id'];
    
    public function items()
    {        
        return $this->hasMany(BILDebtorLogs::class, 'debtor_id', 'id');                   
    }
    
    public function invoices()
    {
        // Linking invoices through the customer_id (common scenario)
        return $this->hasMany(BILInvoice::class, 'customer_id', 'customer_id');
    }
                           
    public function customer()
    {
        return $this->belongsTo(BLSCustomer::class, 'customer_id', 'id');
    }
    
    
   
}
