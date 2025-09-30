<?php
// app/Services/ExcelImportService.php

namespace App\Services;

use App\Models\Beneficiaire;
use App\Models\CampagneMedicale;
use App\Models\TypeAssistance;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

class ExcelImportService
{
    protected $erreurs = [];
    protected $avertissements = [];
    protected $importes = 0;
    protected $totalLignes = 0;

    public function importBeneficiaires(UploadedFile $file, CampagneMedicale $campagne)
    {
        try {
            // Réinitialiser les compteurs
            $this->erreurs = [];
            $this->avertissements = [];
            $this->importes = 0;
            $this->totalLignes = 0;

            // Charger le fichier Excel
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            // Vérifier l'en-tête
            if (empty($rows)) {
                throw new \Exception('Le fichier Excel est vide');
            }

            $headers = array_map('trim', array_map('strtolower', $rows[0]));
            $this->validerHeaders($headers, $campagne);

            // Traiter chaque ligne de données
            $this->totalLignes = count($rows) - 1; // Exclure l'en-tête

            DB::beginTransaction();

            for ($i = 1; $i < count($rows); $i++) {
                $numeroLigne = $i + 1;
                $donnees = $rows[$i];
                
                try {
                    $this->traiterLigne($donnees, $headers, $campagne, $numeroLigne);
                } catch (\Exception $e) {
                    $this->erreurs[] = "Ligne {$numeroLigne}: " . $e->getMessage();
                    Log::error("Erreur import ligne {$numeroLigne}", [
                        'error' => $e->getMessage(),
                        'data' => $donnees
                    ]);
                }
            }

            // Si des erreurs critiques, rollback
            if (!empty($this->erreurs)) {
                DB::rollBack();
                
                return [
                    'success' => false,
                    'message' => 'Import échoué avec des erreurs',
                    'erreurs' => $this->erreurs,
                    'avertissements' => $this->avertissements,
                    'statistiques' => [
                        'total_lignes' => $this->totalLignes,
                        'importes' => 0,
                        'erreurs' => count($this->erreurs)
                    ]
                ];
            }

            DB::commit();

            return [
                'success' => true,
                'message' => "Import réussi: {$this->importes} bénéficiaires importés",
                'erreurs' => $this->erreurs,
                'avertissements' => $this->avertissements,
                'statistiques' => [
                    'total_lignes' => $this->totalLignes,
                    'importes' => $this->importes,
                    'erreurs' => count($this->erreurs),
                    'avertissements' => count($this->avertissements)
                ]
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur import Excel', [
                'error' => $e->getMessage(),
                'file' => $file->getClientOriginalName(),
                'campagne' => $campagne->id
            ]);

            return [
                'success' => false,
                'message' => 'Erreur lors de l\'import: ' . $e->getMessage(),
                'erreurs' => [$e->getMessage()],
                'avertissements' => [],
                'statistiques' => [
                    'total_lignes' => 0,
                    'importes' => 0,
                    'erreurs' => 1
                ]
            ];
        }
    }

    protected function validerHeaders($headers, CampagneMedicale $campagne)
    {
        $headersObligatoires = ['nom', 'prenom', 'sexe', 'date_naissance'];
        
        // Headers spécifiques selon le type d'assistance
        $typeAssistance = $campagne->typeAssistance;
        
        if ($typeAssistance->est_appareils_auditifs) {
            $headersObligatoires[] = 'lateralite';
        }
        
        if ($typeAssistance->est_lunettes) {
            // Pour les lunettes, enfants_scolarises n'est obligatoire que pour les enfants
            // On le vérifiera ligne par ligne
        }

        $headerManquants = [];
        foreach ($headersObligatoires as $header) {
            if (!in_array($header, $headers)) {
                $headerManquants[] = $header;
            }
        }

        if (!empty($headerManquants)) {
            throw new \Exception('Colonnes manquantes dans le fichier: ' . implode(', ', $headerManquants));
        }
    }

    protected function traiterLigne($donnees, $headers, CampagneMedicale $campagne, $numeroLigne)
    {
        // Créer un tableau associatif à partir des données
        $data = [];
        foreach ($headers as $index => $header) {
            $data[$header] = isset($donnees[$index]) ? trim($donnees[$index]) : '';
        }

        // Nettoyer et valider les données
        $beneficiaireData = $this->preparerDonneesBeneficiaire($data, $campagne, $numeroLigne);

        // Vérifier les doublons
        $existant = $this->verifierDoublon($beneficiaireData);
        if ($existant) {
            $this->avertissements[] = "Ligne {$numeroLigne}: Bénéficiaire déjà existant (téléphone: {$beneficiaireData['telephone']})";
            return;
        }

        // Créer le bénéficiaire
        $beneficiaire = Beneficiaire::create($beneficiaireData);
        $this->importes++;

        Log::info("Bénéficiaire importé", [
            'ligne' => $numeroLigne,
            'beneficiaire_id' => $beneficiaire->id,
            'nom' => $beneficiaire->nom_complet
        ]);
    }

    protected function preparerDonneesBeneficiaire($data, CampagneMedicale $campagne, $numeroLigne)
    {
        $beneficiaireData = [
            'nom' => $this->validerEtNettoyer('nom', $data['nom'], 'required|string|max:255', $numeroLigne),
            'prenom' => $this->validerEtNettoyer('prenom', $data['prenom'], 'required|string|max:255', $numeroLigne),
            'sexe' => $this->validerEtNettoyer('sexe', $this->normaliserSexe($data['sexe']), 'required|in:M,F', $numeroLigne),
            'date_naissance' => $this->validerEtNettoyer('date_naissance', $this->normaliserDate($data['date_naissance']), 'nullable|date|before:today', $numeroLigne),
            'telephone' => $this->validerEtNettoyer('telephone', $this->normaliserTelephone($data['telephone']), 'required|regex:/^(\+212|0)?[5-7]\d{8}$/', $numeroLigne),
            'email' => $this->validerEtNettoyer('email', $data['email'] ?? '', 'nullable|email', $numeroLigne),
            'adresse' => $this->validerEtNettoyer('adresse', $data['adresse'] ?? '', 'nullable|string|max:500', $numeroLigne),
            'cin' => $this->validerEtNettoyer('cin', $data['cin'] ?? '', 'nullable|string|max:20', $numeroLigne),
            'campagne_id' => $campagne->id,
            'type_assistance_id' => $campagne->type_assistance_id,
            'hors_campagne' => false,
            'date_demande' => now()
        ];

        // Traiter les champs spécifiques au type d'assistance
        $typeAssistance = $campagne->typeAssistance;

        if ($typeAssistance->est_appareils_auditifs) {
            $lateralite = $data['lateralite'] ?? '';
            $beneficiaireData['lateralite'] = $this->validerEtNettoyer(
                'lateralite', 
                $lateralite, 
                'required|in:Unilatérale,Bilatérale', 
                $numeroLigne
            );
        }

        if ($typeAssistance->est_lunettes) {
            $enfantsScolarises = $data['enfants_scolarises'] ?? '';
            
            // Vérifier si c'est un enfant (moins de 18 ans)
            if ($beneficiaireData['date_naissance']) {
                $age = Carbon::parse($beneficiaireData['date_naissance'])->diffInYears(now());
                if ($age < 18 && empty($enfantsScolarises)) {
                    throw new \Exception("Ligne {$numeroLigne}: Le statut 'enfant scolarisé' est obligatoire pour les enfants dans les campagnes de lunettes");
                }
            }
            
            $beneficiaireData['enfants_scolarises'] = $enfantsScolarises;
        }

        return $beneficiaireData;
    }

    protected function validerEtNettoyer($champ, $valeur, $regles, $numeroLigne)
    {
        $validator = Validator::make([$champ => $valeur], [$champ => $regles]);
        
        if ($validator->fails()) {
            $erreurs = $validator->errors()->get($champ);
            throw new \Exception("Ligne {$numeroLigne}, champ {$champ}: " . implode(', ', $erreurs));
        }
        
        return $valeur;
    }

    protected function normaliserSexe($sexe)
    {
        $sexe = strtoupper(trim($sexe));
        
        $correspondances = [
            'M' => 'M',
            'F' => 'F',
            'MASCULIN' => 'M',
            'FEMININ' => 'F',
            'HOMME' => 'M',
            'FEMME' => 'F',
            'MALE' => 'M',
            'FEMALE' => 'F'
        ];
        
        return $correspondances[$sexe] ?? $sexe;
    }

    protected function normaliserDate($date)
    {
        if (empty($date)) {
            return null;
        }

        try {
            // Essayer différents formats
            $formats = ['Y-m-d', 'd/m/Y', 'd-m-Y', 'Y/m/d', 'd/m/y', 'd-m-y'];
            
            foreach ($formats as $format) {
                $parsedDate = \DateTime::createFromFormat($format, $date);
                if ($parsedDate && $parsedDate->format($format) === $date) {
                    return $parsedDate->format('Y-m-d');
                }
            }

            // Essayer avec Carbon
            return Carbon::parse($date)->format('Y-m-d');
            
        } catch (\Exception $e) {
            throw new \Exception("Format de date invalide: {$date}");
        }
    }

    protected function normaliserTelephone($telephone)
    {
        if (empty($telephone)) {
            return '';
        }

        // Supprimer tous les caractères non numériques sauf le +
        $telephone = preg_replace('/[^\d+]/', '', $telephone);
        
        // Normaliser les préfixes marocains
        if (str_starts_with($telephone, '+212')) {
            $telephone = '0' . substr($telephone, 4);
        } elseif (str_starts_with($telephone, '212')) {
            $telephone = '0' . substr($telephone, 3);
        }
        
        return $telephone;
    }

    protected function verifierDoublon($beneficiaireData)
    {
        // Vérifier par téléphone
        $existantTel = Beneficiaire::where('telephone', $beneficiaireData['telephone'])
            ->whereNull('date_suppression')
            ->first();
            
        if ($existantTel) {
            return $existantTel;
        }

        // Vérifier par nom + prénom + date de naissance
        if (!empty($beneficiaireData['date_naissance'])) {
            $existantNom = Beneficiaire::where('nom', $beneficiaireData['nom'])
                ->where('prenom', $beneficiaireData['prenom'])
                ->where('date_naissance', $beneficiaireData['date_naissance'])
                ->whereNull('date_suppression')
                ->first();
                
            if ($existantNom) {
                return $existantNom;
            }
        }

        return null;
    }

    public function genererTemplateExcel()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Configuration de la feuille
        $sheet->setTitle('Template Import Bénéficiaires');
        
        // En-têtes avec style
        $headers = [
            'nom' => 'Nom *',
            'prenom' => 'Prénom *', 
            'sexe' => 'Sexe *',
            'date_naissance' => 'Date Naissance *',
            'telephone' => 'Téléphone',
            'email' => 'Email',
            'adresse' => 'Adresse',
            'cin' => 'CIN',
            'lateralite' => 'Latéralité',
            'enfants_scolarises' => 'Enfants Scolarisés'
        ];

        $col = 1;
        foreach ($headers as $key => $header) {
            $sheet->setCellValueByColumnAndRow($col, 1, $header);
            
            // Style pour les champs obligatoires
            if (str_contains($header, '*')) {
                $sheet->getStyleByColumnAndRow($col, 1)->getFont()->setBold(true)->getColor()->setRGB('FF0000');
            } else {
                $sheet->getStyleByColumnAndRow($col, 1)->getFont()->setBold(true);
            }
            
            $col++;
        }

        // Ajouter des exemples de données
        $exemples = [
            ['ALAMI', 'Mohammed', 'M', '1985-03-15', '0612345678', 'mohammed@email.com', '123 Rue Example, Rabat', 'AB123456', 'Bilatérale', ''],
            ['BENNANI', 'Fatima', 'F', '1990-07-22', '0687654321', 'fatima@email.com', '456 Avenue Test, Casablanca', 'CD789012', '', 'Enfant scolarisé'],
            ['ZAHIRI', 'Ahmed', 'M', '2010-11-08', '0698765432', '', '789 Boulevard Demo, Fès', '', 'Unilatérale', 'Enfant scolarisé']
        ];

        for ($row = 2; $row <= 4; $row++) {
            $exemple = $exemples[$row - 2];
            for ($col = 1; $col <= count($exemple); $col++) {
                $sheet->setCellValueByColumnAndRow($col, $row, $exemple[$col - 1]);
                $sheet->getStyleByColumnAndRow($col, $row)->getFont()->getColor()->setRGB('666666');
            }
        }

        // Instructions et règles de validation
        $sheet->setCellValue('A6', 'INSTRUCTIONS:');
        $sheet->getStyle('A6')->getFont()->setBold(true)->setSize(12);
        
        $instructions = [
            'A7' => '• Les champs avec * sont obligatoires',
            'A8' => '• Format date: YYYY-MM-DD (ex: 1985-03-15)',
            'A9' => '• Sexe: M ou F (Masculin/Féminin)',
            'A10' => '• Téléphone: format marocain (ex: 0612345678)',
            'A11' => '• Latéralité: Unilatérale ou Bilatérale (obligatoire pour appareils auditifs)',
            'A12' => '• Enfants Scolarisés: "Enfant scolarisé" pour les enfants (obligatoire pour lunettes si < 18 ans)',
            'A13' => '• Supprimez ces lignes d\'exemple avant l\'import'
        ];

        foreach ($instructions as $cell => $text) {
            $sheet->setCellValue($cell, $text);
            $sheet->getStyle($cell)->getFont()->setSize(10);
        }

        // Auto-ajuster la largeur des colonnes
        foreach (range('A', 'J') as $columnID) {
            $sheet->getColumnDimension($columnID)->setAutoSize(true);
        }

        // Appliquer des bordures au tableau d'exemple
        $styleArray = [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FF000000'],
                ],
            ],
        ];
        $sheet->getStyle('A1:J4')->applyFromArray($styleArray);

        // Couleur de fond pour les en-têtes
        $sheet->getStyle('A1:J1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E8F4FD');

        // Sauvegarder le fichier
        $fileName = 'template_import_beneficiaires_' . now()->format('Y-m-d') . '.xlsx';
        $filePath = storage_path('app/templates/' . $fileName);
        
        // Créer le dossier s'il n'existe pas
        if (!file_exists(dirname($filePath))) {
            mkdir(dirname($filePath), 0755, true);
        }
        
        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    public function validerFichierAvantImport(UploadedFile $file, CampagneMedicale $campagne)
    {
        try {
            // Vérifications de base
            $validationErrors = [];
            
            // Taille du fichier
            if ($file->getSize() > 10 * 1024 * 1024) { // 10MB
                $validationErrors[] = 'Le fichier est trop volumineux (max 10MB)';
            }
            
            // Type de fichier
            if (!in_array($file->getClientOriginalExtension(), ['xlsx', 'xls'])) {
                $validationErrors[] = 'Format de fichier non supporté (seuls .xlsx et .xls sont acceptés)';
            }
            
            if (!empty($validationErrors)) {
                return [
                    'valid' => false,
                    'errors' => $validationErrors
                ];
            }

            // Charger et analyser le contenu
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            if (empty($rows)) {
                return [
                    'valid' => false,
                    'errors' => ['Le fichier Excel est vide']
                ];
            }

            // Analyser les en-têtes
            $headers = array_map('trim', array_map('strtolower', $rows[0]));
            $errorsHeaders = [];
            
            try {
                $this->validerHeaders($headers, $campagne);
            } catch (\Exception $e) {
                $errorsHeaders[] = $e->getMessage();
            }

            // Analyser quelques lignes pour détecter des problèmes potentiels
            $problemesPotentiels = [];
            $lignesToAnalyse = min(10, count($rows) - 1); // Analyser max 10 lignes
            
            for ($i = 1; $i <= $lignesToAnalyse; $i++) {
                if (!isset($rows[$i])) continue;
                
                $donnees = $rows[$i];
                $data = [];
                foreach ($headers as $index => $header) {
                    $data[$header] = isset($donnees[$index]) ? trim($donnees[$index]) : '';
                }

                // Vérifications rapides
                if (empty($data['nom'] ?? '')) {
                    $problemesPotentiels[] = "Ligne " . ($i + 1) . ": Nom manquant";
                }
                
                if (empty($data['prenom'] ?? '')) {
                    $problemesPotentiels[] = "Ligne " . ($i + 1) . ": Prénom manquant";
                }
                
                if (!empty($data['telephone'] ?? '')) {
                    $tel = $this->normaliserTelephone($data['telephone']);
                    if (!preg_match('/^(\+212|0)?[5-7]\d{8}$/', $tel)) {
                        $problemesPotentiels[] = "Ligne " . ($i + 1) . ": Format téléphone invalide";
                    }
                }

                if (!empty($data['email'] ?? '') && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                    $problemesPotentiels[] = "Ligne " . ($i + 1) . ": Format email invalide";
                }
            }

            return [
                'valid' => empty($errorsHeaders),
                'errors' => $errorsHeaders,
                'warnings' => $problemesPotentiels,
                'stats' => [
                    'total_lignes' => count($rows) - 1,
                    'headers_detectes' => $headers,
                    'campagne' => $campagne->nom,
                    'type_assistance' => $campagne->typeAssistance->libelle
                ]
            ];

        } catch (\Exception $e) {
            return [
                'valid' => false,
                'errors' => ['Erreur lors de l\'analyse du fichier: ' . $e->getMessage()]
            ];
        }
    }

    public function previsualiserImport(UploadedFile $file, CampagneMedicale $campagne, $maxLignes = 5)
    {
        try {
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            if (empty($rows)) {
                throw new \Exception('Le fichier Excel est vide');
            }

            $headers = array_map('trim', array_map('strtolower', $rows[0]));
            $preview = [];
            $erreurs = [];

            $lignesToPrevisu = min($maxLignes, count($rows) - 1);

            for ($i = 1; $i <= $lignesToPrevisu; $i++) {
                if (!isset($rows[$i])) continue;

                $donnees = $rows[$i];
                $data = [];
                foreach ($headers as $index => $header) {
                    $data[$header] = isset($donnees[$index]) ? trim($donnees[$index]) : '';
                }

                try {
                    $beneficiaireData = $this->preparerDonneesBeneficiaire($data, $campagne, $i + 1);
                    
                    // Vérifier doublons
                    $existant = $this->verifierDoublon($beneficiaireData);
                    
                    $preview[] = [
                        'ligne' => $i + 1,
                        'donnees_brutes' => $data,
                        'donnees_traitees' => $beneficiaireData,
                        'statut' => $existant ? 'doublon' : 'nouveau',
                        'doublon_id' => $existant ? $existant->id : null,
                        'erreurs' => []
                    ];

                } catch (\Exception $e) {
                    $preview[] = [
                        'ligne' => $i + 1,
                        'donnees_brutes' => $data,
                        'donnees_traitees' => null,
                        'statut' => 'erreur',
                        'doublon_id' => null,
                        'erreurs' => [$e->getMessage()]
                    ];
                    $erreurs[] = "Ligne " . ($i + 1) . ": " . $e->getMessage();
                }
            }

            return [
                'success' => true,
                'preview' => $preview,
                'erreurs' => $erreurs,
                'total_lignes' => count($rows) - 1,
                'lignes_previewees' => $lignesToPrevisu,
                'campagne' => $campagne->nom,
                'headers' => $headers
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Erreur lors de la prévisualisation: ' . $e->getMessage(),
                'erreurs' => [$e->getMessage()]
            ];
        }
    }
}