<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ACCPayment extends Model
{
 /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'acc_payments';

    protected $fillable = [
        'payment_reference', 'party_type', 'party_id', 'direction',
        'amount', 'method', 'currency', 'payment_date', 'description',
    ];

    // Optional: Polymorphic relation for party if needed
    public function party()
    {
        return $this->morphTo();
    }
}
