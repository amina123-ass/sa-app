<?php
// app/Services/ImportBeneficiairesService.php
namespace App\Services;

use App\Imports\BeneficiairesImport;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Exception;

class ImportBeneficiairesService
{
    /**
     * Valider un fichier d'import (dry run)
     */
    public function validateFile(UploadedFile $file, int $campagneId): array
    {
        try {
            // Vérifications préliminaires du fichier
            $fileValidation = $this->validateUploadedFile($file);
            if (!$fileValidation['valid']) {
                return $fileValidation;
            }

            // Créer une copie temporaire pour la validation
            $tempPath = $file->store('temp_validation', 'local');
            $fullPath = Storage::path($tempPath);

            try {
                // Validation en mode dry run
                $import = new BeneficiairesImport($campagneId, true);
                Excel::import($import, $fullPath);

                $result = [
                    'valid' => $import->getErrorsCount() === 0,
                    'summary' => $import->getImportSummary(),
                    'errors' => $import->getErrors(),
                    'warnings' => $import->getWarnings(),
                    'can_import' => $import->getErrorsCount() === 0,
                    'file_info' => [
                        'name' => $file->getClientOriginalName(),
                        'size' => $file->getSize(),
                        'type' => $file->getMimeType()
                    ]
                ];

                return $result;

            } finally {
                // Nettoyer le fichier temporaire
                Storage::delete($tempPath);
            }

        } catch (Exception $e) {
            Log::error('Erreur validation fichier import', [
                'error' => $e->getMessage(),
                'campagne_id' => $campagneId,
                'file' => $file->getClientOriginalName()
            ]);

            return [
                'valid' => false,
                'errors' => [['ligne' => 0, 'erreurs' => [$e->getMessage()]]],
                'message' => 'Erreur lors de la validation: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Importer un fichier (import réel)
     */
    public function importFile(UploadedFile $file, int $campagneId, array $options = []): array
    {
        try {
            // Vérifications préliminaires
            $fileValidation = $this->validateUploadedFile($file);
            if (!$fileValidation['valid']) {
                return $fileValidation;
            }

            // Étape 1: Validation préalable (dry run)
            Log::info('Démarrage import - Étape 1: Validation', [
                'campagne_id' => $campagneId,
                'file' => $file->getClientOriginalName()
            ]);

            $validationResult = $this->validateFile($file, $campagneId);
            if (!$validationResult['valid']) {
                return [
                    'success' => false,
                    'phase' => 'validation_failed',
                    'message' => 'Le fichier contient des erreurs et ne peut pas être importé',
                    'errors' => $validationResult['errors'],
                    'warnings' => $validationResult['warnings'] ?? []
                ];
            }

            // Étape 2: Import réel
            Log::info('Import - Étape 2: Import réel', [
                'campagne_id' => $campagneId,
                'validated_rows' => $validationResult['summary']['statistiques']['total_lignes']
            ]);

            $tempPath = $file->store('temp_import', 'local');
            $fullPath = Storage::path($tempPath);

            try {
                DB::beginTransaction();

                $import = new BeneficiairesImport($campagneId, false);
                Excel::import($import, $fullPath);

                if ($import->getErrorsCount() > 0) {
                    DB::rollBack();
                    return [
                        'success' => false,
                        'phase' => 'import_failed',
                        'message' => 'Erreurs détectées lors de l\'import',
                        'errors' => $import->getErrors(),
                        'warnings' => $import->getWarnings()
                    ];
                }

                DB::commit();

                // Mettre à jour les statistiques de la campagne
                $this->updateCampaignStats($campagneId);

                $finalSummary = $import->getImportSummary();

                Log::info('Import terminé avec succès', [
                    'campagne_id' => $campagneId,
                    'imported_count' => $import->getImportedCount(),
                    'total_rows' => $import->getTotalRows()
                ]);

                return [
                    'success' => true,
                    'phase' => 'import_completed',
                    'message' => "Import terminé: {$import->getImportedCount()} bénéficiaires importés",
                    'summary' => $finalSummary,
                    'warnings' => $import->getWarnings(),
                    'statistics' => [
                        'imported' => $import->getImportedCount(),
                        'total_rows' => $import->getTotalRows(),
                        'errors' => $import->getErrorsCount(),
                        'warnings' => count($import->getWarnings())
                    ]
                ];

            } finally {
                Storage::delete($tempPath);
            }

        } catch (Exception $e) {
            if (isset($tempPath)) {
                Storage::delete($tempPath);
            }

            DB::rollBack();

            Log::error('Erreur fatale import', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'campagne_id' => $campagneId
            ]);

            return [
                'success' => false,
                'phase' => 'fatal_error',
                'message' => 'Erreur fatale lors de l\'import: ' . $e->getMessage(),
                'error_type' => get_class($e)
            ];
        }
    }

    /**
     * Valider le fichier uploadé
     */
    private function validateUploadedFile(UploadedFile $file): array
    {
        $errors = [];

        // Vérifier que le fichier est valide
        if (!$file->isValid()) {
            $errors[] = 'Le fichier uploadé est corrompu ou invalide';
        }

        // Vérifier la taille (max 10MB)
        if ($file->getSize() > 10 * 1024 * 1024) {
            $errors[] = 'Le fichier est trop volumineux (max 10MB)';
        }

        // Vérifier le type MIME
        $allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'application/vnd.ms-excel', // xls
            'text/csv', // csv
            'application/csv'
        ];

        if (!in_array($file->getMimeType(), $allowedTypes)) {
            $errors[] = 'Type de fichier non supporté. Utilisez Excel (.xlsx, .xls) ou CSV';
        }

        // Vérifier l'extension
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, ['xlsx', 'xls', 'csv'])) {
            $errors[] = 'Extension de fichier non supportée';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'file_info' => [
                'name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'type' => $file->getMimeType(),
                'extension' => $extension
            ]
        ];
    }

    /**
     * Mettre à jour les statistiques de la campagne
     */
    private function updateCampaignStats(int $campagneId): void
    {
        try {
            $stats = DB::table('beneficiaires')
                ->where('campagne_id', $campagneId)
                ->whereNull('date_suppression')
                ->selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN sexe = "M" THEN 1 ELSE 0 END) as hommes,
                    SUM(CASE WHEN sexe = "F" THEN 1 ELSE 0 END) as femmes,
                    SUM(CASE WHEN a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie
                ')
                ->first();

            DB::table('campagnes_medicales')
                ->where('id', $campagneId)
                ->update([
                    'nombre_participants_prevu' => $stats->total,
                    'updated_at' => now()
                ]);

            Log::info('Statistiques campagne mises à jour', [
                'campagne_id' => $campagneId,
                'total_beneficiaires' => $stats->total
            ]);

        } catch (Exception $e) {
            Log::warning('Erreur mise à jour stats campagne', [
                'campagne_id' => $campagneId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Obtenir le template d'import pour une campagne
     */
    public function getImportTemplate(int $campagneId): array
    {
        try {
            $campagne = DB::table('campagnes_medicales')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select(
                    'campagnes_medicales.*',
                    'types_assistance.libelle as type_assistance'
                )
                ->where('campagnes_medicales.id', $campagneId)
                ->whereNull('campagnes_medicales.date_suppression')
                ->first();

            if (!$campagne) {
                throw new Exception('Campagne non trouvée');
            }

            $typeLibelle = strtolower($campagne->type_assistance ?? '');

            // Headers de base obligatoires
            $headers = [
                'nom' => 'Nom du bénéficiaire (obligatoire)',
                'prenom' => 'Prénom du bénéficiaire (obligatoire)',
                'sexe' => 'M ou F (obligatoire)',
                'date_naissance' => 'Format: YYYY-MM-DD ou DD/MM/YYYY (recommandé)',
                'telephone' => 'Numéro de téléphone marocain (obligatoire)',
                'adresse' => 'Adresse complète (obligatoire)',
                'email' => 'Adresse email (optionnel)',
                'cin' => 'Numéro CIN (optionnel)',
                'commentaire' => 'Observations (optionnel)'
            ];

            // Headers spécifiques selon le type d'assistance
            if (strpos($typeLibelle, 'lunette') !== false) {
                $headers['enfants_scolarises'] = 'oui/non (obligatoire pour les moins de 18 ans)';
            }

            if (strpos($typeLibelle, 'auditif') !== false) {
                $headers['cote'] = 'unilatéral/bilatéral (obligatoire)';
                $headers['enfants_scolarises'] = 'oui/non (obligatoire pour les moins de 18 ans)';
                $headers['lateralite'] = 'Unilatérale/Bilatérale (optionnel)';
            }

            // Header pour décision
            $headers['decision'] = 'accepté/en_attente/refusé/admin a list principal/admin a list d\'attente (optionnel)';

            // Exemple de données
            $exemple = BeneficiairesImport::getExampleTemplate($campagne->type_assistance ?? '');

            return [
                'campagne' => [
                    'id' => $campagne->id,
                    'nom' => $campagne->nom,
                    'type_assistance' => $campagne->type_assistance
                ],
                'headers' => $headers,
                'exemple' => $exemple,
                'regles' => $this->getValidationRules($typeLibelle),
                'formats_acceptes' => ['xlsx', 'xls', 'csv'],
                'taille_max' => '10MB'
            ];

        } catch (Exception $e) {
            Log::error('Erreur génération template', [
                'campagne_id' => $campagneId,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Obtenir les règles de validation pour un type d'assistance
     */
    private function getValidationRules(string $typeLibelle): array
    {
        $rules = [
            'Le fichier doit être au format Excel (.xlsx, .xls) ou CSV',
            'Taille maximale: 10MB',
            'Les colonnes obligatoires: nom, prenom, sexe, telephone, adresse',
            'Format des dates: YYYY-MM-DD ou DD/MM/YYYY',
            'Format du sexe: M ou F (ou Masculin/Féminin)',
            'Les numéros de téléphone doivent être au format marocain valide'
        ];

        if (strpos($typeLibelle, 'lunette') !== false) {
            $rules[] = 'Pour les lunettes: le champ "enfants_scolarises" est obligatoire pour les bénéficiaires de moins de 18 ans';
        }

        if (strpos($typeLibelle, 'auditif') !== false) {
            $rules[] = 'Pour les appareils auditifs: le champ "cote" est obligatoire (unilatéral ou bilatéral)';
            $rules[] = 'Pour les appareils auditifs: le champ "enfants_scolarises" est obligatoire pour les bénéficiaires de moins de 18 ans';
        }

        $rules[] = 'Le champ "decision" est optionnel. Valeurs acceptées: accepté, en_attente, refusé, admin a list principal, admin a list d\'attente';

        return $rules;
    }

    /**
     * Diagnostiquer les problèmes d'import
     */
    public function diagnoseImportIssues(int $campagneId): array
    {
        try {
            $campagne = DB::table('campagnes_medicales')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->where('campagnes_medicales.id', $campagneId)
                ->first();

            if (!$campagne) {
                return [
                    'status' => 'error',
                    'message' => 'Campagne non trouvée'
                ];
            }

            // Statistiques des bénéficiaires
            $beneficiairesStats = DB::table('beneficiaires')
                ->where('campagne_id', $campagneId)
                ->selectRaw('
                    COUNT(*) as total,
                    COUNT(CASE WHEN date_suppression IS NULL THEN 1 END) as actifs,
                    COUNT(CASE WHEN date_suppression IS NOT NULL THEN 1 END) as supprimes,
                    MAX(created_at) as dernier_import,
                    MIN(created_at) as premier_import
                ')
                ->first();

            // Vérifications système
            $systemChecks = [
                'table_beneficiaires' => $this->checkTable('beneficiaires'),
                'table_campagnes' => $this->checkTable('campagnes_medicales'),
                'table_types_assistance' => $this->checkTable('types_assistance'),
                'excel_package' => class_exists('\Maatwebsite\Excel\Facades\Excel'),
                'storage_writable' => is_writable(storage_path('app')),
                'temp_directory' => is_dir(storage_path('app/temp_imports')) || mkdir(storage_path('app/temp_imports'), 0755, true)
            ];

            // Derniers bénéficiaires créés
            $derniersBeneficiaires = DB::table('beneficiaires')
                ->where('campagne_id', $campagneId)
                ->whereNull('date_suppression')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(['id', 'nom', 'prenom', 'telephone', 'created_at']);

            return [
                'status' => 'success',
                'campagne' => $campagne,
                'beneficiaires_stats' => $beneficiairesStats,
                'derniers_beneficiaires' => $derniersBeneficiaires,
                'system_checks' => $systemChecks,
                'all_systems_ok' => !in_array(false, $systemChecks),
                'timestamp' => now()->format('Y-m-d H:i:s')
            ];

        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Erreur lors du diagnostic: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Vérifier l'existence d'une table
     */
    private function checkTable(string $tableName): bool
    {
        try {
            DB::table($tableName)->limit(1)->get();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Nettoyer les fichiers temporaires anciens
     */
    public function cleanupTempFiles(): array
    {
        try {
            $tempDirs = ['temp_validation', 'temp_import', 'temp_imports'];
            $cleanedFiles = 0;
            $totalSize = 0;

            foreach ($tempDirs as $dir) {
                $files = Storage::files($dir);
                
                foreach ($files as $file) {
                    $lastModified = Storage::lastModified($file);
                    
                    // Supprimer les fichiers de plus de 1 heure
                    if (time() - $lastModified > 3600) {
                        $size = Storage::size($file);
                        Storage::delete($file);
                        $cleanedFiles++;
                        $totalSize += $size;
                    }
                }
            }

            return [
                'success' => true,
                'cleaned_files' => $cleanedFiles,
                'total_size_cleaned' => $this->formatBytes($totalSize),
                'message' => "Nettoyage terminé: {$cleanedFiles} fichiers supprimés"
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Erreur lors du nettoyage: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Formater la taille en bytes
     */
    private function formatBytes(int $size): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $unit = 0;
        
        while ($size >= 1024 && $unit < count($units) - 1) {
            $size /= 1024;
            $unit++;
        }
        
        return round($size, 2) . ' ' . $units[$unit];
    }

    /**
     * Créer un fichier d'exemple téléchargeable
     */
    public function generateExampleFile(int $campagneId, string $format = 'xlsx'): array
    {
        try {
            $template = $this->getImportTemplate($campagneId);
            
            // Créer les données d'exemple
            $headers = array_keys($template['headers']);
            $exampleData = [$template['exemple']];
            
            // Ajouter quelques lignes d'exemple supplémentaires
            $additionalExamples = $this->generateAdditionalExamples($template['campagne']['type_assistance'] ?? '');
            $exampleData = array_merge($exampleData, $additionalExamples);
            
            $filename = "template_import_campagne_{$campagneId}_" . date('Y-m-d_H-i-s') . ".{$format}";
            $path = storage_path("app/public/templates/{$filename}");
            
            // Créer le répertoire si nécessaire
            if (!is_dir(dirname($path))) {
                mkdir(dirname($path), 0755, true);
            }
            
            // Générer le fichier selon le format
            if ($format === 'csv') {
                $this->generateCsvFile($path, $headers, $exampleData);
            } else {
                $this->generateExcelFile($path, $headers, $exampleData, $template);
            }
            
            return [
                'success' => true,
                'filename' => $filename,
                'path' => $path,
                'download_url' => "/storage/templates/{$filename}",
                'size' => filesize($path)
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Erreur lors de la génération du fichier: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Générer des exemples additionnels
     */
    private function generateAdditionalExamples(string $typeAssistance): array
    {
        $examples = [
            [
                'nom' => 'Alaoui',
                'prenom' => 'Mohammed',
                'sexe' => 'M',
                'date_naissance' => '1985-12-03',
                'telephone' => '0687654321',
                'email' => 'mohammed.alaoui@email.com',
                'adresse' => '456 Avenue Hassan II, Rabat',
                'cin' => 'CD789012'
            ],
            [
                'nom' => 'Tazi',
                'prenom' => 'Aicha',
                'sexe' => 'F',
                'date_naissance' => '2008-08-20',
                'telephone' => '0634567890',
                'email' => '',
                'adresse' => '789 Rue Allal Ben Abdellah, Fès',
                'cin' => ''
            ]
        ];

        $typeLibelle = strtolower($typeAssistance);
        
        foreach ($examples as &$example) {
            if (strpos($typeLibelle, 'lunette') !== false) {
                $age = \Carbon\Carbon::now()->diffInYears(\Carbon\Carbon::parse($example['date_naissance']));
                $example['enfants_scolarises'] = $age < 18 ? 'oui' : '';
                $example['decision'] = $age < 18 ? 'accepté' : 'en_attente';
            }
            
            if (strpos($typeLibelle, 'auditif') !== false) {
                $example['cote'] = 'unilatéral';
                $age = \Carbon\Carbon::now()->diffInYears(\Carbon\Carbon::parse($example['date_naissance']));
                $example['enfants_scolarises'] = $age < 18 ? 'oui' : '';
                $example['decision'] = 'admin a list principal';
            }
        }

        return $examples;
    }

    /**
     * Générer un fichier CSV
     */
    private function generateCsvFile(string $path, array $headers, array $data): void
    {
        $file = fopen($path, 'w');
        
        // Ajouter le BOM UTF-8 pour Excel
        fwrite($file, "\xEF\xBB\xBF");
        
        // Headers
        fputcsv($file, $headers, ';');
        
        // Données
        foreach ($data as $row) {
            $csvRow = [];
            foreach ($headers as $header) {
                $csvRow[] = $row[$header] ?? '';
            }
            fputcsv($file, $csvRow, ';');
        }
        
        fclose($file);
    }

    /**
     * Générer un fichier Excel
     */
    private function generateExcelFile(string $path, array $headers, array $data, array $template): void
    {
        // Utiliser PhpSpreadsheet pour créer un fichier Excel plus riche
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $worksheet = $spreadsheet->getActiveSheet();
        
        // Configuration de la feuille
        $worksheet->setTitle('Template Import');
        
        // Headers avec style
        $col = 1;
        foreach ($headers as $header) {
            $cell = $worksheet->getCellByColumnAndRow($col, 1);
            $cell->setValue($header);
            
            // Style pour les headers
            $cell->getStyle()->getFont()->setBold(true);
            $cell->getStyle()->getFill()
                 ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                 ->getStartColor()->setARGB('FFCCCCCC');
            
            $col++;
        }
        
        // Données d'exemple
        $row = 2;
        foreach ($data as $dataRow) {
            $col = 1;
            foreach ($headers as $header) {
                $worksheet->getCellByColumnAndRow($col, $row)->setValue($dataRow[$header] ?? '');
                $col++;
            }
            $row++;
        }
        
        // Ajuster la largeur des colonnes
        foreach (range(1, count($headers)) as $col) {
            $worksheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }
        
        // Ajouter une feuille avec les instructions
        $instructionsSheet = $spreadsheet->createSheet();
        $instructionsSheet->setTitle('Instructions');
        
        $instructionsSheet->setCellValue('A1', 'Instructions d\'import');
        $instructionsSheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        
        $row = 3;
        foreach ($template['regles'] as $regle) {
            $instructionsSheet->setCellValue('A' . $row, '• ' . $regle);
            $row++;
        }
        
        // Sauvegarder
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save($path);
    }
}