<?php

namespace App\Helpers;

use App\Models\AssistanceMedicale;
use App\Models\Beneficiaire;
use App\Models\CampagneMedicale;
use App\Models\TypeAssistance;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class UpasStatsHelper
{
    /**
     * Statistiques générales pour une période
     */
    public static function getStatsForPeriod($dateDebut = null, $dateFin = null)
    {
        $dateDebut = $dateDebut ? Carbon::parse($dateDebut) : Carbon::now()->startOfMonth();
        $dateFin = $dateFin ? Carbon::parse($dateFin) : Carbon::now()->endOfMonth();

        return [
            'periode' => [
                'debut' => $dateDebut->format('d/m/Y'),
                'fin' => $dateFin->format('d/m/Y')
            ],
            'assistances' => [
                'total' => AssistanceMedicale::active()
                    ->whereBetween('date_assistance', [$dateDebut, $dateFin])
                    ->count(),
                'montant_total' => AssistanceMedicale::active()
                    ->whereBetween('date_assistance', [$dateDebut, $dateFin])
                    ->sum('montant') ?? 0
            ],
            'beneficiaires_uniques' => AssistanceMedicale::active()
                ->whereBetween('date_assistance', [$dateDebut, $dateFin])
                ->distinct('beneficiaire_id')
                ->count('beneficiaire_id'),
            'repartition_types' => self::getRepartitionParType($dateDebut, $dateFin)
        ];
    }

    /**
     * Répartition par type d'assistance
     */
    private static function getRepartitionParType($dateDebut, $dateFin)
    {
        return DB::table('assistance_medicales')
            ->join('type_assistances', 'assistance_medicales.type_assistance_id', '=', 'type_assistances.id')
            ->whereNull('assistance_medicales.date_suppression')
            ->whereNull('type_assistances.date_suppression')
            ->whereBetween('assistance_medicales.date_assistance', [$dateDebut, $dateFin])
            ->select(
                'type_assistances.libelle as type',
                DB::raw('COUNT(*) as nombre'),
                DB::raw('SUM(assistance_medicales.montant) as montant_total'),
                DB::raw('AVG(assistance_medicales.montant) as montant_moyen')
            )
            ->groupBy('type_assistances.id', 'type_assistances.libelle')
            ->orderByDesc('nombre')
            ->get()
            ->map(function ($item) {
                return [
                    'type' => $item->type,
                    'nombre' => (int) $item->nombre,
                    'montant_total' => (float) ($item->montant_total ?? 0),
                    'montant_moyen' => (float) ($item->montant_moyen ?? 0),
                    'pourcentage' => 0 // Calculé dans le contrôleur
                ];
            });
    }

    /**
     * Top 10 des bénéficiaires par nombre d'assistances
     */
    public static function getTopBeneficiaires($limit = 10)
    {
        return DB::table('assistance_medicales')
            ->join('beneficiaires', 'assistance_medicales.beneficiaire_id', '=', 'beneficiaires.id')
            ->whereNull('assistance_medicales.date_suppression')
            ->whereNull('beneficiaires.date_suppression')
            ->select(
                'beneficiaires.id',
                'beneficiaires.nom',
                'beneficiaires.prenom',
                DB::raw('COUNT(*) as nombre_assistances'),
                DB::raw('SUM(assistance_medicales.montant) as montant_total')
            )
            ->groupBy('beneficiaires.id', 'beneficiaires.nom', 'beneficiaires.prenom')
            ->orderByDesc('nombre_assistances')
            ->limit($limit)
            ->get();
    }

    /**
     * Évolution mensuelle des assistances
     */
    public static function getEvolutionMensuelle($annee = null)
    {
        $annee = $annee ?? date('Y');
        
        $data = [];
        for ($mois = 1; $mois <= 12; $mois++) {
            $debut = Carbon::create($annee, $mois, 1)->startOfMonth();
            $fin = Carbon::create($annee, $mois, 1)->endOfMonth();
            
            $stats = AssistanceMedicale::active()
                ->whereBetween('date_assistance', [$debut, $fin])
                ->selectRaw('COUNT(*) as nombre, SUM(montant) as montant')
                ->first();
            
            $data[] = [
                'mois' => $mois,
                'mois_libelle' => $debut->locale('fr')->monthName,
                'nombre' => (int) ($stats->nombre ?? 0),
                'montant' => (float) ($stats->montant ?? 0)
            ];
        }
        
        return $data;
    }
}
