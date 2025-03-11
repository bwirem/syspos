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
        Schema::create('sexp_items', function (Blueprint $table) {
            $table->id(); 
            $table->integer('itemgroup_id')->foreign('itemgroup_id')->references('id')->on('sexp_itemgroups');
            $table->string('name');  
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sexp_items');
    }
};
