<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBeneficiaireRequest extends FormRequest
{
    public function authorize()
    {
        return auth()->check() && auth()->user()->role->libelle === 'Responsable UPAS';
    }

    public function rules()
    {
        return [
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'date_naissance' => 'required|date|before:today',
            'lieu_naissance' => 'required|string|max:255',
            'sexe' => 'required|in:M,F',
            'cin' => 'nullable|string|max:20|unique:beneficiaires,cin',
            'telephone' => 'nullable|string|max:20',
            'adresse' => 'required|string|max:500',
            'wilaya' => 'required|string|max:255',
            'daira' => 'required|string|max:255',
            'commune' => 'required|string|max:255',
            'profession' => 'nullable|string|max:255',
            'revenu_mensuel' => 'nullable|numeric|min:0',
            'nombre_enfants' => 'integer|min:0|max:20',
            'situation_familiale' => 'nullable|string|max:255'
        ];
    }

    public function messages()
    {
        return [
            'nom.required' => 'Le nom est obligatoire',
            'prenom.required' => 'Le prénom est obligatoire',
            'date_naissance.required' => 'La date de naissance est obligatoire',
            'date_naissance.before' => 'La date de naissance doit être antérieure à aujourd\'hui',
            'sexe.required' => 'Le sexe est obligatoire',
            'sexe.in' => 'Le sexe doit être M ou F',
            'cin.unique' => 'Ce numéro CIN existe déjà',
            'adresse.required' => 'L\'adresse est obligatoire',
            'wilaya.required' => 'La wilaya est obligatoire',
            'daira.required' => 'La daira est obligatoire',
            'commune.required' => 'La commune est obligatoire'
        ];
    }
}