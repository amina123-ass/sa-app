<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Kafala;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class CheckKafalaExpiration extends Command
{
    protected $signature = 'upas:check-kafala-expiration';
    protected $description = 'Vérifier les kafalas arrivant à échéance';

    public function handle()
    {
        $kafalasExpiringSoon = Kafala::actifs()
            ->where('date_fin', '<=', now()->addDays(30))
            ->where('date_fin', '>', now())
            ->with(['beneficiaire', 'responsable'])
            ->get();

        $this->info("Trouvé {$kafalasExpiringSoon->count()} kafala(s) arrivant à échéance dans les 30 prochains jours.");

        foreach ($kafalasExpiringSoon as $kafala) {
            $this->line("- {$kafala->numero_dossier} ({$kafala->beneficiaire->nom_complet}) - Expire le {$kafala->date_fin->format('d/m/Y')}");
            
            // Ici, vous pourriez envoyer un email de notification
            // Mail::to($kafala->responsable->email)->send(new KafalaExpirationNotification($kafala));
        }

        return 0;
    }
}