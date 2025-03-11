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
        Schema::create('bls_paymenttypes', function (Blueprint $table) {
            $table->id();
            $table->string('name'); 
            $table->integer('preventoverpay');          
            $table->integer('ischeque');
            $table->integer('allowrefund');
            $table->integer('visibilitysales');
            $table->integer('visibilitydebtorpayments');            
            $table->integer('paymentreference');  
            $table->timestamps(); 
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bls_paymenttypes');
    }
};
