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
        Schema::table('bil_orderitems', function (Blueprint $table) {
            // Tracks which store provided the stock (ID only)
            $table->unsignedBigInteger('source_store_id')->nullable()->after('price');

            // Tracks which price category was used (e.g., 'price1', 'Wholesale')
            $table->string('price_ref')->nullable()->after('source_store_id');

            // Foreign Key Constraint to siv_stores
            // Uses nullOnDelete so orders remain even if a store is deleted
            $table->foreign('source_store_id')
                  ->references('id')
                  ->on('siv_stores')
                  ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bil_orderitems', function (Blueprint $table) {
            // Drop Foreign Key first
            $table->dropForeign(['source_store_id']);
            
            // Drop Columns
            $table->dropColumn(['source_store_id', 'price_ref']);
        });
    }
};