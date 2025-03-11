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
        Schema::create('exp_expensepostitems', function (Blueprint $table) {
            $table->id();
            // Define the foreign key columns with the correct data type (unsignedBigInteger)
            $table->unsignedBigInteger('expensepost_id');
            $table->unsignedBigInteger('item_id');  
        
            // Define the foreign key constraints
            $table->foreign('expensepost_id')->references('id')->on('exp_expensepost')->onDelete('cascade');
            $table->foreign('item_id')->references('id')->on('sexp_items')->onDelete('cascade');
        
            $table->string('remarks')->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exp_expensepostitems');
    }
};
