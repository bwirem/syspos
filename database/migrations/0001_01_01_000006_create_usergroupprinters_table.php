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
        Schema::create('usergroupprinters', function (Blueprint $table) {
            // 'autocode' as Primary Key (INT(11) AUTO_INCREMENT)
            $table->id(); 

            // 'machinename' (VARCHAR 50)
            $table->string('machinename', 50)->default('')->nullable();

            // We use usergroup_id to link to your 'usergroups' table
            $table->foreignId('usergroup_id')->nullable()->constrained('usergroups');

            // 'documenttypecode' e.g., 'invoice', 'receipt'
            $table->string('documenttypecode', 50)->default('');

            // 'printername'
            $table->string('printername', 255)->default('');

            // 'printedwhen' (INT)
            $table->integer('printedwhen')->default(-1);

            // 'autoprint' (INT/Boolean)
            $table->boolean('autoprint')->default(0);

            // 'printtoscreen' (INT/Boolean)
            $table->boolean('printtoscreen')->default(0);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('usergroupprinters');
    }
};
