<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreAssistanceRequest extends FormRequest
{
    public function authorize()
    {
        return Auth::check() && Auth::user()->role->libelle === 'Responsable UPAS';
    }

    public function rules()
    {
        return [
            // Informations générales
            'type_assistance' => 'required|in:medical,kafala,lunette,transport,appareillage,autre',
            'nom_beneficiaire' => 'required|string|max:255',
            'prenom_beneficiaire' => 'required|string|max:255',
            'date_naissance' => 'required|date|before:today',
            'lieu_naissance' => 'required|string|max:255',
            'sexe' => 'required|in:M,F',
            'telephone' => 'required|string|max:20',
            'adresse' => 'required|string|max:1000',
            'situation_familiale' => 'required|string|max:255',
            'situation_id' => 'nullable|exists:situations,id',

            // Assistance médicale
            'medical.diagnostic' => 'required_if:type_assistance,medical|string|max:500',
            'medical.prescription_medicale' => 'required_if:type_assistance,medical|string',
            'medical.montant_estime' => 'nullable|numeric|min:0',
            'medical.medecin_traitant' => 'nullable|string|max:255',
            'medical.etablissement_medical' => 'nullable|string|max:255',
            'medical.date_consultation' => 'nullable|date',
            'medical.observations' => 'nullable|string',

            // Kafala
            'kafala.montant_demande' => 'required_if:type_assistance,kafala|numeric|min:0',
            'kafala.motif_kafala' => 'required_if:type_assistance,kafala|string|max:500',
            'kafala.justification' => 'required_if:type_assistance,kafala|string',
            'kafala.duree_mois' => 'nullable|integer|min:1|max:60',
            'kafala.revenus_familiaux' => 'nullable|numeric|min:0',
            'kafala.nombre_enfants' => 'nullable|integer|min:0',
            'kafala.situation_economique' => 'nullable|string',

            // Lunettes
            'lunette.type_correction' => 'required_if:type_assistance,lunette|string|max:255',
            'lunette.oeil_droit_sphere' => 'nullable|string|max:10',
            'lunette.oeil_droit_cylindre' => 'nullable|string|max:10',
            'lunette.oeil_gauche_sphere' => 'nullable|string|max:10',
            'lunette.oeil_gauche_cylindre' => 'nullable|string|max:10',
            'lunette.type_verre' => 'required_if:type_assistance,lunette|string|max:255',
            'lunette.type_monture' => 'nullable|string|max:255',
            'lunette.montant_estime' => 'nullable|numeric|min:0',
            'lunette.opticien_recommande' => 'nullable|string|max:255',

            // Transport
            'transport.type_transport' => 'required_if:type_assistance,transport|string|max:255',
            'transport.destination' => 'required_if:type_assistance,transport|string|max:255',
            'transport.motif_deplacement' => 'required_if:type_assistance,transport|string',
            'transport.duree_validite_mois' => 'nullable|integer|min:1|max:24',
            'transport.montant_vignettes' => 'nullable|numeric|min:0',
            'transport.nombre_voyages_estime' => 'nullable|integer|min:1',
            'transport.trajet_habituel' => 'nullable|string',

            // Appareillage
            'appareillage.details_type_assistance_id' => 'nullable|exists:details_type_assistances,id',
            'appareillage.nature_done_id' => 'nullable|exists:nature_dones,id',
            'appareillage.etat_done_id' => 'nullable|exists:etat_dones,id',
            'appareillage.description_appareil' => 'required_if:type_assistance,appareillage|string',
            'appareillage.marque_modele' => 'nullable|string|max:255',
            'appareillage.prescription_medicale' => 'required_if:type_assistance,appareillage|string',
            'appareillage.fournisseur_recommande' => 'nullable|string|max:255',
            'appareillage.prix_estime' => 'nullable|numeric|min:0',
            'appareillage.date_besoin' => 'nullable|date|after_or_equal:today',
            'appareillage.observations' => 'nullable|string',

            // Autre assistance
            'autre.categorie' => 'required_if:type_assistance,autre|string|max:255',
            'autre.description_demande' => 'required_if:type_assistance,autre|string',
            'autre.justification' => 'required_if:type_assistance,autre|string',
            'autre.montant_estime' => 'nullable|numeric|min:0',
            'autre.organisme_partenaire' => 'nullable|string|max:255',
            'autre.date_echeance' => 'nullable|date|after_or_equal:today',
            'autre.observations' => 'nullable|string',

            // Documents
            'documents' => 'nullable|array',
            'documents.*' => 'file|max:10240|mimes:pdf,jpg,jpeg,png,doc,docx',
        ];
    }

    public function messages()
    {
        return [
            'type_assistance.required' => 'Le type d\'assistance est obligatoire.',
            'nom_beneficiaire.required' => 'Le nom du bénéficiaire est obligatoire.',
            'date_naissance.before' => 'La date de naissance doit être antérieure à aujourd\'hui.',
            'documents.*.max' => 'Chaque fichier ne doit pas dépasser 10 MB.',
            'documents.*.mimes' => 'Les fichiers autorisés sont : PDF, JPG, PNG, DOC, DOCX.',
        ];
    }
}