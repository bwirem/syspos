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
        Schema::table('bil_voidedsales', function (Blueprint $table) {
            $table->decimal('refunded_amount', 15, 2)->default(0)->after('totalpaid');
            $table->boolean('is_refunded')->default(false)->after('refunded_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bil_voidedsales', function (Blueprint $table) {
            //
        });
    }
};
