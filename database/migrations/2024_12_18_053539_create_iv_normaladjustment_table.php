<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('iv_normaladjustment', function (Blueprint $table) {
            $table->id();
            $table->date('transdate');
            $table->timestamp('sysdate')->useCurrent();           
            $table->foreignId('store_id')->constrained('siv_stores')->onDelete('cascade'); 
            $table->foreignId('adjustmentreason_id')->constrained('siv_adjustmentreasons')->onDelete('cascade');       
            $table->integer('stage')->default(1); // Set the default value for 'stage'
            $table->index('stage'); // Add an index for 'stage'
            $table->integer('restore_stage')->default(1); // Restore stage'
            $table->decimal('total', 10, 2); // Total order amount
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iv_normaladjustment');
    }
};
