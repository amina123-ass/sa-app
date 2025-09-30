<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        echo "Début de la migration de correction...\n";
        
        // SOLUTION SIMPLE : Utiliser directement des requêtes SQL
        // Étape 1: Élargir temporairement l'ENUM pour inclure toutes les variations
        DB::statement("ALTER TABLE beneficiaires MODIFY COLUMN decision ENUM(
            'accepté',
            'en_attente', 
            'refusé',
            'admin_a_list_principal',
            'admin_a_list_attente',
            'admin_list_principal',
            'admin_list_attente'
        ) NULL");
        
        echo "ENUM élargi temporairement\n";

        // Étape 2: Normaliser toutes les données vers les nouvelles valeurs
        $updates = [
            // Normaliser vers admin_list_principal
            "UPDATE beneficiaires SET decision = 'admin_list_principal' WHERE decision = 'admin_a_list_principal'",
            
            // Normaliser vers admin_list_attente  
            "UPDATE beneficiaires SET decision = 'admin_list_attente' WHERE decision = 'admin_a_list_attente'"
        ];

        foreach ($updates as $sql) {
            $affected = DB::update($sql);
            if ($affected > 0) {
                echo "Mis à jour {$affected} enregistrements\n";
            }
        }

        // Étape 3: Finaliser avec les valeurs définitives (sans apostrophes problématiques)
        DB::statement("ALTER TABLE beneficiaires MODIFY COLUMN decision ENUM(
            'accepté',
            'en_attente', 
            'refusé',
            'admin_list_principal',
            'admin_list_attente'
        ) NULL COMMENT 'Décision concernant la demande du bénéficiaire'");

        echo "✅ Migration terminée avec succès !\n";
        echo "Nouvelles valeurs possibles : accepté, en_attente, refusé, admin_list_principal, admin_list_attente\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        echo "Rollback de la migration...\n";
        
        DB::statement("ALTER TABLE beneficiaires MODIFY decision ENUM(
            'accepté',
            'en_attente', 
            'refusé'
        ) NULL");
        
        echo "✅ Rollback terminé\n";
    }
};