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
        Schema::create('bil_debtors', function (Blueprint $table) {
            $table->id();
            
            $table->timestamp('transdate')->nullable();
            $table->timestamp('sysdate')->nullable();         
            
            $table->foreignId('customer_id')->constrained('bls_customers')->onDelete('cascade');
            
            $table->string('debtortype')->nullable();

            $table->decimal('balance', 15, 2)->default(0); 
            
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bil_debtors');
    }
};
