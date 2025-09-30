<?php

/**
 * Commande Artisan pour corriger les données des kafalas
 * Créer ce fichier : app/Console/Commands/FixKafalasData.php
 */

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FixKafalasData extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'kafalas:fix {--dry-run : Afficher les changements sans les appliquer}';

    /**
     * The console command description.
     */
    protected $description = 'Corriger les données des kafalas (références manquantes, champs NULL, etc.)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        if ($dryRun) {
            $this->info('🔍 Mode DRY-RUN activé - Aucun changement ne sera appliqué');
        }
        
        $this->info('🚀 Début de la correction des données kafalas...');
        
        // 1. Corriger les références manquantes
        $this->fixMissingReferences($dryRun);
        
        // 2. Nettoyer les champs vides
        $this->cleanEmptyFields($dryRun);
        
        // 3. Valider les données
        $this->validateData($dryRun);
        
        $this->info('✅ Correction terminée !');
    }
    
    /**
     * Corriger les références manquantes
     */
    private function fixMissingReferences($dryRun = false)
    {
        $this->info('📝 Correction des références manquantes...');
        
        $kafalasWithoutRef = DB::table('kafalas')
            ->where(function($query) {
                $query->whereNull('reference')
                      ->orWhere('reference', '')
                      ->orWhere('reference', 'NULL');
            })
            ->get();
        
        if ($kafalasWithoutRef->count() === 0) {
            $this->info('✅ Aucune référence manquante trouvée');
            return;
        }
        
        $this->info("🔍 {$kafalasWithoutRef->count()} kafalas sans référence trouvées");
        
        foreach ($kafalasWithoutRef as $kafala) {
            $reference = $this->generateUniqueReference($kafala->id, $kafala->created_at);
            
            $this->line("  • Kafala ID {$kafala->id} -> Référence: {$reference}");
            
            if (!$dryRun) {
                DB::table('kafalas')
                    ->where('id', $kafala->id)
                    ->update(['reference' => $reference]);
            }
        }
        
        if (!$dryRun) {
            $this->info("✅ {$kafalasWithoutRef->count()} références générées");
        }
    }
    
    /**
     * Nettoyer les champs vides
     */
    private function cleanEmptyFields($dryRun = false)
    {
        $this->info('🧹 Nettoyage des champs vides...');
        
        $fieldsToClean = [
            'cin_pere', 'cin_mere', 'cin_enfant', 
            'email', 'commentaires'
        ];
        
        foreach ($fieldsToClean as $field) {
            $count = DB::table('kafalas')
                ->where($field, '')
                ->count();
                
            if ($count > 0) {
                $this->line("  • {$count} enregistrements avec {$field} vide");
                
                if (!$dryRun) {
                    DB::table('kafalas')
                        ->where($field, '')
                        ->update([$field => null]);
                }
            }
        }
        
        if (!$dryRun) {
            $this->info('✅ Nettoyage terminé');
        }
    }
    
    /**
     * Valider les données
     */
    private function validateData($dryRun = false)
    {
        $this->info('🔍 Validation des données...');
        
        // Vérifier les champs requis
        $requiredFields = [
            'nom_pere', 'prenom_pere', 'nom_mere', 'prenom_mere',
            'telephone', 'adresse', 'nom_enfant', 'prenom_enfant', 
            'sexe_enfant', 'reference'
        ];
        
        $issues = [];
        
        foreach ($requiredFields as $field) {
            $count = DB::table('kafalas')
                ->where(function($query) use ($field) {
                    $query->whereNull($field)
                          ->orWhere($field, '')
                          ->orWhere($field, 'NULL');
                })
                ->whereNull('date_suppression')
                ->count();
                
            if ($count > 0) {
                $issues[] = "{$count} kafalas avec {$field} manquant";
                $this->error("  ❌ {$count} kafalas avec {$field} manquant");
            }
        }
        
        // Vérifier les emails
        $invalidEmails = DB::table('kafalas')
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->whereRaw("email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'")
            ->count();
            
        if ($invalidEmails > 0) {
            $issues[] = "{$invalidEmails} emails invalides";
            $this->error("  ❌ {$invalidEmails} emails invalides");
        }
        
        // Vérifier les sexes
        $invalidSexes = DB::table('kafalas')
            ->whereNotIn('sexe_enfant', ['M', 'F'])
            ->whereNull('date_suppression')
            ->count();
            
        if ($invalidSexes > 0) {
            $issues[] = "{$invalidSexes} sexes d'enfants invalides";
            $this->error("  ❌ {$invalidSexes} sexes d'enfants invalides");
        }
        
        // Vérifier les dates
        $invalidDates = DB::table('kafalas')
            ->where(function($query) {
                $query->where('date_mariage', '0000-00-00')
                      ->orWhere('date_naissance_enfant', '0000-00-00');
            })
            ->count();
            
        if ($invalidDates > 0) {
            $issues[] = "{$invalidDates} dates invalides";
            $this->error("  ❌ {$invalidDates} dates invalides");
            
            if (!$dryRun) {
                // Corriger les dates invalides
                DB::table('kafalas')
                    ->where('date_mariage', '0000-00-00')
                    ->update(['date_mariage' => null]);
                    
                DB::table('kafalas')
                    ->where('date_naissance_enfant', '0000-00-00')
                    ->update(['date_naissance_enfant' => null]);
                    
                $this->info("✅ Dates invalides corrigées");
            }
        }
        
        // Vérifier les références dupliquées
        $duplicateRefs = DB::table('kafalas')
            ->select('reference')
            ->groupBy('reference')
            ->havingRaw('COUNT(*) > 1')
            ->get();
            
        if ($duplicateRefs->count() > 0) {
            $issues[] = "{$duplicateRefs->count()} références dupliquées";
            $this->error("  ❌ {$duplicateRefs->count()} références dupliquées");
            
            if (!$dryRun) {
                // Corriger les références dupliquées
                foreach ($duplicateRefs as $dup) {
                    $duplicates = DB::table('kafalas')
                        ->where('reference', $dup->reference)
                        ->orderBy('id')
                        ->get();
                        
                    // Garder le premier, modifier les autres
                    foreach ($duplicates->skip(1) as $index => $duplicate) {
                        $newRef = $dup->reference . '-' . str_pad($index + 2, 2, '0', STR_PAD_LEFT);
                        DB::table('kafalas')
                            ->where('id', $duplicate->id)
                            ->update(['reference' => $newRef]);
                            
                        $this->line("  • Kafala ID {$duplicate->id}: {$dup->reference} -> {$newRef}");
                    }
                }
                $this->info("✅ Références dupliquées corrigées");
            }
        }
        
        if (empty($issues)) {
            $this->info('✅ Toutes les données sont valides');
        } else {
            $this->warn('⚠️ Issues trouvées: ' . implode(', ', $issues));
        }
    }
    
    /**
     * Générer une référence unique
     */
    private function generateUniqueReference($kafalaId, $createdAt)
    {
        $date = $createdAt ? date('Ym', strtotime($createdAt)) : date('Ym');
        $sequence = str_pad($kafalaId, 4, '0', STR_PAD_LEFT);
        $reference = "KAF-{$date}-{$sequence}";
        
        // Vérifier l'unicité
        $attempts = 0;
        $originalReference = $reference;
        
        while (DB::table('kafalas')->where('reference', $reference)->exists() && $attempts < 100) {
            $attempts++;
            $reference = $originalReference . '-' . str_pad($attempts, 2, '0', STR_PAD_LEFT);
        }
        
        return $reference;
    }
}