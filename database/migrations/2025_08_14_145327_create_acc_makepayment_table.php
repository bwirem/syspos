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
        Schema::create('acc_makepayment', function (Blueprint $table) {
            $table->id();
            $table->date('transdate');
            $table->timestamp('sysdate')->useCurrent();

            // Total amount of the payment.
            // Can be calculated from items, but useful for performance.
            $table->decimal('total_amount', 15, 2);

            // Facility where the payment was made.
            // RESTRICT delete to prevent removing a facility with payment history.
            $table->foreignId('facilityoption_id')->constrained('facilityoptions')->onDelete('restrict');

            // General description for the entire payment.
            $table->string('description', 255)->nullable();

            // Payment stage (e.g., 1: Pending, 2: Approved, 3: Paid).
            // Consider using an Enum in your Laravel model for these values.
            $table->integer('stage')->default(1)->comment('1: Pending, 2: Approved, 3: Paid');
            $table->index('stage');

            // Polymorphic relationship for the recipient (payee).
            // Can be a Supplier, Employee, etc.
            $table->morphs('recipient'); // Adds `recipient_id` (unsignedBigInteger) and `recipient_type` (string)

            // Details for reconciliation.
            $table->string('payment_method', 100)->nullable()->comment('e.g., Bank Transfer, Cash, Cheque');
            $table->string('reference_number', 255)->nullable()->comment('e.g., Cheque no, Transaction ID');
            $table->string('currency', 3)->default('USD');

            // User who recorded the payment.
            // RESTRICT delete to protect payment history if a user is deleted.
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acc_makepayment');
    }
};
