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
            Schema::table('iv_requistion', function (Blueprint $table) {
                // Add the new column. It can be nullable as it's likely only populated
                // after the requisition is processed/issued.
                $table->string('delivery_no')->nullable()->after('transdate');
            });
        }

        /**
         * Reverse the migrations.
         */
        public function down(): void
        {
            Schema::table('iv_requistion', function (Blueprint $table) {
                $table->dropColumn('delivery_no');
            });
        }
    };