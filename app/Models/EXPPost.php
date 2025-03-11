<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EXPPost extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'exp_expensepost';
  

    protected $fillable = ['transdate', 'description','facilityoption_id','total','stage', 'user_id'];

    public function postitems()
    {        
        return $this->hasMany(EXPPostItem::class, 'expensepost_id', 'id');                  
    }

    public function facilityoption()
    {
        return $this->belongsTo(FacilityOption::class, 'facilityoption_id', 'id');
    }

    public function remarks()
    {        
        return $this->hasMany(EXPFlowRemark::class, 'expensepost_id', 'id');
                   
    }

    public function payments()
    {        
        return $this->hasMany(EXP_Payment::class, 'expensepost_id', 'id');
                   
    }

    public function files()
    {        
        return $this->hasMany(EXP_PaymentFile::class, 'expensepost_id', 'id');
                   
    }

    /**
     * Calculate the total price of the post based on post items.
     * The total is based on the price of each item at the time of the post.
     *
     * @return float
     */
    public function calculateTotal()
    {
        return $this->postitems->sum(function ($postItem) {
            return $postItem->totalPrice(); // Using the totalPrice method from the PostItem model
        });
    }

    /**
     * Automatically set the total attribute when saving the post.
     * Ensures that the total is updated when an post is created or modified.
     */
    public static function booted()
    {
        static::saving(function ($post) {
            // Calculate total before saving the post
            $post->total = $post->calculateTotal();
        });
    }
    
   
}
