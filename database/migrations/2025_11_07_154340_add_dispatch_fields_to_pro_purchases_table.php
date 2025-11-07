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
        Schema::table('pro_purchase', function (Blueprint $table) {
            $table->text('dispatch_remarks')->nullable()->after('recipient_contact');
            $table->string('dispatch_document_url')->nullable()->after('dispatch_remarks');
            $table->string('dispatch_document_filename')->nullable()->after('dispatch_document_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pro_purchase', function (Blueprint $table) {
            $table->dropColumn(['dispatch_remarks', 'dispatch_document_url', 'dispatch_document_filename']);
        });
    }
};