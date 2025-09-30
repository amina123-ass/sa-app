<?php
namespace App\Services;

use App\Models\Participant;
use App\Models\CampagneMedicale;
use App\Models\AssistanceMedicale;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReceptionService
{
    /**
     * Statistiques rapides pour le dashboard
     */
    public static function getDashboardStats()
    {
        return [
            'participants_ce_mois' => Participant::active()
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count(),
            
            'demandes_en_cours' => AssistanceMedicale::active()
                ->whereHas('etatDon', function($query) {
                    $query->where('libelle', 'not like', '%validé%')
                          ->where('libelle', 'not like', '%refusé%')
                          ->where('libelle', 'not like', '%annulé%');
                })
                ->count(),
            
            'campagnes_ouvertes' => CampagneMedicale::active()
                ->where('date_debut', '<=', now())
                ->where('date_fin', '>=', now())
                ->count(),
            
            'taux_participation' => self::calculateParticipationRate()
        ];
    }

    /**
     * Calculer le taux de participation aux campagnes
     */
    private static function calculateParticipationRate()
    {
        $totalCampagnes = CampagneMedicale::active()
            ->where('date_debut', '<=', now())
            ->count();
        
        if ($totalCampagnes === 0) {
            return 0;
        }

        $campagnesAvecParticipants = CampagneMedicale::active()
            ->where('date_debut', '<=', now())
            ->whereHas('assistancesMedicales', function($query) {
                $query->whereNull('date_suppression');
            })
            ->count();

        return round(($campagnesAvecParticipants / $totalCampagnes) * 100, 2);
    }

    /**
     * Vérifier si un participant peut être ajouté à une campagne
     */
    public static function canAddParticipantToCampagne($campagne_id)
    {
        $campagne = CampagneMedicale::active()->find($campagne_id);
        
        if (!$campagne) {
            return ['can_add' => false, 'reason' => 'Campagne introuvable'];
        }

        if ($campagne->date_fin < now()) {
            return ['can_add' => false, 'reason' => 'Campagne terminée'];
        }

        if ($campagne->date_debut > now()) {
            return ['can_add' => false, 'reason' => 'Campagne pas encore commencée'];
        }

        return ['can_add' => true, 'reason' => null];
    }

    /**
     * Obtenir les dernières activités de réception
     */
    public static function getRecentActivities($limit = 10)
    {
        $participants = Participant::with('campagne')
            ->active()
            ->latest()
            ->take($limit)
            ->get()
            ->map(function($p) {
                return [
                    'type' => 'participant_added',
                    'message' => "Participant {$p->nom} {$p->prenom} ajouté à {$p->campagne->libelle}",
                    'date' => $p->created_at,
                    'icon' => 'user-plus'
                ];
            });

        $assistances = AssistanceMedicale::with(['beneficiaire', 'typeAssistance'])
            ->active()
            ->whereDate('created_at', '>=', Carbon::now()->subDays(3))
            ->latest()
            ->take($limit)
            ->get()
            ->map(function($a) {
                $beneficiaire = $a->beneficiaire ? 
                    $a->beneficiaire->nom . ' ' . $a->beneficiaire->prenom : 'N/A';
                
                return [
                    'type' => 'assistance_created',
                    'message' => "Assistance {$a->typeAssistance->libelle} pour {$beneficiaire}",
                    'date' => $a->created_at,
                    'icon' => 'heart'
                ];
            });

        return $participants->merge($assistances)
                          ->sortByDesc('date')
                          ->take($limit)
                          ->values();
    }

    /**
     * Exporter les données des participants
     */
    public static function exportParticipants($campagne_id = null, $format = 'array')
    {
        $query = Participant::with(['campagne', 'situation'])->active();
        
        if ($campagne_id) {
            $query->where('campagne_id', $campagne_id);
        }

        $participants = $query->orderBy('nom')->get();

        if ($format === 'csv') {
            return self::convertToCSV($participants);
        }

        return $participants->map(function($p) {
            return [
                'nom' => $p->nom,
                'prenom' => $p->prenom,
                'date_naissance' => $p->date_naissance->format('d/m/Y'),
                'age' => $p->date_naissance->age,
                'tel' => $p->tel,
                'adresse' => $p->adresse,
                'campagne' => $p->campagne->libelle ?? 'N/A',
                'situation' => $p->situation->libelle ?? 'Non définie',
                'date_inscription' => $p->created_at->format('d/m/Y H:i')
            ];
        });
    }

    /**
     * Convertir les données en format CSV
     */
    private static function convertToCSV($participants)
    {
        $headers = [
            'Nom', 'Prénom', 'Date de naissance', 'Âge', 'Téléphone', 
            'Adresse', 'Campagne', 'Situation', 'Date d\'inscription'
        ];

        $csv = implode(',', $headers) . "\n";

        foreach ($participants as $p) {
            $row = [
                $p->nom,
                $p->prenom,
                $p->date_naissance->format('d/m/Y'),
                $p->date_naissance->age,
                $p->tel,
                '"' . str_replace('"', '""', $p->adresse) . '"',
                $p->campagne->libelle ?? 'N/A',
                $p->situation->libelle ?? 'Non définie',
                $p->created_at->format('d/m/Y H:i')
            ];
            
            $csv .= implode(',', $row) . "\n";
        }

        return $csv;
    }

}