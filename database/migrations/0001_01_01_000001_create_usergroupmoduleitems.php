<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateUserGroupModuleitems extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (!Schema::hasTable('usergroupmoduleitems')) {
            Schema::create('usergroupmoduleitems', function (Blueprint $table) {
                $table->id(); 
                $table->foreignId('usergroup_id')->constrained('usergroups')->onDelete('cascade');
                $table->string('moduleitemkey');                
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
        Schema::dropIfExists('usergroupmoduleitems');
    }
}
