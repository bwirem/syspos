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
        Schema::create('bil_collections', function (Blueprint $table) {
            $table->id();

            $table->timestamp('transdate')->nullable();
            $table->timestamp('sysdate')->nullable();
            
            // Define 'receiptno' column as a string and make it unique
            $table->string('receiptno')->index();
                       
            $table->foreignId('customer_id')->constrained('bls_customers')->onDelete('cascade');                
                      
            $table->integer('paymentsource')->default(0);   

            $table->boolean('refunded')->default(false);
            $table->timestamp('refundsysdate')->nullable();
            $table->timestamp('refundtransdate')->nullable();            
            $table->foreignId('refunduser_id')->nullable()->constrained('users')->onDelete('cascade');
            
            $table->integer('yearpart')->default(0);
            $table->integer('monthpart')->default(0);
            $table->integer('transtype')->default(0);        
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
    
            $table->decimal('paytype000001', 15, 2)->default(0);                     
            $table->decimal('paytype000002', 15, 2)->default(0);                      
            $table->decimal('paytype000003', 15, 2)->default(0);                       
            $table->decimal('paytype000004', 15, 2)->default(0);
                
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bil_collections');
    }
};
