<?php
namespace App\Traits;

use App\Models\Beneficiaire;
use App\Models\CampagneMedicale;
use Carbon\Carbon;

trait HasStatistiques
{
    public function getStatistiquesBeneficiaires($periode = null)
    {
        $query = Beneficiaire::actif();
        
        if ($periode) {
            $query->whereBetween('date_demande', $periode);
        }

        $beneficiaires = $query->get();

        return [
            'total' => $beneficiaires->count(),
            'hommes' => $beneficiaires->where('sexe', 'M')->count(),
            'femmes' => $beneficiaires->where('sexe', 'F')->count(),
            'hors_campagne' => $beneficiaires->where('hors_campagne', true)->count(),
            'ayant_beneficie' => $beneficiaires->where('a_beneficie', true)->count(),
            'tranches_age' => [
                'moins_15' => $beneficiaires->filter(fn($b) => $b->age < 15)->count(),
                'entre_16_64' => $beneficiaires->filter(fn($b) => $b->age >= 16 && $b->age <= 64)->count(),
                'plus_65' => $beneficiaires->filter(fn($b) => $b->age > 65)->count(),
            ]
        ];
    }

    public function getStatistiquesCampagnes($periode = null)
    {
        $query = CampagneMedicale::actif();
        
        if ($periode) {
            $query->whereBetween('date_debut', $periode);
        }

        $campagnes = $query->get();

        return [
            'total' => $campagnes->count(),
            'actives' => $campagnes->where('statut', 'Active')->count(),
            'en_cours' => $campagnes->where('statut', 'En cours')->count(),
            'terminees' => $campagnes->where('statut', 'Terminée')->count(),
            'annulees' => $campagnes->where('statut', 'Annulée')->count(),
            'budget_total' => $campagnes->sum('budget'),
            'credit_consomme_total' => $campagnes->sum('credit_consomme'),
        ];
    }

    public function getEvolutionMensuelle($annee = null)
    {
        $annee = $annee ?? Carbon::now()->year;
        
        $beneficiaires = [];
        $campagnes = [];
        
        for ($mois = 1; $mois <= 12; $mois++) {
            $debut = Carbon::create($annee, $mois, 1)->startOfMonth();
            $fin = Carbon::create($annee, $mois, 1)->endOfMonth();
            
            $beneficiaires[$mois] = Beneficiaire::actif()
                ->whereBetween('date_demande', [$debut, $fin])
                ->count();
                
            $campagnes[$mois] = CampagneMedicale::actif()
                ->whereBetween('date_debut', [$debut, $fin])
                ->count();
        }
        
        return [
            'beneficiaires' => $beneficiaires,
            'campagnes' => $campagnes
        ];
    }
}