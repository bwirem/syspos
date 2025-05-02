<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Enums\SupplierType;

class SPR_Supplier extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'siv_suppliers';

    // Add attributes to $fillable array for mass assignment  

    protected $fillable = [
        'supplier_type',
        'first_name',
        'other_names',
        'surname',
        'company_name',
        'email',
        'phone',            
    ];
           
    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'supplier_type' => 'string',       
    ];

    // Accessor to get the human-readable label
    public function getSupplierTypeNameAttribute()
    {
        return SupplierType::from($this->supplier_type)->label();
    }
   
}