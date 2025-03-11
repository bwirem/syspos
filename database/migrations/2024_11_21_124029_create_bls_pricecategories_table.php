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
        Schema::create('bls_pricecategories', function (Blueprint $table) {
            $table->id();            
            $table->integer('useprice1'); 
            $table->integer('useprice2');
            $table->integer('useprice3');
            $table->integer('useprice4');
            $table->string('price1');  
            $table->string('price2'); 
            $table->string('price3'); 
            $table->string('price4');  
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bls_pricecategories');
    }
};
