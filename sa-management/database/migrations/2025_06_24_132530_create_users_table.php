<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('nom_user');
            $table->string('prenom_user');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->string('tel_user')->nullable();
            $table->text('adresse_user')->nullable();
            $table->boolean('activer_compte')->default(false);
            $table->unsignedBigInteger('role_id')->nullable();
            $table->timestamp('date_suppression')->nullable();
            $table->rememberToken();
            $table->timestamps();
            
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::dropIfExists('users');
    }
};