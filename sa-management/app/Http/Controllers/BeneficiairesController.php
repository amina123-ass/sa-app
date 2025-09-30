<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Beneficiaire;
use App\Models\Campagne;
use App\Models\TypeAssistance;
use App\Exports\BeneficiairesExport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Exception;

class BeneficiairesController extends Controller
{
    /**
     * ✅ NOUVELLE MÉTHODE: Export Excel des bénéficiaires avec statut "oui"
     * 
     * @param Request $request
     * @param int $campagneId
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
     */
    public function exportExcel(Request $request, $campagneId)
    {
        try {
            Log::info('🚀 === DÉBUT EXPORT EXCEL ===', [
                'campagne_id' => $campagneId,
                'params' => $request->all()
            ]);

            // Validation des paramètres
            $validator = Validator::make(array_merge($request->all(), ['campagne_id' => $campagneId]), [
                'campagne_id' => 'required|integer|exists:campagnes,id',
                'status_filter' => 'nullable|string|in:oui,non,repondu,ne_repond_pas,non_contacte,en_attente,refuse',
                'include_additional_columns' => 'nullable|boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paramètres invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Récupérer la campagne
            $campagne = Campagne::with('typeAssistance')->findOrFail($campagneId);
            
            Log::info('✅ Campagne trouvée:', [
                'nom' => $campagne->nom,
                'type_assistance' => $campagne->typeAssistance->libelle ?? 'Non défini'
            ]);

            // Paramètres d'export
            $statusFilter = $request->get('status_filter', 'oui');
            $includeAdditionalColumns = $request->get('include_additional_columns', true);

            // ✅ REQUÊTE OPTIMISÉE POUR RÉCUPÉRER LES BÉNÉFICIAIRES
            $query = Beneficiaire::query()
                ->with(['campagne', 'typeAssistance'])
                ->where('campagne_id', $campagneId);

            // ✅ FILTRAGE AVANCÉ SELON LE STATUT
            if ($statusFilter === 'oui') {
                // Pour l'export demandé: participants avec statut "oui" (confirmé)
                $query->where(function($q) {
                    $q->where('statut_reception', 'oui')
                      ->orWhere('statut_preselection', 'repondu')
                      ->orWhere('decision', 'accepte')
                      ->orWhere(function($subQ) {
                          $subQ->whereNull('statut_reception')
                               ->whereNull('statut_preselection')
                               ->where('decision', 'accepte');
                      });
                });
            } else {
                // Autres filtres possibles
                if (in_array($statusFilter, ['non', 'repondu', 'ne_repond_pas', 'non_contacte', 'en_attente', 'refuse'])) {
                    $query->where(function($q) use ($statusFilter) {
                        $q->where('statut_reception', $statusFilter)
                          ->orWhere('statut_preselection', $statusFilter);
                    });
                }
            }

            $beneficiaires = $query->orderBy('nom')
                                 ->orderBy('prenom')
                                 ->get();

            Log::info('📊 Bénéficiaires récupérés:', [
                'total' => $beneficiaires->count(),
                'filtre_statut' => $statusFilter
            ]);

            if ($beneficiaires->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => "Aucun bénéficiaire trouvé avec le statut '{$statusFilter}' pour cette campagne."
                ], 404);
            }

            // ✅ DÉTERMINER LES COLONNES DYNAMIQUES
            $typeAssistance = $campagne->typeAssistance->libelle ?? '';
            $isAppareilsAuditifs = stripos($typeAssistance, 'auditif') !== false;

            Log::info('🎯 Configuration colonnes:', [
                'type_assistance' => $typeAssistance,
                'is_appareils_auditifs' => $isAppareilsAuditifs,
                'include_additional_columns' => $includeAdditionalColumns
            ]);

            // Générer le fichier Excel
            $fileName = $this->generateExcelFileName($campagne, $statusFilter);
            
            Log::info('📁 Génération fichier Excel:', [
                'nom_fichier' => $fileName,
                'nb_beneficiaires' => $beneficiaires->count()
            ]);

            // ✅ CRÉER L'EXPORT AVEC LES PARAMÈTRES DYNAMIQUES
            $export = new BeneficiairesExport(
                $beneficiaires, 
                $campagne, 
                $isAppareilsAuditifs, 
                $includeAdditionalColumns
            );

            Log::info('✅ === EXPORT EXCEL TERMINÉ AVEC SUCCÈS ===');

            return Excel::download($export, $fileName);

        } catch (Exception $e) {
            Log::error('❌ ERREUR EXPORT EXCEL:', [
                'campagne_id' => $campagneId,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ MÉTHODE: Générer le nom du fichier Excel
     */
    private function generateExcelFileName($campagne, $statusFilter = 'oui')
    {
        $campagneName = preg_replace('/[^A-Za-z0-9_-]/', '_', $campagne->nom);
        $dateStr = now()->format('Y-m-d');
        $timeStr = now()->format('H-i');
        
        return "beneficiaires_{$campagneName}_{$statusFilter}_{$dateStr}_{$timeStr}.xlsx";
    }

    /**
     * ✅ MÉTHODE EXISTANTE MODIFIÉE: Liste des bénéficiaires avec colonnes supplémentaires
     */
    public function index(Request $request)
    {
        try {
            Log::info('🔄 Chargement liste bénéficiaires', $request->all());

            // Validation
            $validator = Validator::make($request->all(), [
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100',
                'search' => 'nullable|string|max:255',
                'campagne_id' => 'nullable|integer|exists:campagnes,id',
                'type_assistance_id' => 'nullable|integer|exists:types_assistance,id',
                'sexe' => 'nullable|in:M,F',
                'decision' => 'nullable|in:accepte,refuse,en_attente,preselection_oui,preselection_non',
                'statut_preselection' => 'nullable|in:repondu,ne_repond_pas,non_contacte,en_attente',
                'enfants_scolarises' => 'nullable|boolean',
                'cote' => 'nullable|in:unilatéral,bilatéral',
                'a_beneficie' => 'nullable|boolean',
                'hors_campagne' => 'nullable|boolean',
                'sort_by' => 'nullable|in:created_at,updated_at,nom,prenom',
                'sort_dir' => 'nullable|in:asc,desc'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paramètres invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Construction de la requête
            $query = Beneficiaire::query()
                ->with([
                    'campagne:id,nom,type_assistance_id',
                    'typeAssistance:id,libelle',
                    'campagne.typeAssistance:id,libelle'
                ]);

            // ✅ AJOUT DES SÉLECTIONS POUR LES NOUVELLES COLONNES
            $query->select([
                'beneficiaires.*',
                // Assurer que les nouvelles colonnes sont incluses
                'enfants_scolarises',
                'decision',
                'cote',
                'lateralite',
                'statut_preselection',
                'commentaire_preselection',
                'date_contact',
                'heure_contact',
                'notes_contact'
            ]);

            // Filtres existants
            if ($request->filled('search')) {
                $search = $request->get('search');
                $query->where(function($q) use ($search) {
                    $q->where('nom', 'LIKE', "%{$search}%")
                      ->orWhere('prenom', 'LIKE', "%{$search}%")
                      ->orWhere('telephone', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%")
                      ->orWhere('adresse', 'LIKE', "%{$search}%");
                });
            }

            if ($request->filled('campagne_id')) {
                $query->where('campagne_id', $request->get('campagne_id'));
            }

            if ($request->filled('type_assistance_id')) {
                $query->where('type_assistance_id', $request->get('type_assistance_id'));
            }

            if ($request->filled('sexe')) {
                $query->where('sexe', $request->get('sexe'));
            }

            // ✅ FILTRE DÉCISION NORMALISÉ
            if ($request->filled('decision')) {
                $decision = $this->normalizeDecision($request->get('decision'));
                $query->where('decision', $decision);
            }

            // ✅ FILTRE STATUT PRÉSÉLECTION
            if ($request->filled('statut_preselection')) {
                $query->where('statut_preselection', $request->get('statut_preselection'));
            }

            // ✅ FILTRE ENFANTS SCOLARISÉS
            if ($request->has('enfants_scolarises')) {
                $enfantsScolarises = $request->boolean('enfants_scolarises');
                $query->where('enfants_scolarises', $enfantsScolarises);
            }

            // ✅ FILTRE CÔTÉ
            if ($request->filled('cote')) {
                $query->where('cote', $request->get('cote'));
            }

            if ($request->has('a_beneficie')) {
                $query->where('a_beneficie', $request->boolean('a_beneficie'));
            }

            if ($request->has('hors_campagne')) {
                $query->where('hors_campagne', $request->boolean('hors_campagne'));
            }

            // Tri
            $sortBy = $request->get('sort_by', 'created_at');
            $sortDir = $request->get('sort_dir', 'desc');
            $query->orderBy($sortBy, $sortDir);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $beneficiaires = $query->paginate($perPage);

            // ✅ ENRICHISSEMENT DES DONNÉES AVEC LES NOUVELLES COLONNES
            $beneficiaires->getCollection()->transform(function ($beneficiaire) {
                // Calculer l'âge
                if ($beneficiaire->date_naissance) {
                    $beneficiaire->age = \Carbon\Carbon::parse($beneficiaire->date_naissance)->age;
                }

                // Libellé du sexe
                $beneficiaire->sexe_libelle = $beneficiaire->sexe === 'M' ? 'Masculin' : 'Féminin';

                // Nom de la campagne
                $beneficiaire->campagne_nom = $beneficiaire->campagne->nom ?? null;

                // Type d'assistance
                $beneficiaire->type_assistance = $beneficiaire->typeAssistance->libelle ?? 
                    $beneficiaire->campagne->typeAssistance->libelle ?? null;

                // ✅ FORMATAGE DES NOUVELLES COLONNES
                $beneficiaire->enfants_scolarises_libelle = $beneficiaire->enfants_scolarises === null ? 'Non défini' : 
                    ($beneficiaire->enfants_scolarises ? 'Oui' : 'Non');

                $beneficiaire->decision_libelle = $this->getDecisionLabel($beneficiaire->decision);

                $beneficiaire->cote_libelle = $beneficiaire->cote ?: 'Non défini';

                // ✅ INDICATEUR SI C'EST UN TYPE AUDITIF
                $beneficiaire->is_appareils_auditifs = $beneficiaire->type_assistance && 
                    stripos($beneficiaire->type_assistance, 'auditif') !== false;

                return $beneficiaire;
            });

            return response()->json([
                'success' => true,
                'data' => $beneficiaires->items(),
                'pagination' => [
                    'current_page' => $beneficiaires->currentPage(),
                    'per_page' => $beneficiaires->perPage(),
                    'total' => $beneficiaires->total(),
                    'last_page' => $beneficiaires->lastPage(),
                    'from' => $beneficiaires->firstItem(),
                    'to' => $beneficiaires->lastItem()
                ]
            ]);

        } catch (Exception $e) {
            Log::error('❌ Erreur liste bénéficiaires:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des bénéficiaires'
            ], 500);
        }
    }

    /**
     * ✅ MÉTHODE UTILITAIRE: Normaliser les décisions
     */
    private function normalizeDecision($decision)
    {
        $mapping = [
            'accepté' => 'accepte',      // Enlever l'accent
            'accepte' => 'accepte',
            'refusé' => 'refuse',        // Enlever l'accent
            'refuse' => 'refuse',
            'en_attente' => 'en_attente',
            'preselection_oui' => 'preselection_oui',
            'preselection_non' => 'preselection_non'
        ];

        return $mapping[strtolower(trim($decision))] ?? $decision;
    }

    /**
     * ✅ MÉTHODE UTILITAIRE: Obtenir le libellé de la décision
     */
    private function getDecisionLabel($decision)
    {
        $labels = [
            'accepte' => 'Accepté',
            'refuse' => 'Refusé',
            'en_attente' => 'En attente',
            'preselection_oui' => 'Présélection - Oui',
            'preselection_non' => 'Présélection - Non'
        ];

        return $labels[$decision] ?? 'Non défini';
    }
}

// ===== 2. CLASSE D'EXPORT EXCEL - BeneficiairesExport.php =====
