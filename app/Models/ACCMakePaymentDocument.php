<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ACCMakePaymentDocument extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'acc_makepaymentdocuments';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'makepayment_id',
        'url',
        'filename',
        'type',
        'size',
        'description',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'size' => 'integer',
    ];

    /**
     * Get the payment that this document belongs to.
     */
    public function makePayment(): BelongsTo
    {
        // Use the new class name for the relationship
        return $this->belongsTo(ACCMakePayment::class, 'makepayment_id');
    }
}