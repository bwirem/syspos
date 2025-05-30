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
        Schema::table('pro_purchaseitems', function (Blueprint $table) {
            // Adjust decimal places and default as needed.
            // Make it nullable if an item might initially have no received quantity tracked.
            // Default to 0 makes calculations easier.
            $table->decimal('quantity_received_total', 15, 4)->default(0)->after('quantity'); // Or after another relevant column
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pro_purchaseitems', function (Blueprint $table) {
            $table->dropColumn('quantity_received_total');
        });
    }
};
