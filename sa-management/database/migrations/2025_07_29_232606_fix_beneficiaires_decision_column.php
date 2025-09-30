<?php
// database/migrations/2025_01_30_fix_beneficiaires_decision_column.php

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
        // Étape 1: Vérifier et supprimer les index existants pour éviter les conflits
        try {
            Schema::table('beneficiaires', function (Blueprint $table) {
                // Essayer de supprimer les index s'ils existent
                $table->dropIndex('idx_beneficiaires_decision');
            });
        } catch (Exception $e) {
            // L'index n'existe pas, continuer
        }

        try {
            Schema::table('beneficiaires', function (Blueprint $table) {
                $table->dropIndex('idx_beneficiaires_type_decision');
            });
        } catch (Exception $e) {
            // L'index n'existe pas, continuer
        }

        // Étape 2: Mettre à jour les données existantes pour corriger les valeurs
        try {
            DB::table('beneficiaires')
                ->where('decision', "admin a list d'attente")
                ->update(['decision' => 'admin_a_list_attente']);
                
            DB::table('beneficiaires')
                ->where('decision', 'admin a list principal')
                ->update(['decision' => 'admin_a_list_principal']);
        } catch (Exception $e) {
            // Les valeurs n'existent peut-être pas, continuer
        }

        // Étape 3: Supprimer et recréer la colonne decision
        Schema::table('beneficiaires', function (Blueprint $table) {
            // Vérifier si la colonne existe avant de la supprimer
            if (Schema::hasColumn('beneficiaires', 'decision')) {
                $table->dropColumn('decision');
            }
        });

        // Étape 4: Recréer la colonne avec les bonnes valeurs
        Schema::table('beneficiaires', function (Blueprint $table) {
            $table->enum('decision', [
                'accepté', 
                'en_attente', 
                'refusé', 
                'admin_a_list_principal',     // Underscore au lieu d'espaces
                'admin_a_list_attente'        // Sans apostrophe, avec underscore
            ])->nullable()->after('enfants_scolarises')
                ->comment('Décision concernant la demande du bénéficiaire');
        });

        // Étape 5: Ajouter les nouveaux index avec vérification
        Schema::table('beneficiaires', function (Blueprint $table) {
            // Vérifier si les index n'existent pas déjà avant de les créer
            $indexes = DB::select("SHOW INDEX FROM beneficiaires WHERE Key_name IN ('idx_beneficiaires_decision', 'idx_beneficiaires_type_decision')");
            
            $existingIndexes = collect($indexes)->pluck('Key_name')->toArray();
            
            if (!in_array('idx_beneficiaires_decision', $existingIndexes)) {
                $table->index('decision', 'idx_beneficiaires_decision');
            }
            
            if (!in_array('idx_beneficiaires_type_decision', $existingIndexes)) {
                $table->index(['type_assistance_id', 'decision'], 'idx_beneficiaires_type_decision');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('beneficiaires', function (Blueprint $table) {
            // Supprimer les index en toute sécurité
            try {
                $table->dropIndex('idx_beneficiaires_decision');
            } catch (Exception $e) {
                // Index n'existe pas
            }
            
            try {
                $table->dropIndex('idx_beneficiaires_type_decision');
            } catch (Exception $e) {
                // Index n'existe pas
            }
            
            // Supprimer la colonne
            if (Schema::hasColumn('beneficiaires', 'decision')) {
                $table->dropColumn('decision');
            }
        });
    }
};