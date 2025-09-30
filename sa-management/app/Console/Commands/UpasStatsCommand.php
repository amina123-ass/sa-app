<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\AssistanceMedicale;
use App\Models\Beneficiaire;
use App\Models\CampagneMedicale;

class UpasStatsCommand extends Command
{
    protected $signature = 'upas:stats {--month=} {--year=}';
    protected $description = 'Afficher les statistiques UPAS';

    public function handle()
    {
        $month = $this->option('month') ?? now()->month;
        $year = $this->option('year') ?? now()->year;

        $this->info("📊 Statistiques UPAS pour {$month}/{$year}");
        $this->line("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // Statistiques générales
        $totalBeneficiaires = Beneficiaire::whereNull('date_suppression')->count();
        $totalAssistances = AssistanceMedicale::whereNull('date_suppression')
            ->whereMonth('date_assistance', $month)
            ->whereYear('date_assistance', $year)
            ->count();
        
        $montantTotal = AssistanceMedicale::whereNull('date_suppression')
            ->whereMonth('date_assistance', $month)
            ->whereYear('date_assistance', $year)
            ->sum('montant');

        $this->table(
            ['Indicateur', 'Valeur'],
            [
                ['Total Bénéficiaires', $totalBeneficiaires],
                ['Assistances ce mois', $totalAssistances],
                ['Montant total (DA)', number_format($montantTotal, 2)],
            ]
        );

        // Répartition par type
        $repartition = AssistanceMedicale::join('type_assistances', 'assistance_medicales.type_assistance_id', '=', 'type_assistances.id')
            ->whereNull('assistance_medicales.date_suppression')
            ->whereMonth('assistance_medicales.date_assistance', $month)
            ->whereYear('assistance_medicales.date_assistance', $year)
            ->selectRaw('type_assistances.libelle, COUNT(*) as total, SUM(assistance_medicales.montant) as montant')
            ->groupBy('type_assistances.id', 'type_assistances.libelle')
            ->get();

        if ($repartition->count() > 0) {
            $this->line("\n📈 Répartition par type d'assistance:");
            $this->table(
                ['Type', 'Nombre', 'Montant (DA)'],
                $repartition->map(function($item) {
                    return [
                        $item->libelle,
                        $item->total,
                        number_format($item->montant ?? 0, 2)
                    ];
                })->toArray()
            );
        }

        $this->info("\n✅ Statistiques générées avec succès !");
    }
}