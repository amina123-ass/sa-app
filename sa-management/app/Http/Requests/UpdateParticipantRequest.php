<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateParticipantRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'date_naissance' => 'required|date|before:today',
            'tel' => 'required|string|max:20',
            'adresse' => 'required|string|max:500',
            'situation_id' => 'nullable|exists:situations,id'
        ];
    }

    public function messages()
    {
        return [
            'nom.required' => 'Le nom est obligatoire',
            'prenom.required' => 'Le prénom est obligatoire',
            'date_naissance.required' => 'La date de naissance est obligatoire',
            'date_naissance.before' => 'La date de naissance doit être antérieure à aujourd\'hui',
            'tel.required' => 'Le téléphone est obligatoire',
            'adresse.required' => 'L\'adresse est obligatoire'
        ];
    }
}