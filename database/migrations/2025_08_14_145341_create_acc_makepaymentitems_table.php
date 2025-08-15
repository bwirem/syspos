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
        Schema::create('acc_makepaymentitems', function (Blueprint $table) {
            $table->id();

            // Link to the parent payment record.
            $table->foreignId('makepayment_id')->constrained('acc_makepayment')->onDelete('cascade');

            // Polymorphic relationship for what is being paid.
            // e.g., an Invoice, an Expense, or a general Account.
            $table->morphs('payable'); // Adds `payable_id` and `payable_type`

            // Description specific to this line item.
            $table->string('description', 255)->nullable();

            // Amount paid for this specific item.
            $table->decimal('amount', 15, 2)->default(0);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acc_makepaymentitems');
    }
};
