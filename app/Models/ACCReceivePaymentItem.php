<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ACCReceivePaymentItem extends Model
{
    use HasFactory;
    protected $table = 'acc_receivepaymentitems';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'receivepayment_id',
        'receivable_id',
        'receivable_type',
        'description',
        'amount',
    ];

    protected $casts = ['amount' => 'decimal:2'];

    public function receivePayment(): BelongsTo { return $this->belongsTo(ACCReceivePayment::class, 'receivepayment_id'); }
    public function receivable(): MorphTo { return $this->morphTo(); }
}