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
        Schema::create('bil_invoiceslog', function (Blueprint $table) {
            $table->id();
            
            $table->timestamp('transdate')->nullable();
            $table->timestamp('sysdate')->nullable(); 

            $table->string('reference')->index();

            // Define 'invoiceno' column as a string and make it unique
            $table->string('invoiceno')->index();
            
             // Manually define the foreign key constraint for invoiceno             
            $table->foreign('invoiceno')->references('invoiceno')->on('bil_invoices')->onDelete('cascade');

            $table->foreignId('customer_id')->constrained('bls_customers')->onDelete('cascade');     
           
            $table->decimal('debitamount', 15, 2)->default(0);            
            $table->decimal('creditamount', 15, 2)->default(0);  
          
            $table->integer('yearpart')->default(0);
            $table->integer('monthpart')->default(0);

            $table->integer('transtype')->default(0);
            $table->string('transdescription')->nullable();
            
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bil_invoiceslog');
    }
};
