<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Participant;
use App\Models\CampagneMedicale;
use App\Services\ReceptionService;

class ReceptionStatsCommand extends Command
{
    protected $signature = 'reception:stats {--campagne=} {--export}';
    protected $description = 'Afficher les statistiques de réception';

    public function handle()
    {
        $campagneId = $this->option('campagne');
        $export = $this->option('export');

        $this->info("📊 Statistiques Réception");
        $this->line("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // Statistiques générales
        $stats = ReceptionService::getDashboardStats();
        
        $this->table(
            ['Indicateur', 'Valeur'],
            [
                ['Participants ce mois', $stats['participants_ce_mois']],
                ['Demandes en cours', $stats['demandes_en_cours']],
                ['Campagnes ouvertes', $stats['campagnes_ouvertes']],
                ['Taux de participation', $stats['taux_participation'] . '%'],
            ]
        );

        // Détails par campagne
        if ($campagneId) {
            $campagne = CampagneMedicale::find($campagneId);
            if ($campagne) {
                $participants = Participant::active()
                    ->where('campagne_id', $campagneId)
                    ->count();
                
                $this->line("\n📈 Détails campagne: {$campagne->libelle}");
                $this->line("Participants inscrits: {$participants}");
                
                if ($export) {
                    $data = ReceptionService::exportParticipants($campagneId, 'csv');
                    $filename = "participants_campagne_{$campagneId}_" . date('Y-m-d') . ".csv";
                    file_put_contents(storage_path("app/{$filename}"), $data);
                    $this->info("📁 Export sauvegardé: {$filename}");
                }
            }
        }

        $this->info("\n✅ Statistiques générées avec succès !");
    }
}