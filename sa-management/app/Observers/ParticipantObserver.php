<?php
namespace App\Observers;

use App\Models\Participant;
use Illuminate\Support\Facades\Log;

class ParticipantObserver
{
    /**
     * Handle the Participant "created" event.
     */
    public function created(Participant $participant)
    {
        Log::info('Nouveau participant créé', [
            'participant_id' => $participant->id,
            'nom' => $participant->nom,
            'prenom' => $participant->prenom,
            'campagne_id' => $participant->campagne_id,
            'created_by' => auth()->id()
        ]);
    }

    /**
     * Handle the Participant "updated" event.
     */
    public function updated(Participant $participant)
    {
        Log::info('Participant modifié', [
            'participant_id' => $participant->id,
            'changes' => $participant->getChanges(),
            'updated_by' => auth()->id()
        ]);
    }

    /**
     * Handle the Participant "deleted" event (soft delete).
     */
    public function updating(Participant $participant)
    {
        if ($participant->isDirty('date_suppression') && $participant->date_suppression) {
            Log::warning('Participant supprimé', [
                'participant_id' => $participant->id,
                'nom' => $participant->nom,
                'prenom' => $participant->prenom,
                'deleted_by' => auth()->id(),
                'deleted_at' => $participant->date_suppression
            ]);
        }
    }
}