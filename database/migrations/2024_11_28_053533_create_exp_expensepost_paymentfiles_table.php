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
        Schema::create('exp_expensepaymentfiles', function (Blueprint $table) {
            $table->id();
            // Define the foreign key columns with the correct data type (unsignedBigInteger)
            $table->unsignedBigInteger('expensepost_id'); 
            // Define the foreign key constraints
            $table->foreign('expensepost_id')->references('id')->on('exp_expensepost')->onDelete('cascade');
                   
            $table->string('url');
            $table->string('name');
            $table->string('type', 50);
            $table->integer('size');
            $table->string('description');
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exp_expensepaymentfiles');
    }
};
