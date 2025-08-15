<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acc_receivepayment', function (Blueprint $table) {
            $table->id();
            $table->date('transdate');
            $table->timestamp('sysdate')->useCurrent();
            $table->decimal('total_amount', 15, 2);
            $table->foreignId('facilityoption_id')->constrained('facilityoptions')->onDelete('restrict');
            $table->string('description', 255)->nullable();
            $table->integer('stage')->default(1)->comment('1: Pending Verification, 2: Cleared, 3: Bounced');
            $table->index('stage');
            $table->morphs('payer'); // Polymorphic: Payer can be a Customer, etc.
            $table->string('payment_method', 100)->nullable()->comment('e.g., Bank Deposit, Cheque, Cash');
            $table->string('reference_number', 255)->nullable()->comment('e.g., Cheque no, Deposit Slip ID');
            $table->string('currency', 3)->default('USD');
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acc_receivepayment');
    }
};