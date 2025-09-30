<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class SimpleFixDecisionColumn extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // SOLUTION SIMPLE: Modifier directement la colonne ENUM sans la supprimer
        
        // Étape 1: Utiliser une requête SQL directe pour modifier l'ENUM
        DB::statement("ALTER TABLE beneficiaires MODIFY COLUMN decision ENUM(
            'accepté',
            'en_attente', 
            'refusé',
            'admin_a_list_principal',
            'admin_a_list_attente'
        ) NULL COMMENT 'Décision concernant la demande du bénéficiaire'");
        
        // Étape 2: Mettre à jour les données existantes
        DB::table('beneficiaires')
            ->where('decision', 'admin a list principal')
            ->update(['decision' => 'admin_a_list_principal']);
            
        DB::table('beneficiaires')
            ->whereIn('decision', [
                "admin a list d'attente",
                "admin a list d'attente", 
                'admin a list attente'
            ])
            ->update(['decision' => 'admin_a_list_attente']);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Remettre l'ancienne structure si nécessaire
        DB::statement("ALTER TABLE beneficiaires MODIFY COLUMN decision ENUM(
            'accepté',
            'en_attente', 
            'refusé',
            'admin a list principal',
            'admin a list d\\'attente'
        ) NULL");
    }
}