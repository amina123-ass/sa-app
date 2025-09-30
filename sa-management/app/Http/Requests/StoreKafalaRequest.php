<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreKafalaRequest extends FormRequest
{
    public function authorize()
    {
        return true; // Add your authorization logic
    }

    public function rules()
    {
        return [
            'nom_pere' => 'required|string|min:2|max:255',
            'prenom_pere' => 'required|string|min:2|max:255',
            'cin_pere' => 'nullable|string|max:20',
            'nom_mere' => 'required|string|min:2|max:255',
            'prenom_mere' => 'required|string|min:2|max:255',
            'cin_mere' => 'nullable|string|max:20',
            'telephone' => 'required|string|min:10|max:20',
            'email' => 'required|email|max:255',
            'adresse' => 'required|string|max:500',
            'date_mariage' => 'nullable|date|before_or_equal:today',
            'nom_enfant' => 'required|string|min:2|max:255',
            'prenom_enfant' => 'required|string|min:2|max:255',
            'sexe_enfant' => 'required|in:M,F',
            'date_naissance_enfant' => 'nullable|date|before_or_equal:today',
            'cin_enfant' => 'nullable|string|max:20',
            'fichier_pdf' => 'nullable|file|mimes:pdf|max:5120',
            'commentaires' => 'nullable|string|max:1000'
        ];
    }

    protected function prepareForValidation()
    {
        // Clean and prepare data
        $this->merge([
            'nom_pere' => $this->trimField('nom_pere'),
            'prenom_pere' => $this->trimField('prenom_pere'),
            'nom_mere' => $this->trimField('nom_mere'),
            'prenom_mere' => $this->trimField('prenom_mere'),
            'nom_enfant' => $this->trimField('nom_enfant'),
            'prenom_enfant' => $this->trimField('prenom_enfant'),
            'email' => $this->email ? strtolower(trim($this->email)) : null,
            'telephone' => $this->trimField('telephone'),
            'adresse' => $this->trimField('adresse'),
        ]);
    }

    private function trimField($field)
    {
        return $this->{$field} ? trim($this->{$field}) : null;
    }
}