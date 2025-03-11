<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CNVMaterialFlowRemark extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'cnv_materialflowremarks';

    protected $fillable = ['material_id', 'stage', 'workflow_remarks'];

    public function material()
    {
        return $this->belongsTo(CNVMaterial::class, 'material_id', 'id');
    }   

}
