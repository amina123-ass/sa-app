<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLunetteRequest extends FormRequest
{
    public function authorize()
    {
        return auth()->check() && auth()->user()->role->libelle === 'Responsable UPAS';
    }

    public function rules()
    {
        return [
            'beneficiaire_id' => 'required|exists:beneficiaires,id',
            'type_correction' => 'required|string|max:255',
            'oeil_droit_spherique' => 'nullable|string|max:50',
            'oeil_droit_cylindrique' => 'nullable|string|max:50',
            'oeil_droit_axe' => 'nullable|string|max:50',
            'oeil_gauche_spherique' => 'nullable|string|max:50',
            'oeil_gauche_cylindrique' => 'nullable|string|max:50',
            'oeil_gauche_axe' => 'nullable|string|max:50',
            'type_verre' => 'required|string|max:255',
            'type_monture' => 'required|string|max:255',
            'cout_estime' => 'required|numeric|min:0|max:100000',
            'opticien_recommande' => 'nullable|string|max:255',
            'observations_medicales' => 'nullable|string|max:2000',
            'date_prescription' => 'required|date|before_or_equal:today',
            'date_validite_prescription' => 'required|date|after:date_prescription|after:today',
            'situation_id' => 'required|exists:situations,id',
            'documents.*' => 'file|mimes:pdf,jpg,jpeg,png|max:5120'
        ];
    }

    public function messages()
    {
        return [
            'beneficiaire_id.required' => 'Le bénéficiaire est obligatoire',
            'type_correction.required' => 'Le type de correction est obligatoire',
            'type_verre.required' => 'Le type de verre est obligatoire',
            'type_monture.required' => 'Le type de monture est obligatoire',
            'cout_estime.required' => 'Le coût estimé est obligatoire',
            'cout_estime.max' => 'Le coût ne peut dépasser 100 000 DZD',
            'date_prescription.required' => 'La date de prescription est obligatoire',
            'date_prescription.before_or_equal' => 'La date de prescription ne peut être future',
            'date_validite_prescription.required' => 'La date de validité est obligatoire',
            'date_validite_prescription.after' => 'La date de validité doit être postérieure à la prescription et à aujourd\'hui',
            'situation_id.required' => 'La situation est obligatoire'
        ];
    }
}