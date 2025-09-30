<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransportRequest extends FormRequest
{
    public function authorize()
    {
        return auth()->check() && auth()->user()->role->libelle === 'Responsable UPAS';
    }

    public function rules()
    {
        return [
            'beneficiaire_id' => 'required|exists:beneficiaires,id',
            'type_transport' => 'required|in:ambulance,transport_medical,vignette_transport',
            'destination' => 'required|string|max:255',
            'wilaya_destination' => 'required|string|max:255',
            'motif_deplacement' => 'required|string|max:1000',
            'date_aller' => 'required|date|after_or_equal:today',
            'date_retour' => 'nullable|date|after:date_aller',
            'accompagnateur_requis' => 'boolean',
            'nom_accompagnateur' => 'nullable|required_if:accompagnateur_requis,true|string|max:255',
            'distance_km' => 'nullable|numeric|min:0|max:3000',
            'cout_estime' => 'required|numeric|min:0|max:500000',
            'etablissement_destination' => 'required|string|max:255',
            'urgence_medicale' => 'nullable|string|max:1000',
            'situation_id' => 'required|exists:situations,id',
            'documents.*' => 'file|mimes:pdf,jpg,jpeg,png|max:5120'
        ];
    }

    public function messages()
    {
        return [
            'beneficiaire_id.required' => 'Le bénéficiaire est obligatoire',
            'type_transport.required' => 'Le type de transport est obligatoire',
            'type_transport.in' => 'Type de transport invalide',
            'destination.required' => 'La destination est obligatoire',
            'wilaya_destination.required' => 'La wilaya de destination est obligatoire',
            'motif_deplacement.required' => 'Le motif du déplacement est obligatoire',
            'date_aller.required' => 'La date d\'aller est obligatoire',
            'date_aller.after_or_equal' => 'La date d\'aller ne peut être antérieure à aujourd\'hui',
            'date_retour.after' => 'La date de retour doit être postérieure à la date d\'aller',
            'nom_accompagnateur.required_if' => 'Le nom de l\'accompagnateur est requis',
            'distance_km.max' => 'La distance ne peut dépasser 3000 km',
            'cout_estime.required' => 'Le coût estimé est obligatoire',
            'cout_estime.max' => 'Le coût ne peut dépasser 500 000 DZD',
            'etablissement_destination.required' => 'L\'établissement de destination est obligatoire',
            'situation_id.required' => 'La situation est obligatoire'
        ];
    }
}