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
        Schema::create('bil_invoicepaymentdetails', function (Blueprint $table) {
            
            $table->id();            
            
            $table->string('receiptno')->nullable()->index();
            $table->string('invoiceno')->nullable()->index();    
                    
            // Manually define the foreign key constraint for invoiceno
            $table->foreign('invoiceno')->references('invoiceno')->on('bil_invoices')->onDelete('cascade');
           
            // Define other fields
            $table->decimal('totaldue', 15, 2)->default(0);
            $table->decimal('totalpaid', 15, 2)->default(0);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bil_invoicepaymentdetails');
    }
};
