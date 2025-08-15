<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ACCReceivePaymentDocument extends Model
{
    use HasFactory;
    protected $table = 'acc_receivepaymentdocuments';
    
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'receivepayment_id',
        'url',
        'filename',
        'type',
        'size',
        'description',
    ];

    public function receivePayment(): BelongsTo { return $this->belongsTo(ACCReceivePayment::class, 'receivepayment_id'); }
}