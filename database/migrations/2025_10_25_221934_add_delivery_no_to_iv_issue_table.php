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
            Schema::table('iv_issue', function (Blueprint $table) {
                // Add the new column. Making it unique is highly recommended.
                // It can be nullable if some issues might not have a delivery number.
                $table->string('delivery_no')->unique()->nullable()->after('transdate');
            });
        }

        /**
         * Reverse the migrations.
         */
        public function down(): void
        {
            Schema::table('iv_issue', function (Blueprint $table) {
                // Drop the unique index first, then the column
                $table->dropUnique(['delivery_no']);
                $table->dropColumn('delivery_no');
            });
        }
    };