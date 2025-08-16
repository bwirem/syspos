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
        Schema::create('acc_journal_entries', function (Blueprint $table) {
            $table->id();
            $table->date('entry_date'); // Date the journal entry was made
            $table->string('reference_number')->nullable(); // Optional reference number (e.g., invoice number)
            $table->string('description')->nullable(); // Description of the transaction
            //$table->foreignId('transaction_id')->nullable()->constrained()->onDelete('set null'); // Optional link to the original transaction
            $table->softDeletes();
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acc_journal_entries');
    }
};
