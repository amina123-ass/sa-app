<?php

namespace App\Imports;

use App\Models\Beneficiaire;
use App\Models\CampagneMedicale;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Carbon\Carbon;

class BeneficiairesImport implements ToCollection, WithHeadingRow
{
    private $campagneId;
    private $dryRun;
    private $options;
    
    // Statistiques d'import
    private $totalRows = 0;
    private $importedCount = 0;
    private $skippedCount = 0;
    private $errorCount = 0;
    private $errors = [];
    private $warnings = [];
    private $processedData = [];

    public function __construct($campagneId, $dryRun = false, $options = [])
    {
        $this->campagneId = $campagneId;
        $this->dryRun = $dryRun;
        $this->options = array_merge([
            'ignore_doublons' => true,
            'validate_campagne' => true
        ], $options);
        
        Log::info('🚀 BeneficiairesImport initialisé', [
            'campagne_id' => $this->campagneId,
            'dry_run' => $this->dryRun,
            'options' => $this->options
        ]);
    }

    /**
     * ✅ TRAITEMENT PRINCIPAL DES DONNÉES
     */
    public function collection(Collection $rows)
    {
        Log::info('📊 Début traitement collection', [
            'total_rows' => $rows->count(),
            'dry_run' => $this->dryRun
        ]);

        $this->totalRows = $rows->count();
        
        // Vérifier que la campagne existe
        if ($this->options['validate_campagne']) {
            $campagne = CampagneMedicale::find($this->campagneId);
            if (!$campagne) {
                throw new \Exception("Campagne médicale non trouvée (ID: {$this->campagneId})");
            }
        }

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // +2 car les index commencent à 0 et on a une ligne d'en-tête
            
            try {
                $this->processRow($row->toArray(), $rowNumber);
            } catch (\Exception $e) {
                Log::error("❌ Erreur ligne {$rowNumber}", [
                    'error' => $e->getMessage(),
                    'row_data' => $row->toArray()
                ]);
                
                $this->errorCount++;
                $this->errors[] = [
                    'ligne' => $rowNumber,
                    'erreurs' => [$e->getMessage()],
                    'data' => $row->toArray()
                ];
            }
        }

