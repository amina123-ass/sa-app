<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\AssistanceMedicale;
use App\Models\Beneficiaire;
use App\Models\CampagneMedicale;
use Carbon\Carbon;

class CleanupDataCommand extends Command
{
    protected $signature = 'upas:cleanup {--dry-run : Simuler sans effectuer les suppressions}';
    protected $description = 'Nettoyer les anciennes données supprimées';

    public function handle()
    {
        $isDryRun = $this->option('dry-run');
        $cutoffDate = Carbon::now()->subMonths(12); // Supprimer définitivement après 12 mois

        $this->info("🧹 Nettoyage des données antérieures au " . $cutoffDate->format('d/m/Y'));
        
        if ($isDryRun) {
            $this->warn("Mode simulation activé - aucune suppression ne sera effectuée");
        }

        // Nettoyer les assistances
        $assistancesToDelete = AssistanceMedicale::whereNotNull('date_suppression')
            ->where('date_suppression', '<', $cutoffDate)
            ->count();

        $this->line("Assistances à supprimer définitivement : {$assistancesToDelete}");

        if (!$isDryRun && $assistancesToDelete > 0) {
            AssistanceMedicale::whereNotNull('date_suppression')
                ->where('date_suppression', '<', $cutoffDate)
                ->forceDelete();
        }

        // Nettoyer les bénéficiaires (seulement s'ils n'ont plus d'assistances)
        $beneficiairesToCheck = Beneficiaire::whereNotNull('date_suppression')
            ->where('date_suppression', '<', $cutoffDate)
            ->doesntHave('assistancesMedicales')
            ->count();

        $this->line("Bénéficiaires à supprimer définitivement : {$beneficiairesToCheck}");

        if (!$isDryRun && $beneficiairesToCheck > 0) {
            Beneficiaire::whereNotNull('date_suppression')
                ->where('date_suppression', '<', $cutoffDate)
                ->doesntHave('assistancesMedicales')
                ->forceDelete();
        }

        // Nettoyer les campagnes terminées (seulement si pas d'assistances liées)
        $campagnesToCheck = CampagneMedicale::whereNotNull('date_suppression')
            ->where('date_suppression', '<', $cutoffDate)
            ->doesntHave('assistancesMedicales')
            ->count();

        $this->line("Campagnes à supprimer définitivement : {$campagnesToCheck}");

        if (!$isDryRun && $campagnesToCheck > 0) {
            CampagneMedicale::whereNotNull('date_suppression')
                ->where('date_suppression', '<', $cutoffDate)
                ->doesntHave('assistancesMedicales')
                ->forceDelete();
        }

        if ($isDryRun) {
            $this->info("✅ Simulation terminée. Utilisez sans --dry-run pour effectuer les suppressions.");
        } else {
            $this->info("✅ Nettoyage terminé avec succès.");
        }
    }
}