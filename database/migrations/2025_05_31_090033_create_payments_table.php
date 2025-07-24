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
        Schema::create('acc_payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_reference')->unique();
            $table->string('party_type');     // e.g., "App\Models\User" or "App\Models\Vendor"
            $table->unsignedBigInteger('party_id');  // ID of party
            $table->enum('direction', ['in', 'out']); // 'in' = Receive, 'out' = Make
            $table->decimal('amount', 15, 2);
            $table->string('method')->nullable();
            $table->string('currency')->default('TZS'); // Default to TZS (Tanzanian Shilling)
            $table->date('payment_date');
            $table->text('description')->nullable();
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acc_payments');
    }
};
