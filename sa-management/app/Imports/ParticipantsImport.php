<?php

namespace App\Imports;

use App\Models\Participant;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class ParticipantsImport implements ToCollection, WithHeadingRow
{
    private $campagneId;
    private $repondu = 0;
    private $neRepondPas = 0;
    private $nonContacte = 0;
    private $updated = 0;
    private $errors = [];

    // Listes pour répartir les participants par statut
    private $participantsRepondu = [];
    private $participantsNeRepondPas = [];
    private $participantsNonContacte = [];

    public function __construct($campagneId)
    {
        $this->campagneId = $campagneId;
    }

    public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {
            try {
                // Nettoyer et valider les données
                $nom = trim($row['nom'] ?? '');
                $prenom = trim($row['prenom'] ?? '');
                $adresse = trim($row['adresse'] ?? '');
                $telephone = trim($row['telephone'] ?? '');
                $statutExcel = trim($row['statut'] ?? '');

                // Ignorer les lignes vides (champs obligatoires)
                if (empty($nom) || empty($prenom) || empty($telephone)) {
                    $this->errors[] = "Ligne " . ($index + 2) . ": Données obligatoires manquantes";
                    continue;
                }

                // Valider et normaliser le statut
                $statut = $this->parseStatut($statutExcel);

                // Préparer les données du participant
                $participantData = [
                    'nom' => $nom,
                    'prenom' => $prenom,
                    'adresse' => $adresse,
                    'telephone' => $telephone,
                    'email' => trim($row['email'] ?? ''),
                    'date_naissance' => $this->parseDate($row['date_naissance'] ?? null),
                    'sexe' => $this->parseSexe($row['sexe'] ?? ''),
                    'cin' => trim($row['cin'] ?? ''),
                    'campagne_id' => $this->campagneId,
                    'statut' => $statut
                ];

                // Vérifier si le participant existe déjà dans cette campagne
                $existant = Participant::where('nom', $nom)
                    ->where('prenom', $prenom)
                    ->where('telephone', $telephone)
                    ->where('campagne_id', $this->campagneId)
                    ->whereNull('date_suppression')
                    ->first();

                if ($existant) {
                    // Mettre à jour le statut si différent
                    if ($existant->statut !== $statut) {
                        $existant->update(['statut' => $statut]);
                        $this->updated++;
                    }
                    $participant = $existant;
                } else {
                    // Créer nouveau participant
                    $participant = Participant::create($participantData);
                }

                // Répartir dans les listes selon le statut
                $this->repartirParticipant($participant, $statut);

            } catch (\Exception $e) {
                $this->errors[] = "Ligne " . ($index + 2) . ": " . $e->getMessage();
                Log::error('Erreur import participant', [
                    'ligne' => $index + 2,
                    'erreur' => $e->getMessage(),
                    'data' => $row->toArray()
                ]);
            }
        }
    }

    /**
     * Valider et normaliser le statut
     */
    private function parseStatut($statutExcel)
    {
        $statutExcel = strtolower(trim($statutExcel));
        
        // Mapping des valeurs possibles vers les valeurs en base
        $mappingStatuts = [
            'répondu' => 'répondu',
            'repondu' => 'répondu',
            'a répondu' => 'répondu',
            'a repondu' => 'répondu',
            'oui' => 'répondu',
            
            'ne répond pas' => 'ne repond pas',
            'ne repond pas' => 'ne repond pas',
            'ne répond pas' => 'ne repond pas',
            'pas de réponse' => 'ne repond pas',
            'pas de reponse' => 'ne repond pas',
            'non' => 'ne repond pas',
            
            'non contacté' => 'non contacté',
            'non contacte' => 'non contacté',
            'pas contacté' => 'non contacté',
            'pas contacte' => 'non contacté',
            'en attente' => 'non contacté',
            '' => 'non contacté' // Valeur vide = statut par défaut
        ];

        return $mappingStatuts[$statutExcel] ?? 'non contacté';
    }

    /**
     * Répartir le participant dans la bonne liste selon son statut
     */
    private function repartirParticipant($participant, $statut)
    {
        switch ($statut) {
            case 'répondu':
                $this->participantsRepondu[] = $participant;
                $this->repondu++;
                break;
                
            case 'ne repond pas':
                $this->participantsNeRepondPas[] = $participant;
                $this->neRepondPas++;
                break;
                
            case 'non contacté':
                $this->participantsNonContacte[] = $participant;
                $this->nonContacte++;
                break;
        }
    }

    private function parseDate($date)
    {
        if (empty($date)) return null;
        
        try {
            // Gérer les dates Excel (format numérique)
            if (is_numeric($date)) {
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($date)->format('Y-m-d');
            }
            
            return \Carbon\Carbon::parse($date)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }

    private function parseSexe($sexe)
    {
        $sexe = strtoupper(trim($sexe));
        $mapping = [
            'M' => 'M',
            'F' => 'F',
            'HOMME' => 'M',
            'FEMME' => 'F',
            'H' => 'M',
            'MASCULIN' => 'M',
            'FEMININ' => 'F'
        ];
        
        return $mapping[$sexe] ?? null;
    }

    // Getters pour récupérer les statistiques
    public function getReponduCount()
    {
        return $this->repondu;
    }

    public function getNeRepondPasCount()
    {
        return $this->neRepondPas;
    }

    public function getNonContacteCount()
    {
        return $this->nonContacte;
    }

    public function getUpdatedCount()
    {
        return $this->updated;
    }

    public function getErrors()
    {
        return $this->errors;
    }

    // Getters pour récupérer les listes de participants
    public function getParticipantsRepondu()
    {
        return $this->participantsRepondu;
    }

    public function getParticipantsNeRepondPas()
    {
        return $this->participantsNeRepondPas;
    }

    public function getParticipantsNonContacte()
    {
        return $this->participantsNonContacte;
    }

    /**
     * Obtenir un résumé complet de l'import
     */
    public function getSummary()
    {
        return [
            'total_traite' => $this->repondu + $this->neRepondPas + $this->nonContacte,
            'nouveau_crees' => $this->repondu + $this->neRepondPas + $this->nonContacte - $this->updated,
            'mis_a_jour' => $this->updated,
            'repartition' => [
                'repondu' => $this->repondu,
                'ne_repond_pas' => $this->neRepondPas,
                'non_contacte' => $this->nonContacte
            ],
            'erreurs' => count($this->errors),
            'details_erreurs' => $this->errors
        ];
    }
}