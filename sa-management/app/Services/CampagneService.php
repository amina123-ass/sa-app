<?php
namespace App\Services;

use App\Models\CampagneMedicale;
use App\Models\Beneficiaire;
use App\Models\Participant;
use App\Models\IndicateurCampagne;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CampagneService
{
    public function creerCampagne(array $donnees)
    {
        DB::beginTransaction();
        
        try {
            // Vérifier les chevauchements
            $this->verifierChevauchement($donnees);
            
            $campagne = CampagneMedicale::create($donnees);
            
            // Calculer et enregistrer les indicateurs initiaux
            $this->calculerIndicateursInitiaux($campagne);
            
            DB::commit();
            return $campagne;
            
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }

    public function modifierCampagne(CampagneMedicale $campagne, array $donnees)
    {
        if (!$campagne->peutEtreModifiee()) {
            throw new \Exception('Cette campagne ne peut plus être modifiée');
        }

        DB::beginTransaction();
        
        try {
            $campagne->update($donnees);
            
            // Recalculer les indicateurs
            $this->mettreAJourIndicateurs($campagne);
            
            DB::commit();
            return $campagne;
            
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }

    public function supprimerCampagne(CampagneMedicale $campagne)
    {
        if (!$campagne->peutEtreSupprimee()) {
            throw new \Exception('Cette campagne ne peut pas être supprimée car elle contient des bénéficiaires ou participants');
        }

        $campagne->softDelete();
        return true;
    }

    public function ajouterBeneficiaire(CampagneMedicale $campagne, Beneficiaire $beneficiaire)
    {
        if ($campagne->statut !== 'Active') {
            throw new \Exception('Impossible d\'ajouter un bénéficiaire à une campagne inactive');
        }

        // Vérifier les critères spécifiques
        $this->verifierCriteresBeneficiaire($campagne, $beneficiaire);

        DB::beginTransaction();
        
        try {
            $campagne->campagneBeneficiaires()->create([
                'beneficiaire_id' => $beneficiaire->id,
                'statut' => 'en_attente',
                'date_inscription' => Carbon::now()
            ]);

            // Mettre à jour les indicateurs
            $this->mettreAJourIndicateurs($campagne);
            
            DB::commit();
            return true;
            
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }

    private function verifierChevauchement(array $donnees)
    {
        $chevauchement = CampagneMedicale::actif()
            ->where('type_assistance_id', $donnees['type_assistance_id'])
            ->where(function ($query) use ($donnees) {
                $query->whereBetween('date_debut', [$donnees['date_debut'], $donnees['date_fin']])
                      ->orWhereBetween('date_fin', [$donnees['date_debut'], $donnees['date_fin']])
                      ->orWhere(function ($q) use ($donnees) {
                          $q->where('date_debut', '<=', $donnees['date_debut'])
                            ->where('date_fin', '>=', $donnees['date_fin']);
                      });
            })->exists();

        if ($chevauchement) {
            throw new \Exception('Une campagne pour ce type d\'assistance existe déjà sur cette période');
        }
    }

    private function verifierCriteresBeneficiaire(CampagneMedicale $campagne, Beneficiaire $beneficiaire)
    {
        $typeAssistance = $campagne->typeAssistance;

        if ($typeAssistance->lateralite_obligatoire && !$beneficiaire->lateralite) {
            throw new \Exception('La latéralité est obligatoire pour ce type d\'assistance');
        }

        if ($typeAssistance->enfants_scolarises_obligatoire && !$beneficiaire->enfants_scolarises) {
            throw new \Exception('L\'information sur les enfants scolarisés est obligatoire');
        }
    }

    private function calculerIndicateursInitiaux(CampagneMedicale $campagne)
    {
        // Indicateurs de base
        $indicateurs = [
            ['indicateur' => 'budget', 'valeur' => $campagne->budget ?? 0],
            ['indicateur' => 'participants_prevu', 'valeur' => $campagne->nombre_participants_prevu ?? 0],
        ];

        foreach ($indicateurs as $indicateur) {
            $campagne->indicateursCampagnes()->create($indicateur);
        }
    }

    public function mettreAJourIndicateurs(CampagneMedicale $campagne)
    {
        $beneficiaires = $campagne->beneficiaires;
        $participants = $campagne->participants;

        // Supprimer les anciens indicateurs calculés
        $campagne->indicateursCampagnes()
                 ->whereIn('indicateur', ['total_beneficiaires', 'hommes', 'femmes', 'total_participants'])
                 ->delete();

        // Recalculer les indicateurs
        $indicateurs = [
            [
                'indicateur' => 'total_beneficiaires',
                'valeur' => $beneficiaires->count()
            ],
            [
                'indicateur' => 'hommes',
                'sous_indicateur' => 'beneficiaires',
                'valeur' => $beneficiaires->where('sexe', 'M')->count()
            ],
            [
                'indicateur' => 'femmes',
                'sous_indicateur' => 'beneficiaires',
                'valeur' => $beneficiaires->where('sexe', 'F')->count()
            ],
            [
                'indicateur' => 'total_participants',
                'valeur' => $participants->count()
            ]
        ];

        // Indicateurs d'âge
        $tranches = [
            'moins_15' => $beneficiaires->filter(fn($b) => $b->age < 15)->count(),
            'entre_16_64' => $beneficiaires->filter(fn($b) => $b->age >= 16 && $b->age <= 64)->count(),
            'plus_65' => $beneficiaires->filter(fn($b) => $b->age > 65)->count(),
        ];

        foreach ($tranches as $tranche => $count) {
            $indicateurs[] = [
                'indicateur' => 'age',
                'sous_indicateur' => $tranche,
                'valeur' => $count
            ];
        }

        // Indicateurs spécifiques au type d'assistance
        if ($campagne->typeAssistance->lateralite_obligatoire) {
            $lateralites = [
                'unilaterale' => $beneficiaires->where('lateralite', 'Unilatérale')->count(),
                'bilaterale' => $beneficiaires->where('lateralite', 'Bilatérale')->count(),
            ];

            foreach ($lateralites as $type => $count) {
                $indicateurs[] = [
                    'indicateur' => 'lateralite',
                    'sous_indicateur' => $type,
                    'valeur' => $count
                ];
            }
        }

        // Créer les nouveaux indicateurs
        foreach ($indicateurs as $indicateur) {
            $campagne->indicateursCampagnes()->create($indicateur);
        }
    }

    public function genererRapport(CampagneMedicale $campagne)
    {
        $beneficiaires = $campagne->beneficiaires;
        $participants = $campagne->participants;
        $assistances = $campagne->assistancesMedicales;

        return [
            'campagne' => [
                'nom' => $campagne->nom,
                'type' => $campagne->typeAssistance->libelle,
                'periode' => $campagne->date_debut->format('d/m/Y') . ' - ' . $campagne->date_fin->format('d/m/Y'),
                'statut' => $campagne->statut,
                'lieu' => $campagne->lieu
            ],
            'budget' => [
                'alloue' => $campagne->budget,
                'consomme' => $campagne->credit_consomme,
                'restant' => $campagne->budget_restant,
                'pourcentage_consommation' => $campagne->pourcentage_consommation
            ],
            'beneficiaires' => [
                'total' => $beneficiaires->count(),
                'hommes' => $beneficiaires->where('sexe', 'M')->count(),
                'femmes' => $beneficiaires->where('sexe', 'F')->count(),
                'tranches_age' => [
                    'moins_15' => $beneficiaires->filter(fn($b) => $b->age < 15)->count(),
                    'entre_16_64' => $beneficiaires->filter(fn($b) => $b->age >= 16 && $b->age <= 64)->count(),
                    'plus_65' => $beneficiaires->filter(fn($b) => $b->age > 65)->count(),
                ]
            ],
            'participants' => [
                'total' => $participants->count(),
                'statuts' => $participants->groupBy('statut')->map->count()
            ],
            'assistances' => [
                'total' => $assistances->count(),
                'montant_total' => $assistances->sum('montant'),
                'montant_moyen' => $assistances->avg('montant')
            ]
        ];
    }

    public function cloturerCampagne(CampagneMedicale $campagne)
    {
        if ($campagne->statut === 'Terminée') {
            throw new \Exception('Cette campagne est déjà terminée');
        }

        DB::beginTransaction();
        
        try {
            $campagne->update([
                'statut' => 'Terminée',
                'credit_consomme' => $campagne->assistancesMedicales()->sum('montant')
            ]);

            // Marquer les bénéficiaires comme ayant bénéficié
            $campagne->beneficiaires()->update(['a_beneficie' => true]);

            // Calculer les indicateurs finaux
            $this->mettreAJourIndicateurs($campagne);
            
            DB::commit();
            return $campagne;
            
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }
}