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
        Schema::table('facilityoptions', function (Blueprint $table) {
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->string('tin')->nullable(); // Tax Identification Number
            $table->string('vrn')->nullable(); // VAT Registration Number
            $table->string('logo_path')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('facilityoptions', function (Blueprint $table) {
            $table->dropColumn(['address', 'phone', 'email', 'website', 'tin', 'vrn', 'logo_path']);
        });
    }
};
