<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acc_receivepaymentdocuments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receivepayment_id')->constrained('acc_receivepayment')->onDelete('cascade');
            $table->string('url');
            $table->string('filename');
            $table->string('type', 50)->comment('MIME type');
            $table->unsignedBigInteger('size')->comment('File size in bytes');
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acc_receivepaymentdocuments');
    }
};