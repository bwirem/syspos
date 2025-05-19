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
        Schema::create('iv_productcostslog', function (Blueprint $table) {
            $table->id();
        
            $table->unsignedBigInteger('product_id');
        
            // If you're storing timestamps, use `timestamp()` instead
            $table->timestamp('sysdate')->nullable();     // Optional if not always set
            $table->timestamp('transdate')->nullable();   // Optional if not always set
        
            $table->decimal('costprice', 15, 2)->default(0);
        
            // Foreign key constraint
            $table->foreign('product_id')
                ->references('id')
                ->on('siv_products')
                ->onDelete('cascade');
        
            $table->timestamps(); // created_at and updated_at
        });
        
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iv_productcostslog');
    }
};
