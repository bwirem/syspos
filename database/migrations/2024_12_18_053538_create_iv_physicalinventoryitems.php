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
        Schema::create('iv_physicalinventoryitems', function (Blueprint $table) { // Replace 'your_table_name'
            $table->id(); //  auto-incrementing primary key.
            
            $table->unsignedBigInteger('physicalinventory_id');
            $table->unsignedBigInteger('product_id');   
             
            $table->foreign('physicalinventory_id')->references('id')->on('iv_physicalinventory')->onDelete('cascade');        
            $table->foreign('product_id')->references('id')->on('siv_products')->onDelete('cascade');
                  
            $table->dateTime('expirydate')->nullable();
            $table->double('countedqty', 11, 2)->nullable()->default(0.00);
            $table->double('expectedqty', 11, 2)->nullable()->default(0.00);
            $table->double('price', 16, 2)->nullable()->default(0.00);           
            $table->string('butchno')->nullable(); // Assuming butchno is a string.  Add charset/collation if needed.
            
            $table->timestamps(); // Adds created_at and updated_at
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iv_physicalinventoryitems');
    }
};
