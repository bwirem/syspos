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
        Schema::create('iv_receiveitems', function (Blueprint $table) {
            $table->id();
            // Define the foreign key columns with the correct data type (unsignedBigInteger)
            $table->unsignedBigInteger('receive_id');
            $table->unsignedBigInteger('product_id');  
        
            // Define the foreign key constraints
            $table->foreign('receive_id')->references('id')->on('iv_receive')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('siv_products')->onDelete('cascade');        
           
            $table->decimal('quantity', 15, 2)->default(0);
            $table->decimal('price', 15, 2)->default(0);
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iv_receiveitems');
    }
};
