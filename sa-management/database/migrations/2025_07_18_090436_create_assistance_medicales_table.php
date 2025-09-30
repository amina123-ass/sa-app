<?php

// ===== MIGRATION PRINCIPALE: ASSISTANCE MÉDICALES =====
// Fichier: database/migrations/2024_01_01_create_assistance_medicales_table.php

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
        Schema::create('assistance_medicales', function (Blueprint $table) {
            $table->id();
            
            // ===== IDENTIFICATION UNIQUE =====
            $table->string('numero_assistance', 50)->unique()->comment('Numéro unique d\'assistance (ex: ASS-20240118-1430-0001)');
            
            // ===== RELATIONS OBLIGATOIRES =====
            $table->foreignId('type_assistance_id')
                ->constrained('types_assistance')
                ->onDelete('cascade')
                ->comment('Type d\'assistance (lunettes, appareils auditifs, etc.)');
                
            $table->foreignId('beneficiaire_id')
                ->constrained('beneficiaires')
                ->onDelete('cascade')
                ->comment('Bénéficiaire de l\'assistance');
                
            $table->foreignId('etat_don_id')
                ->constrained('etat_dones')
                ->onDelete('cascade')
                ->comment('État actuel du don/assistance');
            
            // ===== RELATIONS OPTIONNELLES =====
            $table->foreignId('details_type_assistance_id')
                ->nullable()
                ->constrained('details_type_assistances')
                ->onDelete('set null')
                ->comment('Détails spécifiques du type d\'assistance');
                
            $table->foreignId('campagne_id')
                ->nullable()
                ->constrained('campagnes_medicales')
                ->onDelete('set null')
                ->comment('Campagne médicale associée (optionnel)');
                
            $table->foreignId('situation_id')
                ->nullable()
                ->constrained('situations')
                ->onDelete('set null')
                ->comment('Situation du bénéficiaire');
                
            $table->foreignId('nature_done_id')
                ->nullable()
                ->constrained('nature_dones')
                ->onDelete('set null')
                ->comment('Nature du don');
            
            // ===== INFORMATIONS DE L'ASSISTANCE =====
            $table->date('date_assistance')->comment('Date de l\'assistance médicale');
            $table->decimal('montant', 10, 2)->nullable()->comment('Montant de l\'assistance en DH');
            
            // ===== PRIORITÉ ET STATUT =====
            $table->enum('priorite', ['Normale', 'Urgente', 'Très urgente'])
                ->default('Normale')
                ->comment('Niveau de priorité de l\'assistance');
                
            $table->boolean('assistance_terminee')
                ->default(false)
                ->comment('Indique si l\'assistance est terminée');
            
            // ===== OBSERVATIONS ET COMMENTAIRES =====
            $table->text('observations')->nullable()->comment('Observations générales');
            $table->text('commentaire_interne')->nullable()->comment('Commentaires internes équipe');
            
            // ===== WORKFLOW ET VALIDATION =====
            $table->boolean('validee')->default(false)->comment('Assistance validée par un responsable');
            $table->timestamp('validee_le')->nullable()->comment('Date de validation');
            $table->foreignId('validee_par')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null')
                ->comment('Utilisateur qui a validé');
            $table->text('commentaire_validation')->nullable()->comment('Commentaire de validation');
            
            $table->boolean('rejetee')->default(false)->comment('Assistance rejetée');
            $table->timestamp('rejetee_le')->nullable()->comment('Date de rejet');
            $table->foreignId('rejetee_par')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null')
                ->comment('Utilisateur qui a rejeté');
            $table->text('motif_rejet')->nullable()->comment('Motif du rejet');
            
            // ===== SUIVI FINANCIER =====
            $table->decimal('montant_reel_depense', 10, 2)->nullable()->comment('Montant réellement dépensé');
            $table->date('date_paiement')->nullable()->comment('Date de paiement effectif');
            $table->string('mode_paiement', 50)->nullable()->comment('Mode de paiement (espèces, chèque, virement)');
            $table->string('reference_paiement', 100)->nullable()->comment('Référence du paiement');
            
            // ===== DOCUMENTS ET FICHIERS =====
            $table->json('documents_joints')->nullable()->comment('Liste des documents joints (JSON)');
            $table->string('recu_pdf', 500)->nullable()->comment('Chemin vers le reçu PDF généré');
            
            // ===== SUIVI QUALITÉ =====
            $table->enum('satisfaction_beneficiaire', ['Très satisfait', 'Satisfait', 'Neutre', 'Insatisfait', 'Très insatisfait'])
                ->nullable()
                ->comment('Niveau de satisfaction du bénéficiaire');
            $table->text('feedback_beneficiaire')->nullable()->comment('Retour du bénéficiaire');
            $table->date('date_feedback')->nullable()->comment('Date du retour');
            
            // ===== CHAMPS SPÉCIFIQUES SELON LE TYPE =====
            // Pour les lunettes
            $table->string('type_verres', 100)->nullable()->comment('Type de verres prescrits');
            $table->string('monture_choisie', 100)->nullable()->comment('Monture choisie');
            $table->text('prescription_medicale')->nullable()->comment('Détails de la prescription');
            
            // Pour les appareils auditifs
            $table->enum('oreille_concernee', ['Droite', 'Gauche', 'Bilatéral'])->nullable()->comment('Oreille(s) concernée(s)');
            $table->string('type_appareil', 100)->nullable()->comment('Type d\'appareil auditif');
            $table->text('resultats_audiometrie')->nullable()->comment('Résultats de l\'audiométrie');
            
            // Pour le transport
            $table->string('destination', 255)->nullable()->comment('Destination du transport');
            $table->string('type_transport', 100)->nullable()->comment('Type de transport utilisé');
            $table->decimal('distance_km', 8, 2)->nullable()->comment('Distance parcourue en km');
            
            // ===== RAPPELS ET SUIVI =====
            $table->date('date_rappel')->nullable()->comment('Date de rappel programmé');
            $table->boolean('rappel_envoye')->default(false)->comment('Rappel envoyé');
            $table->text('notes_suivi')->nullable()->comment('Notes de suivi');
            
            // ===== RELATIONS AVEC D'AUTRES ASSISTANCES =====
            $table->foreignId('assistance_precedente_id')
                ->nullable()
                ->constrained('assistance_medicales')
                ->onDelete('set null')
                ->comment('Assistance précédente liée');
            $table->boolean('assistance_renouvelee')->default(false)->comment('Assistance renouvelée');
            
            // ===== MÉTADONNÉES =====
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null')
                ->comment('Utilisateur qui a créé l\'assistance');
                
            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null')
                ->comment('Dernier utilisateur à avoir modifié');
                
            $table->timestamp('date_suppression')->nullable()->comment('Date de suppression logique');
            $table->timestamps();
            
            // ===== INDEX POUR OPTIMISATION =====
            
            // Index unique pour le numéro d'assistance
            $table->unique('numero_assistance', 'unique_numero_assistance');
            
            // Index sur les dates importantes
            $table->index('date_assistance', 'idx_date_assistance');
            $table->index('date_suppression', 'idx_date_suppression');
            $table->index('date_paiement', 'idx_date_paiement');
            
            // Index sur les relations fréquemment utilisées
            $table->index(['type_assistance_id', 'date_assistance'], 'idx_type_date');
            $table->index(['beneficiaire_id', 'date_assistance'], 'idx_beneficiaire_date');
            $table->index(['campagne_id', 'date_suppression'], 'idx_campagne_actif');
            $table->index('etat_don_id', 'idx_etat_don');
            
            // Index sur le workflow
            $table->index(['priorite', 'assistance_terminee', 'date_suppression'], 'idx_priorite_statut');
            $table->index(['assistance_terminee', 'date_suppression'], 'idx_terminee');
            $table->index(['validee', 'rejetee', 'date_suppression'], 'idx_workflow');
            
            // Index sur les montants pour les rapports financiers
            $table->index(['montant', 'date_assistance'], 'idx_montant_date');
            
            // Index composé pour les recherches fréquentes
            $table->index(['type_assistance_id', 'priorite', 'assistance_terminee'], 'idx_type_priorite_statut');
            $table->index(['campagne_id', 'validee', 'date_suppression'], 'idx_campagne_validee');
            
            // Index pour les statistiques
            $table->index(['date_assistance', 'montant', 'assistance_terminee'], 'idx_stats_base');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assistance_medicales');
    }
};