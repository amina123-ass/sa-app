<?php
// app/Http/Requests/CreateAssistanceRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateAssistanceRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'beneficiaire_id' => 'required|exists:beneficiaires,id',
            'type_assistance_id' => 'required|exists:type_assistances,id',
            'details_type_assistance_id' => [
                'nullable',
                'exists:details_type_assistances,id',
                Rule::exists('details_type_assistances', 'id')
                    ->where('type_assistance_id', $this->type_assistance_id)
            ],
            'campagne_id' => 'nullable|exists:campagne_medicales,id',
            'date_assistance' => 'required|date|before_or_equal:today',
            'montant' => 'nullable|numeric|min:0|max:999999.99',
            'observations' => 'nullable|string|max:1000',
            'remarque' => 'nullable|string|max:1000',
            'etat_don_id' => 'required|exists:etat_dones,id'
        ];
    }

    public function messages()
    {
        return [
            'beneficiaire_id.required' => 'Le bénéficiaire est obligatoire.',
            'beneficiaire_id.exists' => 'Le bénéficiaire sélectionné n\'existe pas.',
            'type_assistance_id.required' => 'Le type d\'assistance est obligatoire.',
            'type_assistance_id.exists' => 'Le type d\'assistance sélectionné n\'existe pas.',
            'details_type_assistance_id.exists' => 'Le détail du type d\'assistance sélectionné n\'existe pas ou ne correspond pas au type.',
            'campagne_id.exists' => 'La campagne sélectionnée n\'existe pas.',
            'date_assistance.required' => 'La date d\'assistance est obligatoire.',
            'date_assistance.before_or_equal' => 'La date d\'assistance ne peut pas être dans le futur.',
            'montant.numeric' => 'Le montant doit être un nombre.',
            'montant.min' => 'Le montant ne peut pas être négatif.',
            'montant.max' => 'Le montant ne peut pas dépasser 999 999,99.',
            'observations.max' => 'Les observations ne peuvent pas dépasser 1000 caractères.',
            'remarque.max' => 'La remarque ne peut pas dépasser 1000 caractères.',
            'etat_don_id.required' => 'L\'état du don est obligatoire.',
            'etat_don_id.exists' => 'L\'état du don sélectionné n\'existe pas.'
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Vérifier que le bénéficiaire n'est pas supprimé
            if ($this->beneficiaire_id) {
                $beneficiaire = \App\Models\Beneficiaire::find($this->beneficiaire_id);
                if ($beneficiaire && $beneficiaire->date_suppression) {
                    $validator->errors()->add('beneficiaire_id', 'Ce bénéficiaire n\'est plus actif.');
                }
            }

            // Vérifier que la campagne est active si fournie
            if ($this->campagne_id) {
                $campagne = \App\Models\CampagneMedicale::find($this->campagne_id);
                if ($campagne && $campagne->date_suppression) {
                    $validator->errors()->add('campagne_id', 'Cette campagne n\'est plus active.');
                }
            }
        });
    }
}