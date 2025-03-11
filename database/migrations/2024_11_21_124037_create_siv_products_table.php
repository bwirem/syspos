<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('siv_products', function (Blueprint $table) {
            $table->id(); 
            $table->integer('category_id')->foreign('category_id')->references('id')->on('siv_productcategories');
            $table->string('name'); 
            $table->string('displayname'); 
            $table->integer('package_id')->foreign('package_id')->references('id')->on('siv_packagings');
            $table->decimal('prevcost', 10, 2);
            $table->decimal('costprice', 10, 2);
            $table->decimal('averagecost', 10, 2);      
            $table->integer('addtocart');                     
            $table->integer('defaultqty');                          
            $table->integer('hasexpiry');                        
            $table->integer('expirynotice');                    
            $table->integer('display');                              
            $table->integer('reorderlevel'); 
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('siv_products');
    }
};
