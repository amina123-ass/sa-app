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
        try {
            // Méthode 1: Supprimer la contrainte unique par son nom
            DB::statement('ALTER TABLE beneficiaires DROP INDEX unique_telephone_beneficiaire');
            
            echo "✅ Contrainte unique 'unique_telephone_beneficiaire' supprimée avec succès\n";
        } catch (Exception $e) {
            echo "⚠️ Méthode 1 échouée: " . $e->getMessage() . "\n";
            
            try {
                // Méthode 2: Supprimer toutes les contraintes uniques sur telephone
                $indexes = DB::select("SHOW INDEX FROM beneficiaires WHERE Column_name = 'telephone' AND Non_unique = 0");
                
                foreach ($indexes as $index) {
                    if ($index->Key_name !== 'PRIMARY') {
                        DB::statement("ALTER TABLE beneficiaires DROP INDEX {$index->Key_name}");
                        echo "✅ Index unique '{$index->Key_name}' supprimé\n";
                    }
                }
            } catch (Exception $e2) {
                echo "⚠️ Méthode 2 échouée: " . $e2->getMessage() . "\n";
                
                try {
                    // Méthode 3: Recréer la colonne sans contrainte unique
                    Schema::table('beneficiaires', function (Blueprint $table) {
                        $table->dropIndex(['telephone']); // Tentative de suppression générique
                    });
                } catch (Exception $e3) {
                    echo "⚠️ Méthode 3 échouée: " . $e3->getMessage() . "\n";
                    
                    // Méthode 4: Solution manuelle avec information
                    echo "📋 SOLUTION MANUELLE REQUISE:\n";
                    echo "Exécutez cette commande SQL directement dans votre base de données:\n";
                    echo "ALTER TABLE beneficiaires DROP INDEX unique_telephone_beneficiaire;\n";
                    echo "OU trouvez le nom exact de l'index avec:\n";
                    echo "SHOW INDEX FROM beneficiaires WHERE Column_name = 'telephone';\n";
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optionnellement, recréer la contrainte unique
        // Schema::table('beneficiaires', function (Blueprint $table) {
        //     $table->unique('telephone', 'unique_telephone_beneficiaire');
        // });
    }
};