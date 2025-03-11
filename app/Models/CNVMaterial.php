<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CNVMaterial extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'cnv_material';
  

    protected $fillable = ['transdate', 'fromstore_id','tostore_id','stage','restore_stage', 'user_id'];


    public function items()
    {        
        return $this->hasMany(CNVMaterialItem::class, 'material_id', 'id')
                    ->with('item'); // Include the relationship to IV Products
    }

    public function remarks()
    {        
        return $this->hasMany(CNVMaterialFlowRemark::class, 'material_id', 'id');                 
    }


    public function fromstore()
    {
        return $this->belongsTo(SIV_Store::class, 'fromstore_id', 'id');
    }

    public function tostore()
    {
        return $this->belongsTo(SIV_Store::class, 'tostore_id', 'id');
    }
    
    
   
}
