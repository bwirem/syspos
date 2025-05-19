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
        Schema::table('iv_physicalstockbalances', function (Blueprint $table) {
            $table->decimal('quantity', 15, 2)->default(0)->after('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('iv_physicalstockbalances', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });
    }
};
