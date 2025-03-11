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
      
        Schema::create('iv_physicalinventory', function (Blueprint $table) { // Replace 'your_table_name'
            $table->id(); // Optional: Add if you want an auto-incrementing primary key
            $table->dateTime('transdate')->nullable();
            $table->dateTime('calculateddate')->nullable();
            $table->dateTime('closeddate')->nullable();

            $table->unsignedBigInteger('store_id');
            $table->foreign('store_id')->references('id')->on('siv_stores')->onDelete('cascade');
                     
            $table->string('description', 255)->nullable();
            $table->integer('stage')->default(1); // Set the default value for 'stage'
            $table->index('stage'); // Add an index for 'stage'
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps(); // Optional: Add if you want created_at and updated_at columns
        });    
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iv_physicalinventory');
    }
};
