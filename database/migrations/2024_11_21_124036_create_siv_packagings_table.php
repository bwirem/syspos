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
        Schema::create('siv_packagings', function (Blueprint $table) {
            $table->id();
            $table->string('name'); 
            $table->integer('pieces'); 
            $table->timestamps();
           
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('siv_packagings');
    }
};
