<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SEXPItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'sexp_items';

    // Add attributes to $fillable array for mass assignment
    protected $fillable = [
        'itemgroup_id',  
        'name',
    ];

     /**
     * Get the group that owns the expense item.
     */
    public function itemgroup(): BelongsTo
    {
        return $this->belongsTo(SEXPItemGroup::class, 'itemgroup_id');
    }
}