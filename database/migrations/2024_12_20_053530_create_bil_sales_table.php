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
        Schema::create('bil_sales', function (Blueprint $table) {
            $table->id();
            $table->timestamp('transdate')->nullable();
            $table->timestamp('sysdate')->nullable();
           
            $table->string('receiptno')->nullable()->default('')->index();  // Allows empty or NULL
            $table->string('invoiceno')->nullable()->default('')->index();  // Allows empty or NULL

            $table->foreignId('customer_id')->constrained('bls_customers')->onDelete('cascade');     
            
            $table->boolean('voided')->default(false);
            $table->timestamp('voidsysdate')->nullable();
            $table->timestamp('voidtransdate')->nullable();
            $table->string('voidno')->nullable();
            $table->foreignId('voiduser_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->decimal('totaldue', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('totalpaid', 15, 2)->default(0);  
            $table->decimal('changeamount', 15, 2)->default(0);
            
            $table->integer('yearpart')->default(0);
            $table->integer('monthpart')->default(0);
            $table->integer('transtype')->default(0);
            
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bil_sales');
    }
};
