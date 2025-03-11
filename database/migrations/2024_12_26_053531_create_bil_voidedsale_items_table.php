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
        Schema::create('bil_voidedsalesitems', function (Blueprint $table) {
            $table->id();
            
            // Define foreign keys using foreignId
            $table->foreignId('voidedsale_id')->constrained('bil_voidedsales')->onDelete('cascade');
            $table->foreignId('item_id')->constrained('bls_items')->onDelete('cascade');
            
            // Define other fields
            $table->decimal('quantity', 15, 2)->default(0);
            $table->decimal('price', 15, 2)->default(0);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bil_voidedsalesitems');
    }
};
