<?php
// database/migrations/2024_01_XX_add_appareillage_columns_to_assistance_medicales.php
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
        Schema::table('assistance_medicales', function (Blueprint $table) {
            // Vérifier si les colonnes n'existent pas déjà avant de les ajouter
            
            // Personne qui a réalisé l'assistance
            if (!Schema::hasColumn('assistance_medicales', 'realisee_par')) {
                $table->string('realisee_par')->nullable()->comment('Nom de la personne qui a réalisé l\'assistance');
            }
            
            // Détails spécifiques du type d'assistance (ne pas ajouter si existe déjà)
            if (!Schema::hasColumn('assistance_medicales', 'details_type_assistance_id')) {
                $table->foreignId('details_type_assistance_id')
                    ->nullable()
                    ->constrained('details_type_assistances')
                    ->onDelete('set null')
                    ->comment('Détails spécifiques du type d\'assistance');
            }
            
            // Colonnes pour la gestion des appareillages orthopédiques
            if (!Schema::hasColumn('assistance_medicales', 'duree_utilisation')) {
                $table->integer('duree_utilisation')
                    ->nullable()
                    ->comment('Durée d\'utilisation prévue en jours (pour les prêts temporaires)');
            }
            
            if (!Schema::hasColumn('assistance_medicales', 'retour_effectue')) {
                $table->boolean('retour_effectue')
                    ->default(false)
                    ->comment('Indique si le matériel a été retourné');
            }
            
            if (!Schema::hasColumn('assistance_medicales', 'date_retour')) {
                $table->date('date_retour')
                    ->nullable()
                    ->comment('Date effective de retour du matériel');
            }
            
            if (!Schema::hasColumn('assistance_medicales', 'observation_retour')) {
                $table->text('observation_retour')
                    ->nullable()
                    ->comment('Observations sur l\'état du matériel au retour');
            }
            
            // Date de fin prévue (calculée automatiquement)
            if (!Schema::hasColumn('assistance_medicales', 'date_fin_prevue')) {
                $table->date('date_fin_prevue')
                    ->nullable()
                    ->comment('Date de fin prévue calculée (date_assistance + duree_utilisation)');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assistance_medicales', function (Blueprint $table) {
            // Supprimer la contrainte de clé étrangère en premier si elle existe
            if (Schema::hasColumn('assistance_medicales', 'details_type_assistance_id')) {
                $table->dropForeign(['details_type_assistance_id']);
            }
            
            // Supprimer les colonnes si elles existent
            $columnsToCheck = [
                'realisee_par',
                'details_type_assistance_id',
                'duree_utilisation',
                'retour_effectue',
                'date_retour',
                'observation_retour',
                'date_fin_prevue'
            ];
            
            foreach ($columnsToCheck as $column) {
                if (Schema::hasColumn('assistance_medicales', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};