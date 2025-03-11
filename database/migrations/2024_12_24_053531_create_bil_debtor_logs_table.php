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
        Schema::create('bil_debtorlogs', function (Blueprint $table) {
            $table->id();

            $table->timestamp('transdate')->nullable();
            $table->timestamp('sysdate')->nullable();
            
            // Define foreign keys using foreignId
            $table->foreignId('debtor_id')->constrained('bil_debtors')->onDelete('cascade');

            $table->string('reference')->unique()->index();
                      
            $table->decimal('debitamount', 15, 2)->default(0);            
            $table->decimal('creditamount', 15, 2)->default(0);  
            
            $table->integer('yearpart')->default(0);
            $table->integer('monthpart')->default(0);

            $table->string('debtortype')->nullable();

            $table->integer('transtype')->default(0);
            $table->string('transdescription')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bil_debtorlogs');
    }
};
