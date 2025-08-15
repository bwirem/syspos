<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acc_receivepaymentitems', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receivepayment_id')->constrained('acc_receivepayment')->onDelete('cascade');
            $table->morphs('receivable'); // Polymorphic: What is being paid (e.g., Invoice)
            $table->string('description', 255)->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acc_receivepaymentitems');
    }
};