<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ACCMakePaymentItem extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'acc_makepaymentitems';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'makepayment_id',
        'payable_id',
        'payable_type',
        'description',
        'amount',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',
    ];

    /**
     * Get the payment that this item belongs to.
     */
    public function makePayment(): BelongsTo
    {
        // Use the new class name for the relationship
        return $this->belongsTo(ACCMakePayment::class, 'makepayment_id');
    }

    /**
     * Get the parent payable model (e.g., Invoice, Account).
     */
    public function payable(): MorphTo
    {
        return $this->morphTo();
    }
}

