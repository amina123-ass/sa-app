<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('nature_dones', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->integer('duree')->nullable();
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            $table->index('date_suppression');
        });
    }

    public function down()
    {
        Schema::dropIfExists('nature_dones');
    }
};