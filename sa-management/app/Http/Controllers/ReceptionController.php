<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\CampagneMedicale;
use App\Models\Participant;
use App\Models\LogAppel;
use App\Models\Beneficiaire;
use App\Models\TypeAssistance;
use App\Models\User;
use Maatwebsite\Excel\Facades\Excel;
use PDF;
use Exception;

class ReceptionController extends Controller
{
    /**
     * Test de connexion à la base de données
     */
    public function testConnection()
    {
        try {
            DB::connection()->getPdo();
            $dbName = DB::connection()->getDatabaseName();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Connexion à la base de données réussie',
                'database' => $dbName,
                'timestamp' => now()
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur de connexion à la base de données',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ===== DASHBOARD =====
    public function dashboard()
    {
        try {
            // Statistiques des participants par statut
            $participantsStats = DB::table('participants')
                ->select('statut', DB::raw('count(*) as total'))
                ->whereNull('date_suppression')
                ->groupBy('statut')
                ->pluck('total', 'statut')
                ->toArray();

            $stats = [
                'total_campagnes' => DB::table('campagnes_medicales')
                    ->whereNull('date_suppression')
                    ->count(),
                'total_participants' => DB::table('participants')
                    ->whereNull('date_suppression')
                    ->count(),
                'total_beneficiaires' => DB::table('beneficiaires')
                    ->whereNull('date_suppression')
                    ->count(),
                'total_types_assistance' => DB::table('types_assistance')
                    ->whereNull('date_suppression')
                    ->count(),
                // Nouveaux statuts
                'repondu_count' => $participantsStats['répondu'] ?? 0,
                'ne_repond_pas_count' => $participantsStats['ne repond pas'] ?? 0,
                'non_contacte_count' => $participantsStats['non contacté'] ?? 0,
                // Anciens statuts pour compatibilité
                'participants_oui' => $participantsStats['oui'] ?? 0,
                'participants_non' => $participantsStats['non'] ?? 0,
                'participants_en_attente' => $participantsStats['en_attente'] ?? 0,
                'participants_refuse' => $participantsStats['refuse'] ?? 0
            ];

            // Campagnes récentes
            $campagnes_recentes = DB::table('campagnes_medicales')
                ->leftJoin('participants', 'campagnes_medicales.id', '=', 'participants.campagne_id')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select(
                    'campagnes_medicales.id',
                    'campagnes_medicales.nom',
                    'campagnes_medicales.description',
                    'campagnes_medicales.date_debut',
                    'campagnes_medicales.date_fin',
                    'campagnes_medicales.statut',
                    'campagnes_medicales.budget',
                    'types_assistance.libelle as type_assistance',
                    DB::raw('COUNT(participants.id) as nombre_participants')
                )
                ->whereNull('campagnes_medicales.date_suppression')
                ->whereNull('participants.date_suppression')
                ->groupBy([
                    'campagnes_medicales.id',
                    'campagnes_medicales.nom',
                    'campagnes_medicales.description',
                    'campagnes_medicales.date_debut',
                    'campagnes_medicales.date_fin',
                    'campagnes_medicales.statut',
                    'campagnes_medicales.budget',
                    'types_assistance.libelle'
                ])
                ->orderBy('campagnes_medicales.created_at', 'desc')
                ->limit(5)
                ->get();

            return response()->json([
                'success' => true,
                'stats' => $stats,
                'campagnes_recentes' => $campagnes_recentes
            ]);

        } catch (Exception $e) {
            Log::error('Erreur dashboard réception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement du dashboard',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ===== GESTION DES CAMPAGNES =====
    
    
    public function getCampagne($id)
    {
        try {
            $campagne = DB::table('campagnes_medicales')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select(
                    'campagnes_medicales.*',
                    'types_assistance.libelle as type_assistance'
                )
                ->where('campagnes_medicales.id', $id)
                ->whereNull('campagnes_medicales.date_suppression')
                ->first();

            if (!$campagne) {
                return response()->json([
                    'success' => false,
                    'message' => 'Campagne non trouvée'
                ], 404);
            }

            // Statistiques des participants avec nouveaux statuts
            $participantsStats = DB::table('participants')
                ->select('statut', DB::raw('count(*) as total'))
                ->where('campagne_id', $id)
                ->whereNull('date_suppression')
                ->groupBy('statut')
                ->pluck('total', 'statut')
                ->toArray();

            $campagne->participants_stats = [
                'total' => array_sum($participantsStats),
                // Nouveaux statuts
                'repondu' => $participantsStats['répondu'] ?? 0,
                'ne_repond_pas' => $participantsStats['ne repond pas'] ?? 0,
                'non_contacte' => $participantsStats['non contacté'] ?? 0,
                // Anciens statuts pour compatibilité
                'oui' => $participantsStats['oui'] ?? 0,
                'non' => $participantsStats['non'] ?? 0,
                'en_attente' => $participantsStats['en_attente'] ?? 0,
                'refuse' => $participantsStats['refuse'] ?? 0
            ];

            return response()->json([
                'success' => true,
                'data' => $campagne
            ]);

        } catch (Exception $e) {
            Log::error('Erreur getCampagne', ['error' => $e->getMessage(), 'id' => $id]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement de la campagne',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function createCampagne(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type_assistance_id' => 'required|exists:types_assistance,id',
            'date_debut' => 'required|date|after_or_equal:today',
            'date_fin' => 'required|date|after:date_debut',
            'lieu' => 'nullable|string|max:255',
            'budget' => 'nullable|numeric|min:0',
            'nombre_participants_prevu' => 'nullable|integer|min:1',
            'prix_unitaire' => 'nullable|numeric|min:0',
            'commentaires' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $campagneId = DB::table('campagnes_medicales')->insertGetId([
                'nom' => $request->nom,
                'description' => $request->description,
                'type_assistance_id' => $request->type_assistance_id,
                'date_debut' => $request->date_debut,
                'date_fin' => $request->date_fin,
                'lieu' => $request->lieu,
                'statut' => 'Active',
                'budget' => $request->budget,
                'nombre_participants_prevu' => $request->nombre_participants_prevu,
                'nombre_participants_actuel' => 0,
                'prix_unitaire' => $request->prix_unitaire,
                'commentaires' => $request->commentaires,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Récupérer la campagne créée
            $campagne = DB::table('campagnes_medicales')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select(
                    'campagnes_medicales.*',
                    'types_assistance.libelle as type_assistance'
                )
                ->where('campagnes_medicales.id', $campagneId)
                ->first();

            DB::commit();

            Log::info('Nouvelle campagne créée', [
                'campagne_id' => $campagneId,
                'nom' => $request->nom,
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Campagne créée avec succès',
                'data' => $campagne
            ], 201);

        } catch (Exception $e) {
            DB::rollback();
            Log::error('Erreur création campagne', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la campagne',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ===== GESTION DES PARTICIPANTS =====
    
    public function getParticipants(Request $request)
    {
        try {
            $query = DB::table('participants')
                ->leftJoin('campagnes_medicales', 'participants.campagne_id', '=', 'campagnes_medicales.id')
                ->select(
                    'participants.id',
                    'participants.nom',
                    'participants.prenom',
                    'participants.adresse',
                    'participants.telephone',
                    'participants.email',
                    'participants.date_naissance',
                    'participants.sexe',
                    'participants.cin',
                    'participants.statut',
                    'participants.commentaire',
                    'participants.date_appel',
                    'participants.created_at',
                    'participants.updated_at',
                    'campagnes_medicales.nom as campagne_nom'
                )
                ->whereNull('participants.date_suppression');

            // Filtres
            if ($request->filled('campagne_id')) {
                $query->where('participants.campagne_id', $request->campagne_id);
            }

            if ($request->filled('statut')) {
                $query->where('participants.statut', $request->statut);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('participants.nom', 'like', "%{$search}%")
                      ->orWhere('participants.prenom', 'like', "%{$search}%")
                      ->orWhere('participants.telephone', 'like', "%{$search}%")
                      ->orWhere('participants.adresse', 'like', "%{$search}%");
                });
            }

            // Tri
            $sortBy = $request->get('sort_by', 'created_at');
            $sortDir = $request->get('sort_dir', 'desc');
            
            $allowedSortColumns = ['nom', 'prenom', 'statut', 'date_appel', 'created_at'];
            if (in_array($sortBy, $allowedSortColumns)) {
                $query->orderBy('participants.' . $sortBy, $sortDir);
            } else {
                $query->orderBy('participants.created_at', 'desc');
            }

            // Pagination
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            $offset = ($page - 1) * $perPage;

            $totalCount = clone $query;
            $total = $totalCount->count();
            
            $participants = $query->limit($perPage)->offset($offset)->get();

            // Ajouter les labels de statut
            $participants = $participants->map(function($participant) {
                $participant->statut_label = $this->getStatutLabel($participant->statut);
                $participant->nom_complet = $participant->prenom . ' ' . $participant->nom;
                return $participant;
            });

            return response()->json([
                'success' => true,
                'data' => $participants,
                'pagination' => [
                    'current_page' => (int)$page,
                    'per_page' => (int)$perPage,
                    'total' => $total,
                    'last_page' => ceil($total / $perPage)
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Erreur getParticipants', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des participants',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getParticipant($id)
    {
        try {
            $participant = DB::table('participants')
                ->leftJoin('campagnes_medicales', 'participants.campagne_id', '=', 'campagnes_medicales.id')
                ->select(
                    'participants.*',
                    'campagnes_medicales.nom as campagne_nom'
                )
                ->where('participants.id', $id)
                ->whereNull('participants.date_suppression')
                ->first();

            if (!$participant) {
                return response()->json([
                    'success' => false,
                    'message' => 'Participant non trouvé'
                ], 404);
            }

            // Historique des appels
            $logAppels = DB::table('log_appels')
                ->leftJoin('users', 'log_appels.user_id', '=', 'users.id')
                ->select(
                    'log_appels.*',
                    'users.nom_user',
                    'users.prenom_user'
                )
                ->where('log_appels.participant_id', $id)
                ->whereNull('log_appels.date_suppression')
                ->orderBy('log_appels.created_at', 'desc')
                ->get();

            $participant->log_appels = $logAppels;

            return response()->json([
                'success' => true,
                'data' => $participant
            ]);

        } catch (Exception $e) {
            Log::error('Erreur getParticipant', ['error' => $e->getMessage(), 'id' => $id]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement du participant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function createParticipant(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:100',
            'prenom' => 'required|string|max:100',
            'adresse' => 'required|string|max:255',
            'telephone' => 'required|string|max:20',
            'email' => 'nullable|email|max:191',
            'date_naissance' => 'nullable|date|before:today',
            'sexe' => 'nullable|in:M,F',
            'cin' => 'nullable|string|max:20',
            'campagne_id' => 'required|exists:campagnes_medicales,id',
            'commentaire' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Vérifier si le participant existe déjà
            $existant = DB::table('participants')
                ->where('nom', $request->nom)
                ->where('prenom', $request->prenom)
                ->where('telephone', $request->telephone)
                ->whereNull('date_suppression')
                ->first();

            if ($existant) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce participant existe déjà',
                    'action' => 'exists'
                ], 409);
            }

            // Créer nouveau participant
            $participantId = DB::table('participants')->insertGetId([
                'nom' => $request->nom,
                'prenom' => $request->prenom,
                'adresse' => $request->adresse,
                'telephone' => $request->telephone,
                'email' => $request->email,
                'date_naissance' => $request->date_naissance,
                'sexe' => $request->sexe,
                'cin' => $request->cin,
                'statut' => 'non contacté',
                'commentaire' => $request->commentaire,
                'campagne_id' => $request->campagne_id,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            DB::commit();

            Log::info('Nouveau participant créé', [
                'participant_id' => $participantId,
                'campagne_id' => $request->campagne_id,
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Participant créé avec succès',
                'data' => ['id' => $participantId],
                'action' => 'created'
            ], 201);

        } catch (Exception $e) {
            DB::rollback();
            Log::error('Erreur création participant', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du participant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateStatutParticipant(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'statut' => 'required|in:répondu,ne repond pas,non contacté,en_attente,oui,non,refuse',
            'commentaire' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $participant = DB::table('participants')
                ->where('id', $id)
                ->whereNull('date_suppression')
                ->first();

            if (!$participant) {
                return response()->json([
                    'success' => false,
                    'message' => 'Participant non trouvé'
                ], 404);
            }

            $statutAvant = $participant->statut;

            // Log de l'appel
            DB::table('log_appels')->insert([
                'participant_id' => $id,
                'user_id' => Auth::id(),
                'statut_avant' => $statutAvant,
                'statut_apres' => $request->statut,
                'commentaire' => $request->commentaire,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Mise à jour du participant
            DB::table('participants')
                ->where('id', $id)
                ->update([
                    'statut' => $request->statut,
                    'commentaire' => $request->commentaire,
                    'date_appel' => now(),
                    'updated_at' => now()
                ]);

            DB::commit();

            Log::info('Statut participant mis à jour', [
                'participant_id' => $id,
                'statut_avant' => $statutAvant,
                'statut_apres' => $request->statut,
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Statut mis à jour avec succès'
            ]);

        } catch (Exception $e) {
            DB::rollback();
            Log::error('Erreur mise à jour statut participant', [
                'error' => $e->getMessage(),
                'participant_id' => $id,
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du statut',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ===== TYPES D'ASSISTANCE =====
    public function getTypesAssistance()
    {
        try {
            $types = DB::table('types_assistance')
                ->select('id', 'libelle', 'description')
                ->whereNull('date_suppression')
                ->where('is_active', true)
                ->orderBy('libelle')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $types
            ]);

        } catch (Exception $e) {
            Log::error('Erreur getTypesAssistance', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des types d\'assistance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ===== IMPORT EXCEL =====
    
    // ===== EXPORT CSV =====
    public function exportCSV(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'campagne_id' => 'required|exists:campagnes_medicales,id',
            'statut' => 'nullable|in:répondu,ne repond pas,non contacté,en_attente,oui,non,refuse'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $campagne = DB::table('campagnes_medicales')
                ->where('id', $request->campagne_id)
                ->first();

            if (!$campagne) {
                return response()->json([
                    'success' => false,
                    'message' => 'Campagne non trouvée'
                ], 404);
            }

            $query = DB::table('participants')
                ->leftJoin('campagnes_medicales', 'participants.campagne_id', '=', 'campagnes_medicales.id')
                ->select(
                    'participants.*',
                    'campagnes_medicales.nom as campagne_nom'
                )
                ->where('participants.campagne_id', $request->campagne_id)
                ->whereNull('participants.date_suppression');

            if ($request->statut) {
                $query->where('participants.statut', $request->statut);
            }

            $participants = $query->orderBy('participants.nom')->get();

            $filename = 'participants_' . str_replace(' ', '_', $campagne->nom) . '_' . date('Y-m-d_H-i-s') . '.csv';

            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];

            $callback = function() use ($participants) {
                $file = fopen('php://output', 'w');
                
                // En-têtes CSV
                fputcsv($file, [
                    'ID',
                    'Nom',
                    'Prénom',
                    'Adresse',
                    'Téléphone',
                    'Email',
                    'Date de naissance',
                    'Sexe',
                    'CIN',
                    'Statut',
                    'Commentaire',
                    'Campagne',
                    'Date d\'appel',
                    'Date de création'
                ]);

                // Données
                foreach ($participants as $participant) {
                    fputcsv($file, [
                        $participant->id,
                        $participant->nom,
                        $participant->prenom,
                        $participant->adresse,
                        $participant->telephone,
                        $participant->email,
                        $participant->date_naissance ? date('d/m/Y', strtotime($participant->date_naissance)) : '',
                        $participant->sexe,
                        $participant->cin,
                        $this->getStatutLabel($participant->statut),
                        $participant->commentaire,
                        $participant->campagne_nom,
                        $participant->date_appel ? date('d/m/Y H:i', strtotime($participant->date_appel)) : '',
                        date('d/m/Y H:i', strtotime($participant->created_at))
                    ]);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);

        } catch (Exception $e) {
            Log::error('Erreur lors de l\'export CSV', [
                'error' => $e->getMessage(),
                'campagne_id' => $request->campagne_id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export : ' . $e->getMessage()
            ], 500);
        }
    }

    // ===== STATISTIQUES =====
    public function getStatistiquesCampagne($campagneId)
    {
        try {
            $campagne = DB::table('campagnes_medicales')
                ->where('id', $campagneId)
                ->whereNull('date_suppression')
                ->first();

            if (!$campagne) {
                return response()->json([
                    'success' => false,
                    'message' => 'Campagne non trouvée'
                ], 404);
            }

            $stats = DB::table('participants')
                ->select('statut', DB::raw('count(*) as total'))
                ->where('campagne_id', $campagneId)
                ->whereNull('date_suppression')
                ->groupBy('statut')
                ->pluck('total', 'statut')
                ->toArray();

            $total = array_sum($stats);
            $repondu = $stats['répondu'] ?? 0;
            $tauxReponse = $total > 0 ? round(($repondu / $total) * 100, 2) : 0;

            return response()->json([
                'success' => true,
                'campagne' => $campagne,
                'stats' => [
                    'total' => $total,
                    'repondu' => $repondu,
                    'ne_repond_pas' => $stats['ne repond pas'] ?? 0,
                    'non_contacte' => $stats['non contacté'] ?? 0,
                    'taux_reponse' => $tauxReponse
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Erreur getStatistiquesCampagne', [
                'error' => $e->getMessage(),
                'campagne_id' => $campagneId
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ===== MÉTHODES UTILITAIRES =====
    
    /**
     * Mapping des statuts Excel vers DB
     */
    
    /**
     * Mapping statuts DB vers labels d'affichage
     */
    private function getStatutLabel($statutDB)
    {
        $labels = [
            'répondu' => 'A répondu',
            'ne repond pas' => 'Ne répond pas', 
            'non contacté' => 'Non contacté',
            // Anciens statuts pour compatibilité
            'oui' => 'A répondu (OUI)',
            'non' => 'Ne répond pas (NON)',
            'en_attente' => 'En attente',
            'refuse' => 'A refusé'
        ];
        
        return $labels[$statutDB] ?? $statutDB;
    }

    // ===== DONNÉES INITIALES =====
    public function getInitialData()
    {
        try {
            $data = [
                'campagnes' => DB::table('campagnes_medicales')
                    ->select('id', 'nom', 'statut', 'date_debut', 'date_fin')
                    ->whereNull('date_suppression')
                    ->orderBy('date_debut', 'desc')
                    ->get(),
                'types_assistance' => DB::table('types_assistance')
                    ->select('id', 'libelle', 'description')
                    ->whereNull('date_suppression')
                    ->where('is_active', true)
                    ->orderBy('libelle')
                    ->get(),
                'statuts_participant' => [
                    ['value' => 'répondu', 'label' => 'A répondu'],
                    ['value' => 'ne repond pas', 'label' => 'Ne répond pas'],
                    ['value' => 'non contacté', 'label' => 'Non contacté']
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);

        } catch (Exception $e) {
            Log::error('Erreur getInitialData', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des données initiales',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ===== SUPPRESSION =====
    public function supprimerParticipant($id)
    {
        try {
            $participant = DB::table('participants')
                ->where('id', $id)
                ->whereNull('date_suppression')
                ->first();

            if (!$participant) {
                return response()->json([
                    'success' => false,
                    'message' => 'Participant non trouvé'
                ], 404);
            }

            DB::table('participants')
                ->where('id', $id)
                ->update([
                    'date_suppression' => now(),
                    'updated_at' => now()
                ]);

            Log::info('Participant supprimé', [
                'participant_id' => $id,
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Participant supprimé avec succès'
            ]);

        } catch (Exception $e) {
            Log::error('Erreur suppression participant', [
                'error' => $e->getMessage(),
                'participant_id' => $id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du participant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function importExcel(Request $request)
{
    $validator = Validator::make($request->all(), [
        'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        'campagne_id' => 'required|exists:campagnes_medicales,id'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        DB::beginTransaction();

        $file = $request->file('file');
        $campagneId = $request->campagne_id;

        // Vérifier la campagne
        $campagne = DB::table('campagnes_medicales')
            ->where('id', $campagneId)
            ->whereNull('date_suppression')
            ->first();

        if (!$campagne) {
            return response()->json([
                'success' => false,
                'message' => 'Campagne non trouvée'
            ], 404);
        }

        // Statistiques d'import avec nouveaux statuts
        $stats = [
            'repondu_count' => 0,
            'ne_repond_pas_count' => 0,
            'non_contacte_count' => 0,
            'total_traite' => 0,
            'nouveau_crees' => 0,
            'mis_a_jour' => 0,
            'erreurs' => []
        ];

        // Lire le fichier Excel
        $data = Excel::toArray([], $file);
        
        if (empty($data) || empty($data[0])) {
            throw new Exception('Fichier vide ou format invalide');
        }

        $rows = $data[0];
        $headers = array_shift($rows); // Récupérer les en-têtes

        // Mapper les en-têtes (case insensitive)
        $headerMap = [];
        foreach ($headers as $index => $header) {
            $cleanHeader = strtolower(trim($header));
            $headerMap[$cleanHeader] = $index;
        }

        // Vérifier les colonnes obligatoires
        $requiredColumns = ['nom', 'prenom', 'telephone', 'adresse'];
        foreach ($requiredColumns as $required) {
            if (!isset($headerMap[$required])) {
                throw new Exception("Colonne obligatoire manquante: {$required}");
            }
        }

        foreach ($rows as $rowIndex => $row) {
            $lineNumber = $rowIndex + 2; // +2 car on a supprimé les headers et Excel commence à 1

            try {
                // Ignorer les lignes vides
                if (empty(array_filter($row))) continue;

                // Extraire les données avec mapping des colonnes
                $participantData = [
                    'nom' => trim($row[$headerMap['nom']] ?? ''),
                    'prenom' => trim($row[$headerMap['prenom']] ?? ''),
                    'telephone' => trim($row[$headerMap['telephone']] ?? ''),
                    'adresse' => trim($row[$headerMap['adresse']] ?? ''),
                    'email' => trim($row[$headerMap['email'] ?? ''] ?? ''),
                    'date_naissance' => $this->parseDate($row[$headerMap['date_naissance'] ?? ''] ?? ''),
                    'sexe' => strtoupper(trim($row[$headerMap['sexe'] ?? ''] ?? '')),
                    'cin' => trim($row[$headerMap['cin'] ?? ''] ?? ''),
                    'campagne_id' => $campagneId
                ];

                // *** CORRECTION CRITIQUE: Traitement du statut ***
                $statutRaw = trim($row[$headerMap['statut'] ?? ''] ?? '');
                $participantData['statut'] = $this->mapStatutExcelVersDB($statutRaw);

                // Validation des champs requis
                if (empty($participantData['nom']) || empty($participantData['prenom']) || 
                    empty($participantData['telephone']) || empty($participantData['adresse'])) {
                    $stats['erreurs'][] = [
                        'line' => $lineNumber,
                        'message' => 'Champs requis manquants (nom, prenom, telephone, adresse)'
                    ];
                    continue;
                }

                // Normaliser le sexe
                if ($participantData['sexe'] && !in_array($participantData['sexe'], ['M', 'F'])) {
                    $participantData['sexe'] = null;
                }

                // Vérifier si le participant existe déjà
                $existant = DB::table('participants')
                    ->where('nom', $participantData['nom'])
                    ->where('prenom', $participantData['prenom'])
                    ->where('telephone', $participantData['telephone'])
                    ->where('campagne_id', $campagneId)
                    ->whereNull('date_suppression')
                    ->first();

                if ($existant) {
                    // Mise à jour du participant existant
                    $updateData = [
                        'adresse' => $participantData['adresse'],
                        'email' => $participantData['email'],
                        'date_naissance' => $participantData['date_naissance'],
                        'sexe' => $participantData['sexe'],
                        'cin' => $participantData['cin'],
                        'statut' => $participantData['statut'], // *** IMPORTANT: Mettre à jour le statut ***
                        'updated_at' => now()
                    ];

                    DB::table('participants')
                        ->where('id', $existant->id)
                        ->update($updateData);
                    
                    $stats['mis_a_jour']++;
                    $finalStatut = $participantData['statut'];
                } else {
                    // Créer nouveau participant
                    $participantData['created_at'] = now();
                    $participantData['updated_at'] = now();
                    
                    // *** IMPORTANT: S'assurer que le statut est défini ***
                    if (empty($participantData['statut'])) {
                        $participantData['statut'] = 'non contacté';
                    }
                    
                    DB::table('participants')->insert($participantData);
                    $stats['nouveau_crees']++;
                    $finalStatut = $participantData['statut'];
                }

                // Compter par statut (nouveaux statuts)
                switch ($finalStatut) {
                    case 'répondu':
                        $stats['repondu_count']++;
                        break;
                    case 'ne repond pas':
                        $stats['ne_repond_pas_count']++;
                        break;
                    case 'non contacté':
                        $stats['non_contacte_count']++;
                        break;
                    // Support des anciens statuts pour compatibilité
                    case 'oui':
                        $stats['repondu_count']++;
                        break;
                    case 'non':
                        $stats['ne_repond_pas_count']++;
                        break;
                    case 'refuse':
                        $stats['ne_repond_pas_count']++;
                        break;
                }

                $stats['total_traite']++;

            } catch (Exception $e) {
                $stats['erreurs'][] = [
                    'line' => $lineNumber,
                    'message' => 'Erreur de traitement: ' . $e->getMessage()
                ];
                Log::error('Erreur ligne ' . $lineNumber, [
                    'error' => $e->getMessage(),
                    'data' => $row
                ]);
            }
        }

        DB::commit();

        Log::info('Import Excel terminé avec succès', [
            'campagne_id' => $campagneId,
            'stats' => $stats,
            'user_id' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => count($stats['erreurs']) > 0 ? 
                'Import terminé avec des erreurs' : 
                'Import terminé avec succès',
            'repondu_count' => $stats['repondu_count'],
            'ne_repond_pas_count' => $stats['ne_repond_pas_count'],
            'non_contacte_count' => $stats['non_contacte_count'],
            'total_traite' => $stats['total_traite'],
            'nouveau_crees' => $stats['nouveau_crees'],
            'mis_a_jour' => $stats['mis_a_jour'],
            'erreurs' => $stats['erreurs'],
            'campagne' => [
                'id' => $campagne->id,
                'nom' => $campagne->nom
            ],
            'processed_at' => now()->toISOString()
        ]);

    } catch (Exception $e) {
        DB::rollback();
        
        Log::error('Erreur import Excel', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'file' => $file->getClientOriginalName(),
            'campagne_id' => $campagneId
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'import: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Mapping des statuts Excel vers DB - VERSION CORRIGÉE
 */
private function mapStatutExcelVersDB($statutExcel)
{
    if (empty($statutExcel)) {
        return 'non contacté'; // Statut par défaut
    }
    
    $statutExcel = strtolower(trim($statutExcel));
    
    // Mapping complet des statuts
    $mapping = [
        // Nouveaux statuts
        'répondu' => 'répondu',
        'repondu' => 'répondu',
        'a répondu' => 'répondu',
        'a repondu' => 'répondu',
        
        'ne répond pas' => 'ne repond pas',
        'ne repond pas' => 'ne repond pas',
        'pas de réponse' => 'ne repond pas',
        'pas de reponse' => 'ne repond pas',
        'no response' => 'ne repond pas',
        
        'non contacté' => 'non contacté',
        'non contacte' => 'non contacté',
        'pas contacté' => 'non contacté',
        'pas contacte' => 'non contacté',
        'not contacted' => 'non contacté',
        
        // Anciens statuts (pour compatibilité)
        'oui' => 'oui',
        'yes' => 'oui',
        'o' => 'oui',
        'y' => 'oui',
        
        'non' => 'non',
        'no' => 'non',
        'n' => 'non',
        
        'refuse' => 'refuse',
        'refusé' => 'refuse',
        'refuser' => 'refuse',
        'declined' => 'refuse',
        
        'en attente' => 'en_attente',
        'en_attente' => 'en_attente',
        'attente' => 'en_attente',
        'pending' => 'en_attente',
        
        // Valeurs vides
        '' => 'non contacté',
        ' ' => 'non contacté'
    ];
    
    return $mapping[$statutExcel] ?? 'non contacté';
}

/**
 * Parser une date depuis Excel
 */
private function parseDate($dateValue)
{
    if (empty($dateValue)) {
        return null;
    }
    
    try {
        // Si c'est un nombre (format Excel)
        if (is_numeric($dateValue)) {
            $date = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($dateValue);
            return $date->format('Y-m-d');
        }
        
        // Si c'est une chaîne de caractères
        $date = \Carbon\Carbon::parse($dateValue);
        return $date->format('Y-m-d');
        
    } catch (Exception $e) {
        Log::warning('Erreur parsing date', [
            'date_value' => $dateValue,
            'error' => $e->getMessage()
        ]);
        return null;
    }
}

public function getCampagnes(Request $request)
{
    try {
        $query = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('participants', function($join) {
                $join->on('campagnes_medicales.id', '=', 'participants.campagne_id')
                     ->whereNull('participants.date_suppression');
            })
            ->select(
                'campagnes_medicales.id',
                'campagnes_medicales.nom',
                'campagnes_medicales.description',
                'campagnes_medicales.date_debut',
                'campagnes_medicales.date_fin',
                'campagnes_medicales.lieu',
                'campagnes_medicales.statut',
                'campagnes_medicales.budget',
                'campagnes_medicales.nombre_participants_prevu',
                'campagnes_medicales.prix_unitaire',
                'campagnes_medicales.commentaires',
                'campagnes_medicales.created_at',
                'campagnes_medicales.updated_at',
                // CORRECTION PRINCIPALE: Inclure le type_assistance_id
                'campagnes_medicales.type_assistance_id',
                'types_assistance.id as type_assistance_obj_id',
                'types_assistance.libelle as type_assistance',
                'types_assistance.libelle as type_assistance_libelle',
                'types_assistance.description as type_assistance_description',
                DB::raw('COUNT(participants.id) as total_participants'),
                // Nouveaux statuts
                DB::raw('SUM(CASE WHEN participants.statut = "répondu" THEN 1 ELSE 0 END) as repondu_count'),
                DB::raw('SUM(CASE WHEN participants.statut = "ne repond pas" THEN 1 ELSE 0 END) as ne_repond_pas_count'),
                DB::raw('SUM(CASE WHEN participants.statut = "non contacté" THEN 1 ELSE 0 END) as non_contacte_count'),
                // Anciens statuts pour compatibilité
                DB::raw('SUM(CASE WHEN participants.statut = "oui" THEN 1 ELSE 0 END) as participants_oui'),
                DB::raw('SUM(CASE WHEN participants.statut = "non" THEN 1 ELSE 0 END) as participants_non'),
                DB::raw('SUM(CASE WHEN participants.statut = "en_attente" THEN 1 ELSE 0 END) as participants_en_attente'),
                DB::raw('SUM(CASE WHEN participants.statut = "refuse" THEN 1 ELSE 0 END) as participants_refuse')
            )
            ->whereNull('campagnes_medicales.date_suppression');

        // Filtres
        if ($request->filled('statut')) {
            $query->where('campagnes_medicales.statut', $request->statut);
        }

        if ($request->filled('type_assistance_id')) {
            $query->where('campagnes_medicales.type_assistance_id', $request->type_assistance_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('campagnes_medicales.nom', 'like', "%{$search}%")
                  ->orWhere('campagnes_medicales.lieu', 'like', "%{$search}%")
                  ->orWhere('campagnes_medicales.description', 'like', "%{$search}%");
            });
        }

        // CORRECTION GROUP BY: Inclure tous les nouveaux champs
        $query->groupBy([
            'campagnes_medicales.id',
            'campagnes_medicales.nom',
            'campagnes_medicales.description',
            'campagnes_medicales.date_debut',
            'campagnes_medicales.date_fin',
            'campagnes_medicales.lieu',
            'campagnes_medicales.statut',
            'campagnes_medicales.budget',
            'campagnes_medicales.nombre_participants_prevu',
            'campagnes_medicales.prix_unitaire',
            'campagnes_medicales.commentaires',
            'campagnes_medicales.created_at',
            'campagnes_medicales.updated_at',
            // AJOUT CRITIQUE: Inclure dans GROUP BY
            'campagnes_medicales.type_assistance_id',
            'types_assistance.id',
            'types_assistance.libelle',
            'types_assistance.description'
        ]);

        // Tri
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        
        $allowedSortColumns = ['nom', 'date_debut', 'date_fin', 'statut', 'budget', 'created_at'];
        if (in_array($sortBy, $allowedSortColumns)) {
            $query->orderBy('campagnes_medicales.' . $sortBy, $sortDir);
        } else {
            $query->orderBy('campagnes_medicales.created_at', 'desc');
        }

        $campagnes = $query->get();

        // AMELIORATION: Enrichir les données pour le frontend
        $campagnes = $campagnes->map(function($campagne) {
            // Créer un objet type_assistance pour compatibilité
            $campagne->type_assistance_obj = null;
            if ($campagne->type_assistance_id) {
                $campagne->type_assistance_obj = (object)[
                    'id' => $campagne->type_assistance_id,
                    'libelle' => $campagne->type_assistance,
                    'description' => $campagne->type_assistance_description
                ];
            }

            // Calculer le statut en fonction des dates
            $now = now();
            $dateDebut = \Carbon\Carbon::parse($campagne->date_debut);
            $dateFin = \Carbon\Carbon::parse($campagne->date_fin);

            if ($now->lt($dateDebut)) {
                $campagne->statut_calcule = 'planifiee';
            } elseif ($now->gt($dateFin)) {
                $campagne->statut_calcule = 'terminee';
            } else {
                $campagne->statut_calcule = 'en_cours';
            }

            // Nettoyer les champs pour éviter les erreurs JS
            $campagne->type_assistance = $campagne->type_assistance ?? 'Type non défini';
            $campagne->type_assistance_libelle = $campagne->type_assistance_libelle ?? 'Type non défini';

            return $campagne;
        });

        return response()->json([
            'success' => true,
            'data' => $campagnes,
            'meta' => [
                'total' => $campagnes->count(),
                'has_type_assistance_ids' => $campagnes->filter(function($c) {
                    return !is_null($c->type_assistance_id);
                })->count()
            ]
        ]);

    } catch (Exception $e) {
        Log::error('Erreur getCampagnes', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement des campagnes',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Récupérer les bénéficiaires "en_attente" de la dernière campagne terminée du même type
 */
/**
 * Récupérer les bénéficiaires "en_attente" de la dernière campagne terminée du même type
 */
public function getParticipantsEnAttenteLastCampagne(Request $request)
{
    $validator = Validator::make($request->all(), [
        'campagne_id' => 'required|exists:campagnes_medicales,id',
        'type_assistance_id' => 'required|exists:types_assistance,id'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $campagneActuelleId = $request->campagne_id;
        $typeAssistanceId = $request->type_assistance_id;

        // 1. Trouver la dernière campagne terminée du même type d'assistance
        $derniereCampagne = DB::table('campagnes_medicales')
            ->where('type_assistance_id', $typeAssistanceId)
            ->where('id', '!=', $campagneActuelleId)
            ->where(function($query) {
                $query->where('statut', 'Terminée')
                      ->orWhere('statut', 'terminee')
                      ->orWhere('statut', 'TERMINEE')
                      ->orWhere('date_fin', '<', now());
            })
            ->whereNull('date_suppression')
            ->orderBy('date_fin', 'desc')
            ->first();

        if (!$derniereCampagne) {
            return response()->json([
                'success' => true,
                'data' => [],
                'message' => 'Aucune campagne terminée trouvée pour ce type d\'assistance',
                'derniere_campagne' => null
            ]);
        }

        // 2. Récupérer les participants "en_attente" de cette campagne
        $participants = DB::table('participants')
            ->where('campagne_id', $derniereCampagne->id)
            ->where('statut', 'en_attente')
            ->whereNull('date_suppression')
            ->select([
                'id',
                'nom',
                'prenom', 
                'adresse',
                'telephone',
                'email',
                'date_naissance',
                'sexe',
                'cin',
                'commentaire',
                'statut',
                'date_appel',
                'created_at'
            ])
            ->orderBy('nom', 'asc')
            ->orderBy('prenom', 'asc')
            ->get();

        // 3. Formater les données pour l'export
        $participantsFormated = $participants->map(function($participant) {
            return [
                'id' => $participant->id,
                'nom' => $participant->nom ?? '',
                'prenom' => $participant->prenom ?? '',
                'adresse' => $participant->adresse ?? '',
                'telephone' => $participant->telephone ?? '',
                'email' => $participant->email ?? '',
                'date_naissance' => $participant->date_naissance ? 
                    \Carbon\Carbon::parse($participant->date_naissance)->format('d/m/Y') : '',
                'sexe' => $participant->sexe === 'M' ? 'Masculin' : 
                         ($participant->sexe === 'F' ? 'Féminin' : ''),
                'cin' => $participant->cin ?? '',
                'commentaire' => $participant->commentaire ?? '',
                'statut' => 'non contacté', // Statut par défaut pour la nouvelle campagne
                'nom_complet' => trim(($participant->prenom ?? '') . ' ' . ($participant->nom ?? ''))
            ];
        });

        // 4. Récupérer les informations du type d'assistance
        $typeAssistance = DB::table('types_assistance')
            ->where('id', $typeAssistanceId)
            ->first();

        Log::info('Récupération participants en attente', [
            'campagne_actuelle' => $campagneActuelleId,
            'derniere_campagne' => $derniereCampagne->id,
            'type_assistance' => $typeAssistanceId,
            'nombre_participants' => $participantsFormated->count(),
            'user_id' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'data' => $participantsFormated,
            'message' => $participantsFormated->count() > 0 ? 
                "Trouvé {$participantsFormated->count()} participants en attente" : 
                'Aucun participant en attente trouvé',
            'derniere_campagne' => [
                'id' => $derniereCampagne->id,
                'nom' => $derniereCampagne->nom,
                'date_fin' => $derniereCampagne->date_fin,
                'date_debut' => $derniereCampagne->date_debut
            ],
            'type_assistance' => [
                'id' => $typeAssistance->id ?? $typeAssistanceId,
                'libelle' => $typeAssistance->libelle ?? 'Type inconnu'
            ]
        ]);

    } catch (Exception $e) {
        Log::error('Erreur récupération participants en attente', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'campagne_id' => $request->campagne_id,
            'type_assistance_id' => $request->type_assistance_id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération des participants en attente',
            'error' => $e->getMessage()
        ], 500);
    }
}
public function getBeneficiairesEnAttenteLastCampagne(Request $request)
{
    $validator = Validator::make($request->all(), [
        'campagne_id' => 'required|exists:campagnes_medicales,id',
        'type_assistance_id' => 'required|exists:types_assistance,id'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $campagneActuelleId = $request->campagne_id;
        $typeAssistanceId = $request->type_assistance_id;

        // 1. Trouver la dernière campagne terminée du même type d'assistance
        $derniereCampagne = DB::table('campagnes_medicales')
            ->where('type_assistance_id', $typeAssistanceId)
            ->where('id', '!=', $campagneActuelleId)
            ->where(function($query) {
                $query->where('statut', 'Terminée')
                      ->orWhere('statut', 'terminee')
                      ->orWhere('statut', 'TERMINEE')
                      ->orWhere('date_fin', '<', now());
            })
            ->whereNull('date_suppression')
            ->orderBy('date_fin', 'desc')
            ->first();

        if (!$derniereCampagne) {
            return response()->json([
                'success' => true,
                'data' => [],
                'message' => 'Aucune campagne terminée trouvée pour ce type d\'assistance',
                'derniere_campagne' => null
            ]);
        }

        // 2. Récupérer les bénéficiaires "en_attente" de cette campagne
        $beneficiaires = DB::table('beneficiaires')
            ->where('campagne_id', $derniereCampagne->id)
            ->where('decision', 'en_attente')
            ->whereNull('date_suppression')
            ->select([
                'id',
                'nom',
                'prenom', 
                'adresse',
                'telephone',
                'email',
                'date_naissance',
                'sexe',
                'cin',
                'commentaire',
                'enfants_scolarises',
                'lateralite',
                'cote'
            ])
            ->orderBy('nom', 'asc')
            ->orderBy('prenom', 'asc')
            ->get();

        // 3. Formater les données pour l'export
        $beneficiairesFormated = $beneficiaires->map(function($beneficiaire) {
            return [
                'id' => $beneficiaire->id,
                'nom' => $beneficiaire->nom ?? '',
                'prenom' => $beneficiaire->prenom ?? '',
                'adresse' => $beneficiaire->adresse ?? '',
                'telephone' => $beneficiaire->telephone ?? '',
                'email' => $beneficiaire->email ?? '',
                'date_naissance' => $beneficiaire->date_naissance ? 
                    \Carbon\Carbon::parse($beneficiaire->date_naissance)->format('d/m/Y') : '',
                'sexe' => $beneficiaire->sexe === 'M' ? 'Masculin' : 
                         ($beneficiaire->sexe === 'F' ? 'Féminin' : ''),
                'cin' => $beneficiaire->cin ?? '',
                'commentaire' => $beneficiaire->commentaire ?? '',
                'enfants_scolarises' => $beneficiaire->enfants_scolarises === 1 ? 'Oui' : 
                                       ($beneficiaire->enfants_scolarises === 0 ? 'Non' : ''),
                'lateralite' => $beneficiaire->lateralite ?? '',
                'cote' => $beneficiaire->cote ?? ''
            ];
        });

        // 4. Récupérer les informations du type d'assistance
        $typeAssistance = DB::table('types_assistance')
            ->where('id', $typeAssistanceId)
            ->first();

        Log::info('Récupération bénéficiaires en attente', [
            'campagne_actuelle' => $campagneActuelleId,
            'derniere_campagne' => $derniereCampagne->id,
            'type_assistance' => $typeAssistanceId,
            'nombre_beneficiaires' => $beneficiairesFormated->count(),
            'user_id' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'data' => $beneficiairesFormated,
            'message' => $beneficiairesFormated->count() > 0 ? 
                "Trouvé {$beneficiairesFormated->count()} bénéficiaires en attente" : 
                'Aucun bénéficiaire en attente trouvé',
            'derniere_campagne' => [
                'id' => $derniereCampagne->id,
                'nom' => $derniereCampagne->nom,
                'date_fin' => $derniereCampagne->date_fin,
                'date_debut' => $derniereCampagne->date_debut
            ],
            'type_assistance' => [
                'id' => $typeAssistance->id ?? $typeAssistanceId,
                'libelle' => $typeAssistance->libelle ?? 'Type inconnu'
            ]
        ]);

    } catch (Exception $e) {
        Log::error('Erreur récupération bénéficiaires en attente', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'campagne_id' => $request->campagne_id,
            'type_assistance_id' => $request->type_assistance_id
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération des bénéficiaires en attente',
            'error' => $e->getMessage()
        ], 500);
    }
}


}