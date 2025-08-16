<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('acc_journal_entry_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_entry_id')->constrained('acc_journal_entries')->onDelete('cascade'); // Link to the journal entry
            $table->foreignId('account_id')->constrained('chart_of_accounts'); // The account affected
            $table->decimal('debit', 15, 2)->default(0);  // Debit amount
            $table->decimal('credit', 15, 2)->default(0); // Credit amount
            $table->softDeletes();
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acc_journal_entry_lines');
    }
};
