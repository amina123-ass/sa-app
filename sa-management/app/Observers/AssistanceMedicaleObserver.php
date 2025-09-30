<?php
namespace App\Observers;

use App\Models\AssistanceMedicale;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

class AssistanceMedicaleObserver
{
    /**
     * Handle the AssistanceMedicale "created" event.
     */
    public function created(AssistanceMedicale $assistance)
    {
        Log::info('Nouvelle assistance créée', [
            'assistance_id' => $assistance->id,
            'beneficiaire_id' => $assistance->beneficiaire_id,
            'type_assistance_id' => $assistance->type_assistance_id,
            'montant' => $assistance->montant,
            'created_by' => auth()->id()
        ]);

        // Notifier les responsables
        NotificationService::notifyNewAssistance($assistance);
    }

    /**
     * Handle the AssistanceMedicale "updated" event.
     */
    public function updated(AssistanceMedicale $assistance)
    {
        Log::info('Assistance modifiée', [
            'assistance_id' => $assistance->id,
            'changes' => $assistance->getChanges(),
            'updated_by' => auth()->id()
        ]);
    }

    /**
     * Handle the AssistanceMedicale "deleted" event.
     */
    public function updated_date_suppression(AssistanceMedicale $assistance)
    {
        if ($assistance->wasChanged('date_suppression') && $assistance->date_suppression) {
            Log::warning('Assistance supprimée', [
                'assistance_id' => $assistance->id,
                'deleted_by' => auth()->id(),
                'deleted_at' => $assistance->date_suppression
            ]);
        }
    }
}