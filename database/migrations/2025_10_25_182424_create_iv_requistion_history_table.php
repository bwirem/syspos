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
            Schema::create('iv_requistion_history', function (Blueprint $table) {
                $table->id();
                // Foreign key to the main requisition table
                $table->foreignId('requistion_id')
                      ->constrained('iv_requistion')
                      ->onDelete('cascade'); // If requisition is deleted, its history is also deleted

                $table->integer('stage'); // The stage this entry corresponds to (e.g., 2 for submitted, 3 for approved)
                $table->text('remarks')->nullable(); // The remarks provided at this stage

                // Foreign key to the user who performed the action
                $table->foreignId('user_id')
                      ->nullable()
                      ->constrained('users')
                      ->onDelete('set null'); // Keep history even if user is deleted

                $table->timestamps(); // To know when the action was performed
            });
        }

        /**
         * Reverse the migrations.
         */
        public function down(): void
        {
            Schema::dropIfExists('iv_requistion_history');
        }
    };