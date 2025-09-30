<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Ajouter des contraintes de validation pour empêcher les chevauchements de campagnes
        Schema::table('campagnes_medicales', function (Blueprint $table) {
            $table->index(['type_assistance_id', 'date_debut', 'date_fin'], 'idx_campagne_periode');
        });
    }

    public function down()
    {
        Schema::table('campagnes_medicales', function (Blueprint $table) {
            $table->dropIndex('idx_campagne_periode');
        });
    }
};