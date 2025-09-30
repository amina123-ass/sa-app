<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateEtatDonsTable extends Migration
{
    public function up()
    {
        Schema::create('etat_dons', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            $table->index(['date_suppression']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('etat_dons');
    }
}
