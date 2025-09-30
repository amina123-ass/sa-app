<?php
namespace App\Services;

use App\Models\ImportLog;
use App\Models\Beneficiaire;
use App\Models\Participant;
use App\Models\CampagneMedicale;
use App\Models\TypeAssistance;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ImportService
{
    public function importerBeneficiaires($fichier, $campagneId = null, $typeAssistanceId, $userId)
    {
        $donnees = $this->lireFichierCSV($fichier);
        $typeAssistance = TypeAssistance::findOrFail($typeAssistanceId);
        
        $log = ImportLog::create([
            'type' => 'beneficiaires',
            'fichier_origine' => $fichier->getClientOriginalName(),
            'lignes_total' => count($donnees),
            'lignes_importees' => 0,
            'lignes_erreur' => 0,
            'erreurs' => [],
            'user_id' => $userId,
            'campagne_id' => $campagneId,
            'date_import' => Carbon::now()
        ]);

        $importees = 0;
        $erreurs = [];

        DB::beginTransaction();
        
        try {
            foreach ($donnees as $index => $ligne) {
                try {
                    $this->validerLigneBeneficiaire($ligne, $typeAssistance);
                    
                    $beneficiaire = $this->creerBeneficiaire($ligne, $campagneId, $typeAssistanceId);
                    $importees++;
                    
                } catch (\Exception $e) {
                    $erreurs[] = [
                        'ligne' => $index + 1,
                        'erreur' => $e->getMessage(),
                        'donnees' => $ligne
                    ];
                }
            }

            $log->update([
                'lignes_importees' => $importees,
                'lignes_erreur' => count($erreurs),
                'erreurs' => $erreurs
            ]);

            DB::commit();
            return $log;
            
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }

    public function importerParticipants($fichier, $campagneId, $userId)
    {
        $donnees = $this->lireFichierCSV($fichier);
        $campagne = CampagneMedicale::findOrFail($campagneId);
        
        $log = ImportLog::create([
            'type' => 'participants',
            'fichier_origine' => $fichier->getClientOriginalName(),
            'lignes_total' => count($donnees),
            'lignes_importees' => 0,
            'lignes_erreur' => 0,
            'erreurs' => [],
            'user_id' => $userId,
            'campagne_id' => $campagneId,
            'date_import' => Carbon::now()
        ]);

        $importees = 0;
        $erreurs = [];

        DB::beginTransaction();
        
        try {
            foreach ($donnees as $index => $ligne) {
                try {
                    $this->validerLigneParticipant($ligne);
                    
                    $participant = $this->creerParticipant($ligne, $campagneId);
                    $importees++;
                    
                } catch (\Exception $e) {
                    $erreurs[] = [
                        'ligne' => $index + 1,
                        'erreur' => $e->getMessage(),
                        'donnees' => $ligne
                    ];
                }
            }

            $log->update([
                'lignes_importees' => $importees,
                'lignes_erreur' => count($erreurs),
                'erreurs' => $erreurs
            ]);

            DB::commit();
            return $log;
            
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }

    private function lireFichierCSV($fichier)
    {
        $contenu = file_get_contents($fichier->getRealPath());
        $lignes = explode("\n", $contenu);
        $entetes = str_getcsv(array_shift($lignes));
        
        $donnees = [];
        foreach ($lignes as $ligne) {
            if (trim($ligne)) {
                $valeurs = str_getcsv($ligne);
                if (count($valeurs) === count($entetes)) {
                    $donnees[] = array_combine($entetes, $valeurs);
                }
            }
        }
        
        return $donnees;
    }

    private function validerLigneBeneficiaire(array $ligne, TypeAssistance $typeAssistance)
    {
        $regles = [
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'sexe' => 'required|in:M,F',
            'date_naissance' => 'required|date',
            'adresse' => 'required|string',
            'telephone' => 'required|string|max:20',
            'email' => 'nullable|email'
        ];

        if ($typeAssistance->lateralite_obligatoire) {
            $regles['lateralite'] = 'required|in:Unilatérale,Bilatérale';
        }

        if ($typeAssistance->enfants_scolarises_obligatoire) {
            $regles['enfants_scolarises'] = 'required|string';
        }

        $validator = Validator::make($ligne, $regles);
        
        if ($validator->fails()) {
            throw new \Exception(implode(', ', $validator->errors()->all()));
        }

        // Vérifier l'unicité du téléphone
        if (Beneficiaire::where('telephone', $ligne['telephone'])->whereNull('date_suppression')->exists()) {
            throw new \Exception('Un bénéficiaire avec ce numéro de téléphone existe déjà');
        }
    }

    private function validerLigneParticipant(array $ligne)
    {
        $regles = [
            'nom' => 'required|string|max:100',
            'prenom' => 'required|string|max:100',
            'adresse' => 'required|string|max:255',
            'telephone' => 'required|string|max:20',
            'email' => 'nullable|email',
            'date_naissance' => 'nullable|date',
            'sexe' => 'nullable|in:M,F'
        ];

        $validator = Validator::make($ligne, $regles);
        
        if ($validator->fails()) {
            throw new \Exception(implode(', ', $validator->errors()->all()));
        }
    }

    private function creerBeneficiaire(array $ligne, $campagneId, $typeAssistanceId)
    {
        return Beneficiaire::create([
            'nom' => $ligne['nom'],
            'prenom' => $ligne['prenom'],
            'sexe' => $ligne['sexe'],
            'date_naissance' => Carbon::parse($ligne['date_naissance']),
            'adresse' => $ligne['adresse'],
            'telephone' => $ligne['telephone'],
            'email' => $ligne['email'] ?? null,
            'cin' => $ligne['cin'] ?? null,
            'commentaire' => $ligne['commentaire'] ?? null,
            'date_demande' => Carbon::now(),
            'campagne_id' => $campagneId,
            'type_assistance_id' => $typeAssistanceId,
            'hors_campagne' => $campagneId ? false : true,
            'lateralite' => $ligne['lateralite'] ?? null,
            'enfants_scolarises' => $ligne['enfants_scolarises'] ?? null
        ]);
    }

    private function creerParticipant(array $ligne, $campagneId)
    {
        return Participant::create([
            'nom' => $ligne['nom'],
            'prenom' => $ligne['prenom'],
            'adresse' => $ligne['adresse'],
            'telephone' => $ligne['telephone'],
            'email' => $ligne['email'] ?? null,
            'date_naissance' => $ligne['date_naissance'] ? Carbon::parse($ligne['date_naissance']) : null,
            'sexe' => $ligne['sexe'] ?? null,
            'cin' => $ligne['cin'] ?? null,
            'statut' => 'non contacté',
            'commentaire' => $ligne['commentaire'] ?? null,
            'campagne_id' => $campagneId
        ]);
    }

    public function getStatistiquesImport($userId = null)
    {
        $query = ImportLog::query();
        
        if ($userId) {
            $query->where('user_id', $userId);
        }

        return [
            'total_imports' => $query->count(),
            'imports_reussis' => $query->where('lignes_erreur', 0)->count(),
            'imports_avec_erreurs' => $query->where('lignes_erreur', '>', 0)->count(),
            'lignes_importees_total' => $query->sum('lignes_importees'),
            'lignes_erreur_total' => $query->sum('lignes_erreur'),
            'derniers_imports' => $query->orderBy('created_at', 'desc')->limit(10)->get()
        ];
    }
}