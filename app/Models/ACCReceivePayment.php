<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ACCReceivePayment extends Model
{
    use HasFactory;
    protected $table = 'acc_receivepayment';

    /**
     * The attributes that are mass assignable.
     * Replaces `$guarded` with the explicit `$fillable` array.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'transdate',
        'total_amount',
        'facilityoption_id',
        'description',
        'stage',
        'payer_id',
        'payer_type',
        'payment_method',
        'reference_number',
        'currency',
        'user_id',
    ];

    protected $casts = ['transdate' => 'date', 'total_amount' => 'decimal:2'];

    public function payer(): MorphTo { return $this->morphTo(); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function facilityoption(): BelongsTo { return $this->belongsTo(FacilityOption::class); }
    public function items(): HasMany { return $this->hasMany(ACCReceivePaymentItem::class, 'receivepayment_id'); }
    public function documents(): HasMany { return $this->hasMany(ACCReceivePaymentDocument::class, 'receivepayment_id'); }
}