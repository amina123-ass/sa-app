<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RechercheAvanceeRequest extends FormRequest
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
            'montant_min' => 'nullable|numeric|min:0',
            'montant_max' => 'nullable|numeric|min:0|gte:montant_min'
        ];
    }

    public function messages()
    {
        return [
            'date_fin.after_or_equal' => 'La date de fin doit être postérieure ou égale à la date de début',
            'montant_min.numeric' => 'Le montant minimum doit être numérique',
            'montant_max.gte' => 'Le montant maximum doit être supérieur ou égal au montant minimum'
        ];
    }
}