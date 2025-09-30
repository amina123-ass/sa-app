<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('assistance_medicales', function (Blueprint $table) {
            // Supprimer la colonne assistance_terminee
            $table->dropColumn('assistance_terminee');
            
            // Ajouter la colonne moi_meme après retour_effectue
            $table->boolean('moi_meme')->default(false)
                ->after('retour_effectue')
                ->comment('Indique si l\'assistance a été réalisée par le bénéficiaire lui-même');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('assistance_medicales', function (Blueprint $table) {
            // Restaurer la colonne assistance_terminee
            $table->boolean('assistance_terminee')->default(false)
                ->after('priorite')
                ->comment('Indique si l\'assistance est terminée');
            
            // Supprimer la colonne moi_meme
            $table->dropColumn('moi_meme');
        });
    }
};