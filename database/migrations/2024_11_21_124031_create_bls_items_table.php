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
        Schema::create('bls_items', function (Blueprint $table) {
            $table->id();            
            $table->integer('itemgroup_id')->foreign('itemgroup_id')->references('id')->on('bls_itemgroups');
            $table->string('name'); 
            $table->decimal('price1', 10, 2);
            $table->decimal('price2', 10, 2);
            $table->decimal('price3', 10, 2);
            $table->decimal('price4', 10, 2);
            $table->integer('defaultqty'); ;
            $table->integer('addtocart'); 
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bls_items');
    }
};
