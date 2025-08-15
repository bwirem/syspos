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
        Schema::create('acc_makepaymentdocuments', function (Blueprint $table) {
            $table->id();

            // Link to the parent payment record.
            $table->foreignId('makepayment_id')->constrained('acc_makepayment')->onDelete('cascade');

            // File details for the uploaded document.
            $table->string('url');
            $table->string('filename');
            $table->string('type', 50)->comment('MIME type');
            $table->unsignedBigInteger('size')->comment('File size in bytes');
            $table->string('description')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acc_makepaymentdocuments');
    }
};