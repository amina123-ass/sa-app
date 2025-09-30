<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class KafalaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $rules = [
            // Informations du père
            'nom_pere' => 'required|string|max:255',
            'prenom_pere' => 'required|string|max:255',
            'cin_pere' => 'nullable|string|max:20',
            
            // Informations de la mère
            'nom_mere' => 'required|string|max:255',
            'prenom_mere' => 'required|string|max:255',
            'cin_mere' => 'nullable|string|max:20',
            
            // Informations de contact
            'telephone' => 'required|string|max:20',
            'email' => 'required|email|max:255',
            'adresse' => 'required|string',
            
            // Date de mariage
            'date_mariage' => 'nullable|date',
            
            // Informations de l'enfant
            'nom_enfant' => 'required|string|max:255',
            'prenom_enfant' => 'required|string|max:255',
            'sexe_enfant' => 'required|in:M,F',
            'date_naissance_enfant' => 'nullable|date',
            'cin_enfant' => 'nullable|string|max:20',
            
            // Fichier PDF
            'fichier_pdf' => 'nullable|file|mimes:pdf|max:10240', // 10MB max
            
            // Commentaires
            'commentaires' => 'nullable|string',
        ];

        // Règles spécifiques pour la mise à jour
        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $kafalaId = $this->route('id');
            
            // Si c'est une mise à jour, le fichier PDF n'est pas obligatoire
            $rules['fichier_pdf'] = 'nullable|file|mimes:pdf|max:10240';
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors in Arabic.
     */
    public function messages(): array
    {
        return [
            // Messages pour le père
            'nom_pere.required' => 'اسم الأب مطلوب',
            'nom_pere.string' => 'اسم الأب يجب أن يكون نصاً',
            'nom_pere.max' => 'اسم الأب لا يمكن أن يتجاوز 255 حرفاً',
            'prenom_pere.required' => 'الاسم الشخصي للأب مطلوب',
            'prenom_pere.string' => 'الاسم الشخصي للأب يجب أن يكون نصاً',
            'prenom_pere.max' => 'الاسم الشخصي للأب لا يمكن أن يتجاوز 255 حرفاً',
            'cin_pere.string' => 'رقم البطاقة الوطنية للأب يجب أن يكون نصاً',
            'cin_pere.max' => 'رقم البطاقة الوطنية للأب لا يمكن أن يتجاوز 20 حرفاً',
            
            // Messages pour la mère
            'nom_mere.required' => 'اسم الأم مطلوب',
            'nom_mere.string' => 'اسم الأم يجب أن يكون نصاً',
            'nom_mere.max' => 'اسم الأم لا يمكن أن يتجاوز 255 حرفاً',
            'prenom_mere.required' => 'الاسم الشخصي للأم مطلوب',
            'prenom_mere.string' => 'الاسم الشخصي للأم يجب أن يكون نصاً',
            'prenom_mere.max' => 'الاسم الشخصي للأم لا يمكن أن يتجاوز 255 حرفاً',
            'cin_mere.string' => 'رقم البطاقة الوطنية للأم يجب أن يكون نصاً',
            'cin_mere.max' => 'رقم البطاقة الوطنية للأم لا يمكن أن يتجاوز 20 حرفاً',
            
            // Messages pour les contacts
            'telephone.required' => 'رقم الهاتف مطلوب',
            'telephone.string' => 'رقم الهاتف يجب أن يكون نصاً',
            'telephone.max' => 'رقم الهاتف لا يمكن أن يتجاوز 20 حرفاً',
            'email.required' => 'البريد الإلكتروني مطلوب',
            'email.email' => 'البريد الإلكتروني غير صحيح',
            'email.max' => 'البريد الإلكتروني لا يمكن أن يتجاوز 255 حرفاً',
            'adresse.required' => 'العنوان مطلوب',
            'adresse.string' => 'العنوان يجب أن يكون نصاً',
            
            // Messages pour التاريخ
            'date_mariage.date' => 'تاريخ الزواج غير صحيح',
            'date_naissance_enfant.date' => 'تاريخ ولادة الطفل غير صحيح',
            
            // Messages pour l'enfant
            'nom_enfant.required' => 'اسم الطفل مطلوب',
            'nom_enfant.string' => 'اسم الطفل يجب أن يكون نصاً',
            'nom_enfant.max' => 'اسم الطفل لا يمكن أن يتجاوز 255 حرفاً',
            'prenom_enfant.required' => 'الاسم الشخصي للطفل مطلوب',
            'prenom_enfant.string' => 'الاسم الشخصي للطفل يجب أن يكون نصاً',
            'prenom_enfant.max' => 'الاسم الشخصي للطفل لا يمكن أن يتجاوز 255 حرفاً',
            'sexe_enfant.required' => 'جنس الطفل مطلوب',
            'sexe_enfant.in' => 'جنس الطفل يجب أن يكون ذكر أو أنثى',
            'cin_enfant.string' => 'رقم البطاقة الوطنية للطفل يجب أن يكون نصاً',
            'cin_enfant.max' => 'رقم البطاقة الوطنية للطفل لا يمكن أن يتجاوز 20 حرفاً',
            
            // Messages pour le fichier
            'fichier_pdf.file' => 'يجب أن يكون الملف صحيحاً',
            'fichier_pdf.mimes' => 'الملف يجب أن يكون من نوع PDF',
            'fichier_pdf.max' => 'حجم الملف لا يمكن أن يتجاوز 10 ميجابايت',
            
            // Messages pour les commentaires
            'commentaires.string' => 'التعليقات يجب أن تكون نصاً',
        ];
    }

    /**
     * Get custom attribute names in Arabic.
     */
    public function attributes(): array
    {
        return [
            'nom_pere' => 'اسم الأب',
            'prenom_pere' => 'الاسم الشخصي للأب',
            'cin_pere' => 'رقم البطاقة الوطنية للأب',
            'nom_mere' => 'اسم الأم',
            'prenom_mere' => 'الاسم الشخصي للأم',
            'cin_mere' => 'رقم البطاقة الوطنية للأم',
            'telephone' => 'رقم الهاتف',
            'email' => 'البريد الإلكتروني',
            'adresse' => 'العنوان',
            'date_mariage' => 'تاريخ الزواج',
            'nom_enfant' => 'اسم الطفل',
            'prenom_enfant' => 'الاسم الشخصي للطفل',
            'sexe_enfant' => 'جنس الطفل',
            'date_naissance_enfant' => 'تاريخ ولادة الطفل',
            'cin_enfant' => 'رقم البطاقة الوطنية للطفل',
            'fichier_pdf' => 'ملف PDF',
            'commentaires' => 'التعليقات',
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'خطأ في البيانات المدخلة',
            'errors' => $validator->errors()
        ], 422));
    }
}