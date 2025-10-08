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
    Schema::table('facilityoptions', function (Blueprint $table) {
        $table->integer('affectstockatcashier')->nullable()->default(1);
        $table->integer('doubleentryissuing')->nullable()->default(1);
        $table->integer('allownegativestock')->nullable()->default(0);
        $table->foreignId('default_customer_id')
            ->nullable()
            ->constrained('bls_customers')
            ->onDelete('set null');
    });
}

    public function down(): void
    {
        Schema::table('facilityoptions', function (Blueprint $table) {
            $table->dropColumn(['affectstockatcashier', 'doubleentryissuing', 'allownegativestock']);
            $table->dropForeign(['default_customer_id']);
            $table->dropColumn('default_customer_id');
        });
    }

};
