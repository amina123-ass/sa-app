<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CampagneRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $campaignId = $this->route('campagne') ? $this->route('campagne')->id : null;
        
        return [
            'nom' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'type_assistance_id' => 'required|exists:types_assistance,id',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after:date_debut',
            'lieu' => 'nullable|string|max:255',
            'budget' => 'nullable|numeric|min:0',
            'nombre_participants_prevu' => 'nullable|integer|min:1',
            'commentaires' => 'nullable|string|max:1000',
            'statut' => ['required', Rule::in(['active', 'inactive', 'en_cours', 'terminee', 'annulee'])],
        ];
    }

    public function messages()
    {
        return [
            'nom.required' => 'Le nom de la campagne est obligatoire.',
            'nom.max' => 'Le nom ne peut pas dépasser 255 caractères.',
            'type_assistance_id.required' => 'Le type d\'assistance est obligatoire.',
            'type_assistance_id.exists' => 'Le type d\'assistance sélectionné n\'existe pas.',
            'date_debut.required' => 'La date de début est obligatoire.',
            'date_debut.date' => 'La date de début doit être une date valide.',
            'date_fin.required' => 'La date de fin est obligatoire.',
            'date_fin.date' => 'La date de fin doit être une date valide.',
            'date_fin.after' => 'La date de fin doit être postérieure à la date de début.',
            'budget.numeric' => 'Le budget doit être un nombre.',
            'budget.min' => 'Le budget ne peut pas être négatif.',
            'nombre_participants_prevu.integer' => 'Le nombre de participants doit être un nombre entier.',
            'nombre_participants_prevu.min' => 'Le nombre de participants doit être au moins 1.',
            'statut.required' => 'Le statut est obligatoire.',
            'statut.in' => 'Le statut sélectionné n\'est pas valide.',
        ];
    }
}