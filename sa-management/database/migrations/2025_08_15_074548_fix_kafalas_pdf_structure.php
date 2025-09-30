<?php
// database/migrations/xxxx_xx_xx_xxxxxx_fix_kafalas_pdf_structure.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Option 1: Garder le BLOB mais ajouter des métadonnées
        Schema::table('kafalas', function (Blueprint $table) {
            // Ajouter des colonnes pour améliorer la gestion des PDFs BLOB
            $table->string('fichier_pdf_nom')->nullable()->after('fichier_pdf');
            $table->integer('fichier_pdf_taille')->nullable()->after('fichier_pdf_nom');
            $table->string('fichier_pdf_type')->default('application/pdf')->after('fichier_pdf_taille');
            $table->timestamp('fichier_pdf_uploaded_at')->nullable()->after('fichier_pdf_type');
        });

        // Mettre à jour les enregistrements existants avec les métadonnées
        $this->updateExistingRecords();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kafalas', function (Blueprint $table) {
            $table->dropColumn([
                'fichier_pdf_nom',
                'fichier_pdf_taille',
                'fichier_pdf_type',
                'fichier_pdf_uploaded_at'
            ]);
        });
    }

    /**
     * Mettre à jour les enregistrements existants
     */
    private function updateExistingRecords(): void
    {
        try {
            Log::info('🔄 Début mise à jour métadonnées PDF BLOB');

            // Récupérer toutes les kafalas avec des PDFs
            $kafalas = DB::table('kafalas')
                ->whereNotNull('fichier_pdf')
                ->where(DB::raw('LENGTH(fichier_pdf)'), '>', 0)
                ->select('id', 'reference', 'created_at')
                ->get();

            $updated = 0;
            foreach ($kafalas as $kafala) {
                // Calculer la taille du BLOB
                $sizeResult = DB::table('kafalas')
                    ->where('id', $kafala->id)
                    ->select(DB::raw('LENGTH(fichier_pdf) as pdf_size'))
                    ->first();

                if ($sizeResult && $sizeResult->pdf_size > 0) {
                    // Mettre à jour avec les métadonnées
                    DB::table('kafalas')
                        ->where('id', $kafala->id)
                        ->update([
                            'fichier_pdf_nom' => 'kafala_' . ($kafala->reference ?: $kafala->id) . '.pdf',
                            'fichier_pdf_taille' => $sizeResult->pdf_size,
                            'fichier_pdf_type' => 'application/pdf',
                            'fichier_pdf_uploaded_at' => $kafala->created_at
                        ]);

                    $updated++;
                }
            }

            Log::info("✅ Mise à jour terminée: {$updated} kafalas mises à jour");

        } catch (\Exception $e) {
            Log::error('❌ Erreur mise à jour métadonnées PDF BLOB', [
                'error' => $e->getMessage()
            ]);
        }
    }
};

// ============================================================
// ALTERNATIVE: Migration pour passer de BLOB à système de fichiers
// ============================================================

/*
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    public function up(): void
    {
        // Étape 1: Créer le répertoire de stockage
        if (!Storage::disk('public')->exists('kafalas')) {
            Storage::disk('public')->makeDirectory('kafalas');
        }

        // Étape 2: Ajouter la nouvelle colonne pour le chemin du fichier
        Schema::table('kafalas', function (Blueprint $table) {
            $table->string('fichier_pdf_path')->nullable()->after('fichier_pdf');
        });

        // Étape 3: Migrer les BLOBs vers des fichiers
        $this->migrateBlobsToFiles();

        // Étape 4: Supprimer l'ancienne colonne BLOB (optionnel - à faire plus tard)
        // Schema::table('kafalas', function (Blueprint $table) {
        //     $table->dropColumn('fichier_pdf');
        // });
        
        // Étape 5: Renommer la nouvelle colonne (optionnel)
        // Schema::table('kafalas', function (Blueprint $table) {
        //     $table->renameColumn('fichier_pdf_path', 'fichier_pdf');
        // });
    }

    public function down(): void
    {
        Schema::table('kafalas', function (Blueprint $table) {
            $table->dropColumn('fichier_pdf_path');
        });
    }

    private function migrateBlobsToFiles(): void
    {
        try {
            Log::info('🔄 Début migration BLOB vers fichiers');

            $kafalas = DB::table('kafalas')
                ->whereNotNull('fichier_pdf')
                ->where(DB::raw('LENGTH(fichier_pdf)'), '>', 0)
                ->select('id', 'reference', 'fichier_pdf')
                ->get();

            $migrated = 0;
            foreach ($kafalas as $kafala) {
                try {
                    // Générer le nom du fichier
                    $fileName = 'kafala_' . ($kafala->reference ?: $kafala->id) . '_' . time() . '.pdf';
                    $filePath = 'kafalas/' . $fileName;

                    // Sauvegarder le BLOB en tant que fichier
                    if (Storage::disk('public')->put($filePath, $kafala->fichier_pdf)) {
                        // Mettre à jour le chemin dans la base
                        DB::table('kafalas')
                            ->where('id', $kafala->id)
                            ->update(['fichier_pdf_path' => $filePath]);

                        $migrated++;
                        Log::info("✅ Kafala {$kafala->id} migrée: {$filePath}");
                    }

                } catch (\Exception $e) {
                    Log::error("❌ Erreur migration kafala {$kafala->id}", [
                        'error' => $e->getMessage()
                    ]);
                }
            }

            Log::info("✅ Migration terminée: {$migrated} fichiers migrés");

        } catch (\Exception $e) {
            Log::error('❌ Erreur migration BLOB vers fichiers', [
                'error' => $e->getMessage()
            ]);
        }
    }
};
*/
