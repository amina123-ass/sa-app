<?php
// database/migrations/2025_01_XX_XXXXXX_update_beneficiaires_add_decision_column.php

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
            // Modifier le commentaire de la colonne enfants_scolarises pour la rendre disponible pour tous les types
            if (Schema::hasColumn('beneficiaires', 'enfants_scolarises')) {
                $table->boolean('enfants_scolarises')->nullable()->change()
                    ->comment('Enfant scolarisé (oui/non) - obligatoire si moins de 18 ans pour lunettes et appareils auditifs');
            } else {
                // Si la colonne n'existe pas, la créer
                $table->boolean('enfants_scolarises')->nullable()->after('updated_at')
                    ->comment('Enfant scolarisé (oui/non) - obligatoire si moins de 18 ans pour lunettes et appareils auditifs');
            }
            
            // Ajouter la colonne decision
            $table->enum('decision', [
                'accepté', 
                'en_attente', 
                'refusé', 
                'admin a list principal', 
                'admin a list attente'  // Removed the apostrophe
            ])->nullable()->after('enfants_scolarises')
                ->comment('Décision concernant la demande du bénéficiaire');
            
            // Ajouter un index pour optimiser les performances sur la colonne decision
            $table->index('decision', 'idx_beneficiaires_decision');
            $table->index(['type_assistance_id', 'decision'], 'idx_beneficiaires_type_decision');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('beneficiaires', function (Blueprint $table) {
            // Supprimer les index d'abord
            $table->dropIndex('idx_beneficiaires_decision');
            $table->dropIndex('idx_beneficiaires_type_decision');
            
            // Supprimer la colonne decision
            $table->dropColumn('decision');
            
            // Remettre l'ancien commentaire pour enfants_scolarises (optionnel)
            if (Schema::hasColumn('beneficiaires', 'enfants_scolarises')) {
                $table->boolean('enfants_scolarises')->nullable()->change()
                    ->comment('Pour les lunettes: enfant scolarisé (oui/non) - obligatoire si moins de 18 ans');
            }
        });
    }
};