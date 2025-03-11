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
        Schema::create('iv_physicalstockbalances', function (Blueprint $table) {
            $table->id();
            $table->dateTime('transdate')->nullable(); // DATETIME (NULL)
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('product_id');
        
            // Define the foreign key constraints
            $table->foreign('product_id')->references('id')->on('siv_products')->onDelete('cascade');
            $table->foreign('store_id')->references('id')->on('siv_stores')->onDelete('cascade');
        
            $table->decimal('qty_1', 15, 2)->default(0);
            $table->decimal('qty_2', 15, 2)->default(0);
            $table->decimal('qty_3', 15, 2)->default(0);
            $table->decimal('qty_4', 15, 2)->default(0);
        
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iv_physicalstockbalances');
    }
};
