<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\AccountType; // Import the enum

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('account_code')->unique(); // Unique identifier for the account
            $table->string('account_name'); // Descriptive name of the account
            $table->tinyInteger('account_type')->default(AccountType::Asset->value)->index(); // Changed to 
            $table->string('description')->nullable(); // Optional detailed description
            $table->boolean('is_active')->default(true); // Whether the account is currently active
            $table->unsignedBigInteger('parent_account_id')->nullable(); // For hierarchical accounts (sub-accounts)
            $table->foreign('parent_account_id')->references('id')->on('chart_of_accounts')->onDelete('set null'); // Self-referencing foreign key
            $table->softDeletes();
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chart_of_accounts');
    }
};