        Log::info('✅ Traitement collection terminé', [
            'total_rows' => $this->totalRows,
            'imported' => $this->importedCount,
            'skipped' => $this->skippedCount,
            'errors' => $this->errorCount
        ]);
    }

    /**
     * ✅ TRAITEMENT D'UNE LIGNE
     */
    private function processRow(array $row, int $rowNumber)
    {
        // Nettoyer et normaliser les données
        $cleanRow = $this->cleanRowData($row);
        
        // Validation des données
        $validator = $this->validateRowData($cleanRow, $rowNumber);
        
        if ($validator->fails()) {
            $this->errorCount++;
            $this->errors[] = [
                'ligne' => $rowNumber,
                'erreurs' => $validator->errors()->all(),
                'data' => $cleanRow
            ];
            return;
        }

        // Préparer les données pour l'insertion
        $beneficiaireData = $this->prepareBeneficiaireData($cleanRow);
        
        // Vérifier les doublons si activé
        if ($this->options['ignore_doublons'] && $this->checkDuplicate($beneficiaireData['telephone'])) {
            $this->skippedCount++;
            $this->warnings[] = "Ligne {$rowNumber}: Doublons ignoré (téléphone {$beneficiaireData['telephone']} déjà existant)";
            return;
        }

        // Enregistrer ou simuler selon le mode
        if ($this->dryRun) {
            // Mode validation : juste compter
            $this->importedCount++;
            $this->processedData[] = $beneficiaireData;
        } else {
            // Mode réel : créer en base
            try {
                $beneficiaire = Beneficiaire::create($beneficiaireData);
                $this->importedCount++;
                
                Log::debug("✅ Bénéficiaire créé", [
                    'id' => $beneficiaire->id,
                    'nom' => $beneficiaire->nom,
                    'prenom' => $beneficiaire->prenom
                ]);
                
            } catch (\Exception $e) {
                $this->errorCount++;
                $this->errors[] = [
                    'ligne' => $rowNumber,
                    'erreurs' => ["Erreur base de données: {$e->getMessage()}"],
                    'data' => $beneficiaireData
                ];
            }
        }
    }

    /**
     * ✅ NETTOYAGE DES DONNÉES DE LIGNE
     */
    private function cleanRowData(array $row): array
    {
        $cleaned = [];
        
        // Mapping des colonnes avec nettoyage
        $columnMapping = [
            'nom' => ['nom', 'nom_famille', 'last_name', 'famille'],
            'prenom' => ['prenom', 'prénom', 'first_name', 'nom_prenom'],
            'sexe' => ['sexe', 'genre', 'gender', 'sex'],
            'telephone' => ['telephone', 'téléphone', 'phone', 'tel', 'gsm'],
            'adresse' => ['adresse', 'address', 'lieu', 'domicile'],
            'date_naissance' => ['date_naissance', 'naissance', 'birth_date', 'age'],
            'email' => ['email', 'mail', 'e-mail', 'courrier'],
            'cin' => ['cin', 'cni', 'carte_identite', 'id'],
            'commentaire' => ['commentaire', 'comment', 'note', 'observation'],
            'decision' => ['decision', 'décision', 'statut_decision', 'result'],
            'cote' => ['cote', 'côté', 'side', 'lateralite_cote'],
            'lateralite' => ['lateralite', 'latéralité', 'laterality'],
            'enfants_scolarises' => ['enfants_scolarises', 'scolarise', 'school', 'école']
        ];

        foreach ($columnMapping as $standardKey => $variants) {
            $value = null;
            
            // Chercher la valeur dans les variantes possibles
            foreach ($variants as $variant) {
                if (isset($row[$variant]) && !empty(trim($row[$variant]))) {
                    $value = trim($row[$variant]);
                    break;
                }
            }
            
            // Nettoyage spécifique par type
            $cleaned[$standardKey] = $this->cleanFieldValue($standardKey, $value);
        }

        return array_filter($cleaned, function($value) {
            return $value !== null && $value !== '';
        });
    }

    /**
     * ✅ NETTOYAGE D'UNE VALEUR SPÉCIFIQUE
     */
    private function cleanFieldValue(string $field, $value)
    {
        if ($value === null || $value === '') {
            return null;
        }

        $value = trim($value);

        switch ($field) {
            case 'sexe':
                $value = strtoupper($value);
                if (in_array($value, ['HOMME', 'MASCULIN', 'MALE', 'H'])) return 'M';
                if (in_array($value, ['FEMME', 'FÉMININ', 'FEMALE', 'F'])) return 'F';
                return $value;

            case 'telephone':
                // Nettoyer le téléphone (garder seulement les chiffres)
                $value = preg_replace('/[^0-9]/', '', $value);
                // Ajouter +212 si nécessaire pour le Maroc
                if (strlen($value) === 9 && substr($value, 0, 1) === '6') {
                    $value = '0' . $value;
                }
                return $value;

            case 'email':
                return filter_var($value, FILTER_VALIDATE_EMAIL) ? strtolower($value) : null;

            case 'date_naissance':
                return $this->parseDate($value);

            case 'enfants_scolarises':
                $value = strtolower($value);
                if (in_array($value, ['oui', 'yes', '1', 'true', 'vrai'])) return true;
                if (in_array($value, ['non', 'no', '0', 'false', 'faux'])) return false;
                return null;

            case 'decision':
                $value = strtolower($value);
                $decisionMapping = [
                    'accepté' => 'accepte',
                    'accepte' => 'accepte',
                    'accepted' => 'accepte',
                    'en attente' => 'en_attente',
                    'en_attente' => 'en_attente',
                    'pending' => 'en_attente',
                    'refusé' => 'refuse',
                    'refuse' => 'refuse',
                    'refused' => 'refuse',
                    'rejected' => 'refuse'
                ];
                return $decisionMapping[$value] ?? $value;

            case 'cote':
                $value = strtolower($value);
                if (in_array($value, ['unilatéral', 'unilateral', 'uni'])) return 'unilatéral';
                if (in_array($value, ['bilatéral', 'bilateral', 'bi'])) return 'bilatéral';
                return $value;

            default:
                return $value;
        }
    }

    /**
     * ✅ VALIDATION D'UNE LIGNE
     */
    private function validateRowData(array $data, int $rowNumber)
    {
        $rules = [
            'nom' => 'required|string|max:100',
            'prenom' => 'required|string|max:100',
            'sexe' => 'required|in:M,F',
            'telephone' => 'required|string|regex:/^[0-9]{10}$/',
            'adresse' => 'required|string|max:255',
            'email' => 'nullable|email|max:100',
            'date_naissance' => 'nullable|date|before:today',
            'cin' => 'nullable|string|max:20',
            'commentaire' => 'nullable|string|max:500',
            'decision' => 'nullable|in:accepte,en_attente,refuse,preselection_oui,preselection_non',
            'cote' => 'nullable|in:unilatéral,bilatéral',
            'enfants_scolarises' => 'nullable|boolean'
        ];

        $messages = [
            'nom.required' => 'Le nom est obligatoire',
            'prenom.required' => 'Le prénom est obligatoire',
            'sexe.required' => 'Le sexe est obligatoire',
            'sexe.in' => 'Le sexe doit être M ou F',
            'telephone.required' => 'Le téléphone est obligatoire',
            'telephone.regex' => 'Le téléphone doit contenir exactement 10 chiffres',
            'adresse.required' => 'L\'adresse est obligatoire',
            'email.email' => 'L\'email doit être valide',
            'date_naissance.date' => 'La date de naissance doit être une date valide',
            'date_naissance.before' => 'La date de naissance doit être antérieure à aujourd\'hui',
            'decision.in' => 'La décision doit être: accepte, en_attente, refuse, preselection_oui ou preselection_non',
            'cote.in' => 'Le côté doit être: unilatéral ou bilatéral'
        ];

        return Validator::make($data, $rules, $messages);
    }

    /**
     * ✅ PRÉPARATION DES DONNÉES POUR INSERTION
     */
    private function prepareBeneficiaireData(array $cleanData): array
    {
        $data = [
            'nom' => $cleanData['nom'],
            'prenom' => $cleanData['prenom'],
            'sexe' => $cleanData['sexe'],
            'telephone' => $cleanData['telephone'],
            'adresse' => $cleanData['adresse'],
            'campagne_medicale_id' => $this->campagneId,
            'hors_campagne' => false,
            'created_at' => now(),
            'updated_at' => now()
        ];

        // Ajouter les champs optionnels s'ils existent
        $optionalFields = [
            'email', 'date_naissance', 'cin', 'commentaire', 
            'decision', 'cote', 'lateralite', 'enfants_scolarises'
        ];

        foreach ($optionalFields as $field) {
            if (isset($cleanData[$field]) && $cleanData[$field] !== null) {
                $data[$field] = $cleanData[$field];
            }
        }

        return $data;
    }

    /**
     * ✅ VÉRIFICATION DES DOUBLONS
     */
    private function checkDuplicate(string $telephone): bool
    {
        return Beneficiaire::where('telephone', $telephone)->exists();
    }

    /**
     * ✅ PARSING DE DATE FLEXIBLE
     */
    private function parseDate($dateValue)
    {
        if (empty($dateValue)) {
            return null;
        }

        try {
            // Formats de date possibles
            $formats = [
                'Y-m-d',
                'd/m/Y',
                'd-m-Y',
                'm/d/Y',
                'Y/m/d'
            ];

            foreach ($formats as $format) {
                $date = Carbon::createFromFormat($format, $dateValue);
                if ($date !== false) {
                    return $date->format('Y-m-d');
                }
            }

            // Tentative avec parse automatique
            $date = Carbon::parse($dateValue);
            return $date->format('Y-m-d');

        } catch (\Exception $e) {
            return null;
        }
    }

    // ✅ GETTERS POUR LES STATISTIQUES
    public function getTotalRows(): int { return $this->totalRows; }
    public function getImportedCount(): int { return $this->importedCount; }
    public function getSkippedCount(): int { return $this->skippedCount; }
    public function getErrorsCount(): int { return $this->errorCount; }
    public function getErrors(): array { return $this->errors; }
    public function getWarnings(): array { return $this->warnings; }
    public function getProcessedData(): array { return $this->processedData; }

    public function getImportSummary(): array
    {
        return [
            'total_rows' => $this->totalRows,
            'imported_count' => $this->importedCount,
            'skipped_count' => $this->skippedCount,
            'error_count' => $this->errorCount,
            'success_rate' => $this->totalRows > 0 ? round(($this->importedCount / $this->totalRows) * 100, 2) : 0,
            'has_errors' => $this->errorCount > 0,
            'has_warnings' => count($this->warnings) > 0
        ];
    }
}