<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ACCMakePayment extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'acc_makepayment';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'transdate',
        'total_amount',
        'facilityoption_id',
        'description',
        'stage',
        'recipient_id',
        'recipient_type',
        'payment_method',
        'reference_number',
        'currency',
        'user_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'transdate' => 'date',
        'sysdate' => 'datetime',
        'total_amount' => 'decimal:2',
        'stage' => 'integer',
    ];

    /**
     * Get the parent recipient model (e.g., Supplier, Employee).
     */
    public function recipient(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the user who recorded the payment.
     */
    public function user(): BelongsTo
    {
        // Assumes you have a User model
        return $this->belongsTo(User::class);
    }

    /**
     * Get the facility associated with the payment.
     */
    public function facilityoption(): BelongsTo
    {
        // Assumes you have a FacilityOption model
        return $this->belongsTo(FacilityOption::class);
    }

    /**
     * Get all of the line items for the payment.
     */
    public function items(): HasMany
    {
        // Use the new class name for the relationship
        return $this->hasMany(ACCMakePaymentItem::class, 'makepayment_id');
    }

    /**
     * Get all of the documents for the payment.
     */
    public function documents(): HasMany
    {
        // Use the new class name for the relationship
        return $this->hasMany(ACCMakePaymentDocument::class, 'makepayment_id');
    }
}