<?php
namespace App\Services;

use App\Models\Beneficiaire;
use App\Models\CampagneMedicale;
use App\Models\AssistanceMedicale;
use App\Models\TypeAssistance;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class StatistiquesService
{
    public function getDashboardData()
    {
        return [
            'beneficiaires' => $this->getStatistiquesBeneficiaires(),
            'campagnes' => $this->getStatistiquesCampagnes(),
            'assistances' => $this->getStatistiquesAssistances(),
            'evolution' => $this->getEvolutionMensuelle(),
            'repartitions' => $this->getRepartitions()
        ];
    }

    private function getStatistiquesBeneficiaires()
    {
        $total = Beneficiaire::actif()->count();
        $hommes = Beneficiaire::actif()->hommes()->count();
        $femmes = Beneficiaire::actif()->femmes()->count();
        $horsCampagne = Beneficiaire::actif()->horsCampagne()->count();
        $ayantBeneficie = Beneficiaire::actif()->ayantBeneficie()->count();

        return compact('total', 'hommes', 'femmes', 'horsCampagne', 'ayantBeneficie');
    }

    private function getStatistiquesCampagnes()
    {
        $total = CampagneMedicale::actif()->count();
        $actives = CampagneMedicale::actif()->active()->count();
        $enCours = CampagneMedicale::actif()->enCours()->count();
        $terminees = CampagneMedicale::actif()->terminee()->count();

        return compact('total', 'actives', 'enCours', 'terminees');
    }

    private function getStatistiquesAssistances()
    {
        $total = AssistanceMedicale::actif()->count();
        $montantTotal = AssistanceMedicale::actif()->sum('montant');
        $moyenneMontant = AssistanceMedicale::actif()->avg('montant');

        return compact('total', 'montantTotal', 'moyenneMontant');
    }

    private function getEvolutionMensuelle($annee = null)
    {
        $annee = $annee ?? Carbon::now()->year;
        
        return DB::table('beneficiaires')
            ->selectRaw('MONTH(date_demande) as mois, COUNT(*) as total')
            ->whereYear('date_demande', $annee)
            ->whereNull('date_suppression')
            ->groupBy('mois')
            ->orderBy('mois')
            ->get()
            ->pluck('total', 'mois')
            ->toArray();
    }

    private function getRepartitions()
    {
        return [
            'par_type' => $this->getRepartitionParType(),
            'par_age' => $this->getRepartitionParAge(),
            'par_sexe' => $this->getRepartitionParSexe()
        ];
    }

    private function getRepartitionParType()
    {
        return DB::table('beneficiaires as b')
            ->join('types_assistance as ta', 'b.type_assistance_id', '=', 'ta.id')
            ->selectRaw('ta.libelle, COUNT(*) as total')
            ->whereNull('b.date_suppression')
            ->whereNull('ta.date_suppression')
            ->groupBy('ta.id', 'ta.libelle')
            ->get();
    }

    private function getRepartitionParAge()
    {
        $beneficiaires = Beneficiaire::actif()
            ->whereNotNull('date_naissance')
            ->get();

        $moins15 = $beneficiaires->filter(fn($b) => $b->age < 15)->count();
        $entre1664 = $beneficiaires->filter(fn($b) => $b->age >= 16 && $b->age <= 64)->count();
        $plus65 = $beneficiaires->filter(fn($b) => $b->age > 65)->count();

        return [
            'Moins de 15 ans' => $moins15,
            '16-64 ans' => $entre1664,
            '65 ans et plus' => $plus65
        ];
    }

    private function getRepartitionParSexe()
    {
        return [
            'Hommes' => Beneficiaire::actif()->hommes()->count(),
            'Femmes' => Beneficiaire::actif()->femmes()->count()
        ];
    }

    public function getIndicateursCampagne($campagneId)
    {
        $campagne = CampagneMedicale::findOrFail($campagneId);
        $beneficiaires = $campagne->beneficiaires;

        $indicateurs = [
            'total_beneficiaires' => $beneficiaires->count(),
            'hommes' => $beneficiaires->where('sexe', 'M')->count(),
            'femmes' => $beneficiaires->where('sexe', 'F')->count(),
            'tranches_age' => [
                'moins_15' => $beneficiaires->filter(fn($b) => $b->age < 15)->count(),
                'entre_16_64' => $beneficiaires->filter(fn($b) => $b->age >= 16 && $b->age <= 64)->count(),
                'plus_65' => $beneficiaires->filter(fn($b) => $b->age > 65)->count(),
            ]
        ];

        // Indicateurs spécifiques selon le type
        if ($campagne->typeAssistance->lateralite_obligatoire) {
            $indicateurs['lateralite'] = [
                'unilaterale' => $beneficiaires->where('lateralite', 'Unilatérale')->count(),
                'bilaterale' => $beneficiaires->where('lateralite', 'Bilatérale')->count(),
            ];
        }

        if ($campagne->typeAssistance->enfants_scolarises_obligatoire) {
            $indicateurs['enfants_scolarises'] = $beneficiaires
                ->where('enfants_scolarises', 'Enfant scolarisé')->count();
        }

        return $indicateurs;
    }
}