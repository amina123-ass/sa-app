<?php
// app/Http/Requests/CreateBeneficiaireRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateBeneficiaireRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $beneficiaireId = $this->route('id');

        return [
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'date_naissance' => 'required|date|before:today',
            'tel' => 'required|string|max:20',
            'email' => 'nullable|email|max:191',
            'adresse' => 'required|string|max:500',
            'sexe' => 'nullable|in:M,F',
            'cin' => [
                'nullable',
                'string',
                'max:20',
                'unique:beneficiaires,cin,' . $beneficiaireId . ',id,deleted_at,NULL'
            ],
            'situation_id' => 'nullable|exists:situations,id',
            'participant_id' => 'nullable|exists:participants,id'
        ];
    }

    public function messages()
    {
        return [
            'nom.required' => 'Le nom est obligatoire.',
            'nom.max' => 'Le nom ne peut pas dépasser 255 caractères.',
            'prenom.required' => 'Le prénom est obligatoire.',
            'prenom.max' => 'Le prénom ne peut pas dépasser 255 caractères.',
            'date_naissance.required' => 'La date de naissance est obligatoire.',
            'date_naissance.before' => 'La date de naissance doit être antérieure à aujourd\'hui.',
            'tel.required' => 'Le numéro de téléphone est obligatoire.',
            'tel.max' => 'Le numéro de téléphone ne peut pas dépasser 20 caractères.',
            'email.email' => 'L\'adresse email doit être valide.',
            'adresse.required' => 'L\'adresse est obligatoire.',
            'adresse.max' => 'L\'adresse ne peut pas dépasser 500 caractères.',
            'sexe.in' => 'Le sexe doit être M (Masculin) ou F (Féminin).',
            'cin.unique' => 'Ce numéro CIN est déjà utilisé par un autre bénéficiaire.',
            'cin.max' => 'Le numéro CIN ne peut pas dépasser 20 caractères.',
            'situation_id.exists' => 'La situation sélectionnée n\'existe pas.',
            'participant_id.exists' => 'Le participant sélectionné n\'existe pas.'
        ];
    }
}