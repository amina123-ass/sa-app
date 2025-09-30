<?php
// app/Http/Requests/UpdateBeneficiaireRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBeneficiaireRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'nom' => 'required|string|max:150',
            'prenom' => 'required|string|max:150',
            'date_naissance' => 'required|date|before:today',
            'tel' => 'required|string|max:20',
            'adresse' => 'required|string|max:500',
            'situation_id' => 'nullable|exists:situations,id',
        ];
    }

    public function messages()
    {
        return [
            'nom.required' => 'Le nom est obligatoire',
            'nom.max' => 'Le nom ne peut pas dépasser 150 caractères',
            'prenom.required' => 'Le prénom est obligatoire',
            'prenom.max' => 'Le prénom ne peut pas dépasser 150 caractères',
            'date_naissance.required' => 'La date de naissance est obligatoire',
            'date_naissance.date' => 'La date de naissance doit être une date valide',
            'date_naissance.before' => 'La date de naissance doit être antérieure à aujourd\'hui',
            'tel.required' => 'Le numéro de téléphone est obligatoire',
            'tel.max' => 'Le numéro de téléphone ne peut pas dépasser 20 caractères',
            'adresse.required' => 'L\'adresse est obligatoire',
            'adresse.max' => 'L\'adresse ne peut pas dépasser 500 caractères',
            'situation_id.exists' => 'La situation sélectionnée n\'existe pas',
        ];
    }
}