<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateCampagneRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'libelle' => 'required|string|max:255',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after:date_debut',
            'description' => 'nullable|string|max:1000'
        ];
    }

    public function messages()
    {
        return [
            'libelle.required' => 'Le libellé est obligatoire',
            'date_debut.required' => 'La date de début est obligatoire',
            'date_fin.required' => 'La date de fin est obligatoire',
            'date_fin.after' => 'La date de fin doit être postérieure à la date de début'
        ];
    }
}