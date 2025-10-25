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
                // Add the delivery_no column. It's often a string and can be nullable.
                // It should typically NOT be unique, as different suppliers/stores might use the same number.
                $table->string('delivery_no')->nullable()->after('transdate');
            });
        }

        /**
         * Reverse the migrations.
         */
        public function down(): void
        {
            Schema::table('iv_receive', function (Blueprint $table) {
                $table->dropColumn('delivery_no');
            });
        }
    };