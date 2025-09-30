<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class KafalaResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'pere' => [
                'nom' => $this->nom_pere,
                'prenom' => $this->prenom_pere,
                'cin' => $this->cin_pere,
                'nom_complet' => $this->nom_complet_pere,
            ],
            'mere' => [
                'nom' => $this->nom_mere,
                'prenom' => $this->prenom_mere,
                'cin' => $this->cin_mere,
                'nom_complet' => $this->nom_complet_mere,
            ],
            'enfant' => [
                'nom' => $this->nom_enfant,
                'prenom' => $this->prenom_enfant,
                'cin' => $this->cin_enfant,
                'sexe' => $this->sexe_enfant,
                'date_naissance' => $this->date_naissance_enfant?->format('Y-m-d'),
                'age' => $this->age_enfant,
                'nom_complet' => $this->nom_complet_enfant,
            ],
            'contact' => [
                'telephone' => $this->telephone,
                'email' => $this->email,
                'adresse' => $this->adresse,
            ],
            'mariage' => [
                'date' => $this->date_mariage?->format('Y-m-d'),
                'duree_annees' => $this->duree_mariage_annees,
            ],
            'fichier_pdf' => [
                'existe' => $this->a_fichier_pdf,
                'accessible' => $this->a_fichier_pdf && Storage::disk('public')->exists($this->fichier_pdf),
                'url' => $this->a_fichier_pdf ? route('kafalas.pdf', $this->id) : null,
            ],
            'commentaires' => $this->commentaires,
            'dates' => [
                'created_at' => $this->created_at?->toISOString(),
                'updated_at' => $this->updated_at?->toISOString(),
            ],
        ];
    }
}