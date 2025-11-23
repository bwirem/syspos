<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('facilityoptions', function (Blueprint $table) {
            // Adding as integer to match your existing 0/1 pattern
            // Default 1 means visible by default
            $table->integer('show_register_button')->default(1)->after('allownegativestock');
        });
    }

    public function down()
    {
        Schema::table('facilityoptions', function (Blueprint $table) {
            $table->dropColumn('show_register_button');
        });
    }
};