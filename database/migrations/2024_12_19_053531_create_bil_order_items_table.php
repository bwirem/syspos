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
        Schema::create('bil_orderitems', function (Blueprint $table) {
            $table->id();
            // Define the foreign key columns with the correct data type (unsignedBigInteger)
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('item_id');  
        
            // Define the foreign key constraints
            $table->foreign('order_id')->references('id')->on('bil_orders')->onDelete('cascade');
            $table->foreign('item_id')->references('id')->on('bls_items')->onDelete('cascade');        
           
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
        Schema::dropIfExists('bil_orderitems');
    }
};
