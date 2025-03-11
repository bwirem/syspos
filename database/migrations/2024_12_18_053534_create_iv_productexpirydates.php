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
        Schema::create('iv_productexpirydates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('product_id');
        
            // Define the foreign key constraints
            $table->foreign('product_id')->references('id')->on('siv_products')->onDelete('cascade');
            $table->foreign('store_id')->references('id')->on('siv_stores')->onDelete('cascade');
        
            $table->date('expirydate'); // Changed to date type
            $table->decimal('quantity', 15, 2)->default(0);
            $table->string('butchno')->nullable(); // Corrected typo and removed length constraint, made nullable
            $table->string('butchbarcode')->nullable(); // Corrected typo and removed length constraint, made nullable
        
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iv_productexpirydates');
    }
};
