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
        Schema::create('pro_tenderquotations', function (Blueprint $table) {
            $table->id();
            // Define the foreign key columns with the correct data type (unsignedBigInteger)
            $table->unsignedBigInteger('tender_id');
            $table->unsignedBigInteger('supplier_id');  
        
            // Define the foreign key constraints
            $table->foreign('tender_id')->references('id')->on('pro_tender')->onDelete('cascade');
            $table->foreign('supplier_id')->references('id')->on('siv_suppliers')->onDelete('cascade');  
           
            $table->string('url');
            $table->string('filename');
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
        Schema::dropIfExists('pro_tenderquotations');
    }
};
