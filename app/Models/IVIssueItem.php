<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IVIssueItem extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'iv_issueitems';

    protected $fillable = ['issue_id', 'product_id', 'quantity','price'];

    public function issue()
    {
        return $this->belongsTo(IVIssue::class, 'issue_id', 'id');
    }

    public function item()
    {
        return $this->belongsTo(SIV_Product::class, 'product_id', 'id');
    }

}