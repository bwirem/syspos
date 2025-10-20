<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BILRefund extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_refunds';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'transdate',
        'refundno',
        'customer_id',
        'voidedsale_id',
        'refund_amount',
        'paymentmethod_id',
        'remarks',
        'yearpart',
        'monthpart',
        'transtype',
        'user_id',
    ];

    /**
     * Get the customer associated with the refund.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(BLSCustomer::class, 'customer_id');
    }

    /**
     * Get the voided sale that this refund is for.
     */
    public function voidedSale(): BelongsTo
    {
        return $this->belongsTo(BILVoidedSale::class, 'voidedsale_id');
    }

    /**
     * Get the user who processed the refund.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the payment method used for the refund.
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(BLSPaymentType::class, 'paymentmethod_id');
    }
}