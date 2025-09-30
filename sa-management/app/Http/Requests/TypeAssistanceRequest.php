<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TypeAssistanceRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $typeAssistanceId = $this->route('type_assistance') ? $this->route('type_assistance')->id : null;
        
        return [
            'libelle' => [
                'required',
                'string',
                'max:255',
                Rule::unique('types_assistance', 'libelle')
                    ->ignore($typeAssistanceId)
                    ->whereNull('date_suppression')
            ],
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean'
        ];
    }

    public function messages()
    {
        return [
            'libelle.required' => 'Le libellé est obligatoire.',
            'libelle.unique' => 'Ce type d\'assistance existe déjà.',
            'libelle.max' => 'Le libellé ne peut pas dépasser 255 caractères.',
            'description.max' => 'La description ne peut pas dépasser 1000 caractères.',
            'is_active.boolean' => 'Le statut actif doit être vrai ou faux.'
        ];
    }

    public function prepareForValidation()
    {
        $this->merge([
            'libelle' => trim($this->libelle),
            'description' => trim($this->description),
            'is_active' => $this->is_active ?? true
        ]);
    }
}