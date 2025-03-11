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
        

        Schema::create('iv_producttransactions', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key
        
            $table->dateTime('transdate')->nullable(); // DATETIME (NULL)
            $table->string('sourcecode', 50)->nullable(); // VARCHAR(50)
            $table->string('sourcedescription', 255)->nullable(); // VARCHAR(255)
            
            $table->unsignedBigInteger('product_id');           
            $table->foreign('product_id')->references('id')->on('siv_products')->onDelete('cascade');
            
            $table->dateTime('expirydate')->nullable();

            $table->string('reference', 50)->nullable();
            
            $table->double('transprice', 11, 2)->default(0.00)->nullable();
            $table->string('transtype', 50)->nullable();
            $table->text('transdescription')->nullable(); 

            $table->decimal('qtyin_1', 15, 2)->default(0);
            $table->decimal('qtyout_1', 15, 2)->default(0);
            $table->decimal('qtyin_2', 15, 2)->default(0);
            $table->decimal('qtyout_2', 15, 2)->default(0);
            $table->decimal('qtyin_3', 15, 2)->default(0);
            $table->decimal('qtyout_3', 15, 2)->default(0);
            $table->decimal('qtyin_4', 15, 2)->default(0);
            $table->decimal('qtyout_4', 15, 2)->default(0);


            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
        
            $table->timestamps(); // created_at and updated_at columns
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iv_producttransactions');
    }
};
