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
        Schema::create('bil_refunds', function (Blueprint $table) {
            $table->id();
            $table->date('transdate');
            $table->string('refundno')->unique();
            $table->foreignId('customer_id')->constrained('bls_customers');
            $table->foreignId('voidedsale_id')->constrained('bil_voidedsales');
            $table->decimal('refund_amount', 15, 2);
            $table->foreignId('paymentmethod_id')->constrained('bls_paymenttypes');
            $table->text('remarks')->nullable();
            $table->integer('yearpart');
            $table->integer('monthpart');
            $table->integer('transtype');
            $table->foreignId('user_id')->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bil_refunds');
    }
};
