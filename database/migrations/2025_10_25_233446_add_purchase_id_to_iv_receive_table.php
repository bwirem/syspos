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
        Schema::table('iv_receive', function (Blueprint $table) {
            $table->foreignId('purchase_id')->nullable()->constrained('pro_purchase')->onDelete('set null')->after('id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('iv_receive', function (Blueprint $table) {
            //
        });
    }
};
