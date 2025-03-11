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
        Schema::create('pro_purchase', function (Blueprint $table) {
            $table->id();
            $table->date('transdate');
            $table->timestamp('sysdate')->useCurrent();
            $table->foreignId('supplier_id')->constrained('siv_suppliers')->onDelete('cascade');
            $table->foreignId('facilityoption_id')->constrained('facilityoptions')->onDelete('cascade');
            $table->integer('stage')->default(1); // Set the default value for 'stage'
            $table->index('stage'); // Add an index for 'stage'
            $table->decimal('total', 10, 2)->default(0.00); // Total order amount, set default
            $table->string('url')->nullable(); // Allow null values
            $table->string('filename')->nullable(); // Allow null values
            $table->text('remarks')->nullable(); // Allow null values
            $table->string('recipient_name')->nullable(); // Add recipient name
            $table->string('recipient_contact')->nullable(); // Add recipient contact
            $table->string('dispatch_number')->nullable(); // Add dispatch number
            $table->string('purchase_order_path')->nullable(); // Add purchase order path
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pro_purchase');
    }
};