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
        Schema::create('iv_requistion', function (Blueprint $table) {
            $table->id();
            $table->date('transdate');
            $table->timestamp('sysdate')->useCurrent();           
            $table->foreignId('fromstore_id')->constrained('siv_stores')->onDelete('cascade'); 
            
            $table->unsignedBigInteger('tostore_id')->nullable(); // ID of store, customer, or supplier
            $table->unsignedTinyInteger('tostore_type')->nullable(); // Uses App\Enums\StoreType     
             
            $table->integer('stage')->default(1); // Set the default value for 'stage'
            $table->index('stage'); // Add an index for 'stage'           
            $table->decimal('total', 10, 2); // Total order amount
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iv_requistion');
    }
};
