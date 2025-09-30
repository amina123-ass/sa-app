<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BeneficiaireRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $beneficiaireId = $this->route('beneficiaire') ? $this->route('beneficiaire')->id : null;
        
        return [
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'adresse' => 'required|string|max:500',
            'telephone' => [
                'required',
                'string',
                'max:20',
                'regex:/^[0-9+\-\s\(\)]+$/',
                Rule::unique('beneficiaires', 'telephone')
                    ->ignore($beneficiaireId)
                    ->whereNull('date_suppression')
            ],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('beneficiaires', 'email')
                    ->ignore($beneficiaireId)
                    ->whereNull('date_suppression')
            ],
            'date_naissance' => 'nullable|date|before:today',
            'sexe' => 'required|in:M,F',
            'cin' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('beneficiaires', 'cin')
                    ->ignore($beneficiaireId)
                    ->whereNull('date_suppression')
            ],
            'campagne_id' => 'nullable|exists:campagnes_medicales,id',
            'type_assistance_id' => 'required|exists:types_assistance,id',
            'statut' => 'required|in:en_attente,oui,non,refuse',
            'commentaire' => 'nullable|string|max:1000',
            'hors_campagne' => 'boolean',
            'date_demande' => 'nullable|date'
        ];
    }

    public function messages()
    {
        return [
            'nom.required' => 'Le nom est obligatoire.',
            'prenom.required' => 'Le prénom est obligatoire.',
            'adresse.required' => 'L\'adresse est obligatoire.',
            'telephone.required' => 'Le numéro de téléphone est obligatoire.',
            'telephone.unique' => 'Ce numéro de téléphone est déjà utilisé.',
            'telephone.regex' => 'Le format du numéro de téléphone n\'est pas valide.',
            'email.email' => 'L\'adresse email n\'est pas valide.',
            'email.unique' => 'Cette adresse email est déjà utilisée.',
            'date_naissance.date' => 'La date de naissance n\'est pas valide.',
            'date_naissance.before' => 'La date de naissance doit être antérieure à aujourd\'hui.',
            'sexe.required' => 'Le sexe est obligatoire.',
            'sexe.in' => 'Le sexe doit être M ou F.',
            'cin.unique' => 'Cette CIN est déjà utilisée.',
            'campagne_id.exists' => 'La campagne sélectionnée n\'existe pas.',
            'type_assistance_id.required' => 'Le type d\'assistance est obligatoire.',
            'type_assistance_id.exists' => 'Le type d\'assistance sélectionné n\'existe pas.',
            'statut.required' => 'Le statut est obligatoire.',
            'statut.in' => 'Le statut doit être : en_attente, oui, non ou refuse.',
            'commentaire.max' => 'Le commentaire ne peut pas dépasser 1000 caractères.',
            'date_demande.date' => 'La date de demande n\'est pas valide.'
        ];
    }

    public function prepareForValidation()
    {
        // Nettoyage des données
        $this->merge([
            'nom' => trim(strtoupper($this->nom)),
            'prenom' => trim(ucfirst(strtolower($this->prenom))),
            'adresse' => trim($this->adresse),
            'telephone' => trim($this->telephone),
            'email' => trim(strtolower($this->email)),
            'cin' => trim(strtoupper($this->cin)),
            'commentaire' => trim($this->commentaire),
            'hors_campagne' => $this->hors_campagne ?? ($this->campagne_id ? false : true)
        ]);
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Validation personnalisée : si hors_campagne = false, campagne_id est obligatoire
            if (!$this->hors_campagne && !$this->campagne_id) {
                $validator->errors()->add('campagne_id', 'La campagne est obligatoire si le bénéficiaire n\'est pas hors campagne.');
            }
            
            // Validation : si une campagne est sélectionnée, vérifier que le type d'assistance correspond
            if ($this->campagne_id && $this->type_assistance_id) {
                $campagne = \App\Models\CampagneMedicale::find($this->campagne_id);
                if ($campagne && $campagne->type_assistance_id != $this->type_assistance_id) {
                    $validator->errors()->add('type_assistance_id', 'Le type d\'assistance doit correspondre à celui de la campagne sélectionnée.');
                }
            }
        });
    }
    public function attributes()
    {
        return [
            'nom' => 'Nom',
            'prenom' => 'Prénom',
            'adresse' => 'Adresse',
            'telephone' => 'Numéro de téléphone',
            'email' => 'Adresse email',
            'date_naissance' => 'Date de naissance',
            'sexe' => 'Sexe',
            'cin' => 'CIN',
            'campagne_id' => 'Campagne',
            'type_assistance_id' => 'Type d\'assistance',
            'statut' => 'Statut',
            'commentaire' => 'Commentaire',
            'hors_campagne' => 'Hors campagne',
            'date_demande' => 'Date de demande'
        ];
    }
}