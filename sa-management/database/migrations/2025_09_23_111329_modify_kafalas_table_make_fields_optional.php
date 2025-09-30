<?php

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
        Schema::table('kafalas', function (Blueprint $table) {
            // Rendre l'email optionnel
            $table->string('email')->nullable()->change();
            
            // Rendre tous les champs enfant optionnels
            $table->string('nom_enfant')->nullable()->change();
            $table->string('prenom_enfant')->nullable()->change();
            $table->enum('sexe_enfant', ['M', 'F'])->nullable()->change();
            
            // Vérifier et ajouter les champs PDF manquants
            if (!Schema::hasColumn('kafalas', 'fichier_pdf_nom')) {
                // Modifier le champ fichier_pdf existant
                $table->longBlob('fichier_pdf')->nullable()->change();
                
                // Ajouter les nouveaux champs pour les métadonnées PDF
                $table->string('fichier_pdf_nom')->nullable()->after('fichier_pdf');
                $table->unsignedBigInteger('fichier_pdf_taille')->nullable()->after('fichier_pdf_nom');
                $table->string('fichier_pdf_type')->nullable()->after('fichier_pdf_taille');
                $table->timestamp('fichier_pdf_uploaded_at')->nullable()->after('fichier_pdf_type');
                $table->string('fichier_pdf_path')->nullable()->after('fichier_pdf_uploaded_at');
            }
            
            // Ajouter les index manquants pour améliorer les performances
            try {
                $table->index(['nom_mere', 'prenom_mere'], 'idx_kafalas_nom_mere_prenom');
            } catch (Exception $e) {
                // Index peut déjà exister
            }
            
            try {
                $table->index('email', 'idx_kafalas_email');
            } catch (Exception $e) {
                // Index peut déjà exister
            }
            
            try {
                $table->index('telephone', 'idx_kafalas_telephone');
            } catch (Exception $e) {
                // Index peut déjà exister
            }
            
            try {
                $table->index('sexe_enfant', 'idx_kafalas_sexe_enfant');
            } catch (Exception $e) {
                // Index peut déjà exister
            }
            
            try {
                $table->index(['deleted_at', 'created_at'], 'idx_kafalas_deleted_created');
            } catch (Exception $e) {
                // Index peut déjà exister
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kafalas', function (Blueprint $table) {
            // Remettre les champs comme obligatoires (attention: peut échouer si des valeurs null existent)
            try {
                $table->string('email')->nullable(false)->change();
                $table->string('nom_enfant')->nullable(false)->change();
                $table->string('prenom_enfant')->nullable(false)->change();
                $table->enum('sexe_enfant', ['M', 'F'])->nullable(false)->change();
            } catch (Exception $e) {
                // Si des valeurs null existent, le rollback peut échouer
                // Dans ce cas, il faudra nettoyer manuellement les données
            }
            
            // Supprimer les nouveaux champs PDF si ils existent
            if (Schema::hasColumn('kafalas', 'fichier_pdf_nom')) {
                $table->dropColumn([
                    'fichier_pdf_nom',
                    'fichier_pdf_taille', 
                    'fichier_pdf_type',
                    'fichier_pdf_uploaded_at',
                    'fichier_pdf_path'
                ]);
            }
            
            // Remettre fichier_pdf comme string simple
            $table->string('fichier_pdf')->nullable()->change();
            
            // Supprimer les index ajoutés
            try {
                $table->dropIndex('idx_kafalas_nom_mere_prenom');
            } catch (Exception $e) {
                // Index peut ne pas exister
            }
            
            try {
                $table->dropIndex('idx_kafalas_email');
            } catch (Exception $e) {
                // Index peut ne pas exister
            }
            
            try {
                $table->dropIndex('idx_kafalas_telephone');
            } catch (Exception $e) {
                // Index peut ne pas exister
            }
            
            try {
                $table->dropIndex('idx_kafalas_sexe_enfant');
            } catch (Exception $e) {
                // Index peut ne pas exister
            }
            
            try {
                $table->dropIndex('idx_kafalas_deleted_created');
            } catch (Exception $e) {
                // Index peut ne pas exister
            }
        });
    }
};