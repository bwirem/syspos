<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BILDebtorLog extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'bil_debtorlogs';

    protected $fillable = ['transdate','reference','debtor_id', 'debitamount','creditamount',
                            'yearpart','monthpart','debtortype','transtype','transdescription'];

    public function debtor()
    {
        return $this->belongsTo(BILDebtor::class, 'debtor_id', 'id');
    }

    
}