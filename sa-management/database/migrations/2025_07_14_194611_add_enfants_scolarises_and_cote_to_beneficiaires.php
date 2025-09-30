<?php
// database/migrations/YYYY_MM_DD_XXXXXX_add_enfants_scolarises_and_cote_to_beneficiaires.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('beneficiaires', function (Blueprint $table) {
            // Ajouter la colonne enfants_scolarises après updated_at
            $table->boolean('enfants_scolarises')->nullable()->after('updated_at')
                ->comment('Pour les lunettes: enfant scolarisé (oui/non) - obligatoire si moins de 18 ans');
            
            // Ajouter la colonne cote après enfants_scolarises
            $table->enum('cote', ['unilatéral', 'bilatéral'])->nullable()->after('enfants_scolarises')
                ->comment('Pour les appareils auditifs: côté affecté (unilatéral/bilatéral)');
            
            // Ajouter la colonne lateralite si elle n'existe pas déjà
            if (!Schema::hasColumn('beneficiaires', 'lateralite')) {
                $table->enum('lateralite', ['Unilatérale', 'Bilatérale'])->nullable()->after('cote')
                    ->comment('Latéralité générale');
            }
            
            // Ajouter les index pour optimiser les performances
            $table->index('enfants_scolarises', 'idx_beneficiaires_enfants_scolarises');
            $table->index('cote', 'idx_beneficiaires_cote');
            $table->index(['type_assistance_id', 'enfants_scolarises'], 'idx_beneficiaires_type_enfants');
            $table->index(['type_assistance_id', 'cote'], 'idx_beneficiaires_type_cote');
        });
    }

    /**
     * Reverse the migrations.
     */       
    public function down(): void
    {
        Schema::table('beneficiaires', function (Blueprint $table) {
            // Supprimer les index d'abord
            $table->dropIndex('idx_beneficiaires_enfants_scolarises');
            $table->dropIndex('idx_beneficiaires_cote');
            $table->dropIndex('idx_beneficiaires_type_enfants');
            $table->dropIndex('idx_beneficiaires_type_cote');
            
            // Supprimer les colonnes
            $table->dropColumn(['enfants_scolarises', 'cote']);
            
            // Supprimer lateralite seulement si on l'avait ajoutée
            if (Schema::hasColumn('beneficiaires', 'lateralite')) {
                $table->dropColumn('lateralite');
            }
        });
    }
};