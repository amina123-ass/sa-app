<?php

// Migration pour nature_dons
// Fichier: database/migrations/xxxx_xx_xx_create_nature_dons_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNatureDonsTable extends Migration
{
    public function up()
    {
        Schema::create('nature_dons', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->integer('duree')->nullable();
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            $table->index(['date_suppression']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('nature_dons');
    }
}