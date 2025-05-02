<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\SupplierType; // Adjust the namespace as per your project structure

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('siv_suppliers', function (Blueprint $table) {
            $table->id();
            // Use SupplierType::cases() to get all the customer types
            $table->enum('supplier_type', array_map(fn($type) => $type->value, SupplierType::cases()))->default(SupplierType::INDIVIDUAL->value);

            // Individual Customer Fields
            $table->string('first_name')->nullable(); // Required for individuals
            $table->string('other_names')->nullable(); // Optional for individuals
            $table->string('surname')->nullable(); // Required for individuals

            // Company Customer Fields
            $table->string('company_name')->nullable(); // Required for companies

            $table->string('email')->nullable()->unique(); // Email is nullable but should be unique if provided
            $table->string('phone', 13)->nullable(); // Specify length and allow nulls

            $table->foreignId('ward_id')->nullable()->constrained('loc_wards')->onDelete('set null'); 
            $table->string('address')->nullable(); 

            $table->timestamps(); // 👈 This adds created_at and updated_at
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('siv_suppliers');
    }
};
