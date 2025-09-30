<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssistanceMedicaleRequest extends FormRequest
{
    public function authorize()
    {
        return auth()->check() && auth()->user()->role->libelle === 'Responsable UPAS';
    }

    public function rules()
    {
        return [
            'beneficiaire_id' => 'required|exists:beneficiaires,id',
            'pathologie' => 'required|string|max:1000',
            'diagnostic_medical' => 'required|string|max:1000',
            'medecin_traitant' => 'required|string|max:255',
            'etablissement_medical' => 'required|string|max:255',
            'cout_traitement' => 'required|numeric|min:0',
            'montant_demande' => 'required|numeric|min:0',
            'urgence' => 'required|in:faible,moyenne,elevee,critique',
            'date_demande' => 'required|date',
            'date_limite_traitement' => 'nullable|date|after:date_demande',
            'situation_id' => 'required|exists:situations,id',
            'observations' => 'nullable|string|max:2000',
            'documents.*' => 'file|mimes:pdf,jpg,jpeg,png|max:5120' // 5MB max
        ];
    }

    public function messages()
    {
        return [
            'beneficiaire_id.required' => 'Le bénéficiaire est obligatoire',
            'beneficiaire_id.exists' => 'Le bénéficiaire sélectionné n\'existe pas',
            'pathologie.required' => 'La pathologie est obligatoire',
            'diagnostic_medical.required' => 'Le diagnostic médical est obligatoire',
            'medecin_traitant.required' => 'Le médecin traitant est obligatoire',
            'etablissement_medical.required' => 'L\'établissement médical est obligatoire',
            'cout_traitement.required' => 'Le coût du traitement est obligatoire',
            'cout_traitement.numeric' => 'Le coût doit être un nombre',
            'montant_demande.required' => 'Le montant demandé est obligatoire',
            'urgence.required' => 'Le niveau d\'urgence est obligatoire',
            'date_demande.required' => 'La date de demande est obligatoire',
            'situation_id.required' => 'La situation est obligatoire',
            'documents.*.mimes' => 'Les documents doivent être au format PDF, JPG, JPEG ou PNG',
            'documents.*.max' => 'Chaque document ne doit pas dépasser 5MB'
        ];
    }
}