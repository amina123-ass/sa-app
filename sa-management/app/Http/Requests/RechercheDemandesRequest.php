<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RechercheDemandesRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'campagne_id' => 'nullable|exists:campagne_medicales,id',
            'type_assistance_id' => 'nullable|exists:type_assistances,id',
            'etat_don_id' => 'nullable|exists:etat_dones,id',
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date|after_or_equal:date_debut',
            'beneficiaire_nom' => 'nullable|string|max:255',
            'statut' => 'nullable|in:en_attente,realisee,annulee',
            'per_page' => 'nullable|integer|min:5|max:100'
        ];
    }

    public function messages()
    {
        return [
            'date_fin.after_or_equal' => 'La date de fin doit être postérieure ou égale à la date de début',
            'per_page.min' => 'Le nombre d\'éléments par page doit être au moins 5',
            'per_page.max' => 'Le nombre d\'éléments par page ne peut pas dépasser 100'
        ];
    }
}