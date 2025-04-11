<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateUserGroupFunctions extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (!Schema::hasTable('usergroupfunctions')) {
            Schema::create('usergroupfunctions', function (Blueprint $table) {
                $table->id(); 
                $table->foreignId('usergroup_id')->constrained('usergroups')->onDelete('cascade');
                $table->foreignId('usergroupmoduleitem_id')->nullable()->constrained('usergroupmoduleitems')->onDelete('set null');
                $table->string('functionaccesskey');                
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('usergroupfunctions');
    }
}
