<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Ajouter la colonne libelle à la table budgets
        Schema::table('budgets', function (Blueprint $table) {
            $table->string('libelle', 255)->after('id');
        });
        
        // Mettre à jour les enregistrements existants avec des valeurs par défaut
        DB::statement("
            UPDATE budgets 
            SET libelle = CONCAT('Budget ', annee_exercice, ' - Type ', type_budget_id)
            WHERE libelle IS NULL OR libelle = ''
        ");
    }

    public function down()
    {
        Schema::table('budgets', function (Blueprint $table) {
            $table->dropColumn('libelle');
        });
    }
};