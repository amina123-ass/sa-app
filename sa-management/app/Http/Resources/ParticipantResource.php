<?php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ParticipantResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'nom' => $this->nom,
            'prenom' => $this->prenom,
            'nom_complet' => $this->nom . ' ' . $this->prenom,
            'date_naissance' => $this->date_naissance->format('d/m/Y'),
            'age' => $this->date_naissance->age,
            'tel' => $this->tel,
            'adresse' => $this->adresse,
            'campagne' => [
                'id' => $this->campagne->id ?? null,
                'libelle' => $this->campagne->libelle ?? null,
                'statut' => $this->campagne && $this->campagne->date_fin >= now() ? 'Active' : 'Terminée'
            ],
            'situation' => [
                'id' => $this->situation->id ?? null,
                'libelle' => $this->situation->libelle ?? 'Non définie'
            ],
            'created_at' => $this->created_at->format('d/m/Y H:i'),
            'updated_at' => $this->updated_at->format('d/m/Y H:i')
        ];
    }
}