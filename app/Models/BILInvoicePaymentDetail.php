<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILInvoicePaymentDetail extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_invoicepaymentdetails';

    protected $fillable = ['receiptno', 'invoiceno','totaldue', 'totalpaid'];   

    // Add this relationship to access the Invoice and its Items
    public function invoice()
    {
        // Link the Payment Detail to the Invoice using the string 'invoiceno'
        return $this->belongsTo(BILInvoice::class, 'invoiceno', 'invoiceno');
    }
  

}