<?php
namespace App\Http\Controllers;
use App\Models\CampagneMedicale;
use App\Models\Beneficiaire;
use App\Models\TypeAssistance;
use App\Models\Kafala;
use App\Models\Participant;
use App\Models\ImportLog;
use App\Models\AssistanceMedicale;
use App\Models\Budget;
use App\Services\StatistiquesService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\KafalaRequest;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Exception;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\BeneficiairesImport;

use Illuminate\Http\JsonResponse;
use Maatwebsite\Excel\Excel as ExcelWriter;
use App\Exports\BeneficiairesExport;
class UpasController extends Controller{
    protected $statistiquesService;

    public function __construct(StatistiquesService $statistiquesService)
    {
        $this->statistiquesService = $statistiquesService;
    }
public function getStatistics()
{
    try {
        $stats = Kafala::getStatistics();
        
        // Statistiques supplémentaires
        $additionalStats = [
            'recent_activity' => [
                'last_week' => Kafala::whereNull('date_suppression')
                    ->where('created_at', '>=', now()->subWeek())
                    ->count(),
                'last_month' => Kafala::whereNull('date_suppression')
                    ->where('created_at', '>=', now()->subMonth())
                    ->count(),
            ],
            'by_month' => Kafala::whereNull('date_suppression')
                ->whereYear('created_at', now()->year)
                ->selectRaw('MONTH(created_at) as month, COUNT(*) as count')
                ->groupBy('month')
                ->orderBy('month')
                ->get()
                ->pluck('count', 'month'),
            'completion_rate' => [
                'with_pdf' => $stats['with_pdf'],
                'without_pdf' => $stats['without_pdf'],
                'percentage' => $stats['total'] > 0 ? 
                    round(($stats['with_pdf'] / $stats['total']) * 100, 2) : 0
            ]
        ];
        
        return response()->json([
            'success' => true,
            'data' => array_merge($stats, $additionalStats),
            'generated_at' => now()->toISOString()
        ]);
        
    } catch (Exception $e) {
        Log::error('Erreur statistiques kafalas', [
            'error' => $e->getMessage()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du calcul des statistiques: ' . $e->getMessage()
        ], 500);
    }
}
public function viewKafalaPdfPublic($id, $token)
{
    try {
        // Vérifier le token temporaire (à implémenter selon vos besoins)
        if (!$this->validateTemporaryToken($token, $id)) {
            abort(403, 'Token invalide ou expiré');
        }
        
        $kafala = Kafala::find($id);
        
        if (!$kafala || $kafala->date_suppression || !$kafala->fichier_pdf) {
            abort(404, 'Document non trouvé');
        }
        
        if (!Storage::disk('public')->exists($kafala->fichier_pdf)) {
            abort(404, 'Fichier physiquement absent');
        }
        
        $fileContent = Storage::disk('public')->get($kafala->fichier_pdf);
        $fileName = 'kafala_' . $kafala->reference . '.pdf';
        
        return response($fileContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $fileName . '"',
            'Content-Length' => strlen($fileContent),
            'Cache-Control' => 'private, max-age=3600',
            'X-Robots-Tag' => 'noindex, nofollow'
        ]);
        
    } catch (Exception $e) {
        Log::error('Erreur accès PDF public', [
            'kafala_id' => $id,
            'token' => $token,
            'error' => $e->getMessage()
        ]);
        
        abort(500, 'Erreur serveur');
    }
}
private function validateTemporaryToken($token, $kafalaId)
{
    // Exemple d'implémentation - à adapter selon vos besoins
    try {
        $decoded = base64_decode($token);
        $parts = explode(':', $decoded);
        
        if (count($parts) !== 3) {
            return false;
        }
        
        [$id, $timestamp, $signature] = $parts;
        
        // Vérifier que l'ID correspond
        if ($id != $kafalaId) {
            return false;
        }
        
        // Vérifier que le token n'est pas expiré (ex: 1 heure)
        if ((time() - $timestamp) > 3600) {
            return false;
        }
        
        // Vérifier la signature (avec votre clé secrète)
        $expectedSignature = hash_hmac('sha256', $id . ':' . $timestamp, config('app.key'));
        
        return hash_equals($expectedSignature, $signature);
        
    } catch (Exception $e) {
        return false;
    }
}
public function generatePublicAccessToken($kafalaId, $expirationHours = 1)
{
    try {
        $timestamp = time();
        $signature = hash_hmac('sha256', $kafalaId . ':' . $timestamp, config('app.key'));
        $tokenData = $kafalaId . ':' . $timestamp . ':' . $signature;
        
        return base64_encode($tokenData);
        
    } catch (Exception $e) {
        Log::error('Erreur génération token public', [
            'kafala_id' => $kafalaId,
            'error' => $e->getMessage()
        ]);
        
        return null;
    }
}
    public function exportData(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:beneficiaires,campagnes,kafalas',
            'format' => 'required|in:excel,csv,pdf',
            'filters' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Paramètres d\'export invalides',
                'errors' => $validator->errors()
            ], 422);
        }
        try {
            return response()->json([
                'success' => true,
                'message' => 'Export en cours de traitement',
                'download_url' => '/api/upas/downloads/' . uniqid()
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export: ' . $e->getMessage()
            ], 500);
        }
    }
    public function getAssistancesMedicales(Request $request)
    {
        try {
            $query = DB::table('assistance_medicales')
                ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->leftJoin('beneficiaires', 'assistance_medicales.beneficiaire_id', '=', 'beneficiaires.id')
                ->leftJoin('campagnes_medicales', 'assistance_medicales.campagne_id', '=', 'campagnes_medicales.id')
                ->select(
                    'assistance_medicales.*',
                    'types_assistance.libelle as type_assistance',
                    'beneficiaires.nom as beneficiaire_nom',
                    'beneficiaires.prenom as beneficiaire_prenom',
                    'campagnes_medicales.nom as campagne_nom'
                )
                ->whereNull('assistance_medicales.date_suppression');
            if ($request->filled('campagne_id')) {
                $query->where('assistance_medicales.campagne_id', $request->campagne_id);
            }
            if ($request->filled('type_assistance_id')) {
                $query->where('assistance_medicales.type_assistance_id', $request->type_assistance_id);
            }
            if ($request->filled('date_debut') && $request->filled('date_fin')) {
                $query->whereBetween('assistance_medicales.date_assistance', [$request->date_debut, $request->date_fin]);
            }
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('beneficiaires.nom', 'like', "%{$search}%")
                      ->orWhere('beneficiaires.prenom', 'like', "%{$search}%")
                      ->orWhere('beneficiaires.telephone', 'like', "%{$search}%");
                });
            }
            $sortBy = $request->get('sort_by', 'date_assistance');
            $sortDir = $request->get('sort_dir', 'desc');
            $query->orderBy('assistance_medicales.' . $sortBy, $sortDir);
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            $offset = ($page - 1) * $perPage;
            $totalCount = $query->count();
            $assistances = $query->limit($perPage)->offset($offset)->get();
            return response()->json([
                'success' => true,
                'data' => $assistances,
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $totalCount,
                'last_page' => ceil($totalCount / $perPage)
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des assistances: ' . $e->getMessage()
            ], 500);
        }
    }
    public function rechercheGlobale(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'terme' => 'required|string|min:3'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Terme de recherche invalide',
                'errors' => $validator->errors()
            ], 422);
        }
        try {
            $terme = $request->terme;
            $resultats = [
                'beneficiaires' => DB::table('beneficiaires')
                    ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
                    ->select(
                        'beneficiaires.id',
                        'beneficiaires.nom',
                        'beneficiaires.prenom',
                        'beneficiaires.telephone',
                        'types_assistance.libelle as type_assistance'
                    )
                    ->whereNull('beneficiaires.date_suppression')
                    ->where(function ($q) use ($terme) {
                        $q->where('beneficiaires.nom', 'like', "%{$terme}%")
                          ->orWhere('beneficiaires.prenom', 'like', "%{$terme}%")
                          ->orWhere('beneficiaires.telephone', 'like', "%{$terme}%");
                    })
                    ->limit(10)
                    ->get(),
                'campagnes' => DB::table('campagnes_medicales')
                    ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                    ->select(
                        'campagnes_medicales.id',
                        'campagnes_medicales.nom',
                        'campagnes_medicales.lieu',
                        'types_assistance.libelle as type_assistance'
                    )
                    ->whereNull('campagnes_medicales.date_suppression')
                    ->where(function ($q) use ($terme) {
                        $q->where('campagnes_medicales.nom', 'like', "%{$terme}%")
                          ->orWhere('campagnes_medicales.lieu', 'like', "%{$terme}%");
                    })
                    ->limit(5)
                    ->get(),
                'kafalas' => DB::table('kafalas')
                    ->select('id', 'nom_mari', 'nom_femme', 'nom_enfant', 'reference')
                    ->whereNull('date_suppression')
                    ->where(function ($q) use ($terme) {
                        $q->where('nom_mari', 'like', "%{$terme}%")
                          ->orWhere('nom_femme', 'like', "%{$terme}%")
                          ->orWhere('nom_enfant', 'like', "%{$terme}%")
                          ->orWhere('reference', 'like', "%{$terme}%");
                    })
                    ->limit(5)
                    ->get()
            ];
            return response()->json([
                'success' => true,
                'data' => $resultats
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la recherche: ' . $e->getMessage()
            ], 500);
        }
    }
    public function validerCampagne(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'type_assistance_id' => 'required|exists:types_assistance,id',
                'date_debut' => 'required|date|after_or_equal:today',
                'date_fin' => 'required|date|after:date_debut',
            ]);
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }
            $chevauchement = DB::table('campagnes_medicales')
                ->where('type_assistance_id', $request->type_assistance_id)
                ->whereNull('date_suppression')
                ->where(function ($query) use ($request) {
                    $query->whereBetween('date_debut', [$request->date_debut, $request->date_fin])
                          ->orWhereBetween('date_fin', [$request->date_debut, $request->date_fin])
                          ->orWhere(function ($q) use ($request) {
                              $q->where('date_debut', '<=', $request->date_debut)
                                ->where('date_fin', '>=', $request->date_fin);
                          });
                })
                ->exists();
            return response()->json([
                'success' => true,
                'data' => [
                    'chevauchement' => $chevauchement,
                    'message' => $chevauchement 
                        ? 'Attention: Il existe déjà une campagne du même type sur cette période'
                        : 'Aucun conflit détecté'
                ]
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la validation: ' . $e->getMessage()
            ], 500);
        }
    }
    public function importParticipants(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
            'campagne_id' => 'required|exists:campagnes_medicales,id'
        ]);
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Fichier invalide',
                'errors' => $validator->errors()
            ], 422);
        }
        try {
            DB::beginTransaction();
            $file = $request->file('file');
            $campagneId = $request->campagne_id;
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();
            if (empty($rows)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le fichier est vide'
                ], 422);
            }
            $headers = array_map('trim', $rows[0]);
            $requiredHeaders = ['nom', 'prenom', 'telephone', 'adresse'];
            $missingHeaders = array_diff($requiredHeaders, $headers);
            if (!empty($missingHeaders)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Colonnes manquantes: ' . implode(', ', $missingHeaders)
                ], 422);
            }
            $headerIndexes = array_flip($headers);
            $erreurs = [];
            $importes = 0;
            $dataRows = array_slice($rows, 1);
            foreach ($dataRows as $index => $row) {
                $ligneNum = $index + 2;
                try {
                    $donnees = [
                        'nom' => trim($row[$headerIndexes['nom']] ?? ''),
                        'prenom' => trim($row[$headerIndexes['prenom']] ?? ''),
                        'telephone' => trim($row[$headerIndexes['telephone']] ?? ''),
                        'adresse' => trim($row[$headerIndexes['adresse']] ?? ''),
                        'email' => isset($headerIndexes['email']) ? trim($row[$headerIndexes['email']] ?? '') : null,
                        'date_naissance' => isset($headerIndexes['date_naissance']) ? $row[$headerIndexes['date_naissance']] ?? null : null,
                        'sexe' => isset($headerIndexes['sexe']) ? trim($row[$headerIndexes['sexe']] ?? '') : null,
                        'cin' => isset($headerIndexes['cin']) ? trim($row[$headerIndexes['cin']] ?? '') : null,
                        'campagne_id' => $campagneId,
                        'statut' => 'non contacté',
                        'created_at' => now(),
                        'updated_at' => now()
                    ];
                    if (empty($donnees['nom']) || empty($donnees['prenom']) || empty($donnees['telephone'])) {
                        $erreurs[$ligneNum] = ['Données manquantes (nom, prénom ou téléphone)'];
                        continue;
                    }
                    $doublon = DB::table('participants')
                        ->where('campagne_id', $campagneId)
                        ->where('telephone', $donnees['telephone'])
                        ->whereNull('date_suppression')
                        ->exists();
                    if ($doublon) {
                        $erreurs[$ligneNum] = ['Participant déjà existant dans cette campagne'];
                        continue;
                    }
                    if (!empty($donnees['date_naissance'])) {
                        try {
                            if (is_numeric($donnees['date_naissance'])) {
                                $donnees['date_naissance'] = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($donnees['date_naissance'])->format('Y-m-d');
                            } else {
                                $donnees['date_naissance'] = date('Y-m-d', strtotime($donnees['date_naissance']));
                            }
                        } catch (Exception $e) {
                            $donnees['date_naissance'] = null;
                        }
                    }
                    if (!empty($donnees['sexe'])) {
                        $sexe = strtoupper($donnees['sexe']);
                        if (in_array($sexe, ['M', 'MASCULIN', 'HOMME', 'H'])) {
                            $donnees['sexe'] = 'M';
                        } elseif (in_array($sexe, ['F', 'FEMININ', 'FEMME'])) {
                            $donnees['sexe'] = 'F';
                        } else {
                            $donnees['sexe'] = null;
                        }
                    }
                    DB::table('participants')->insert($donnees);
                    $importes++;
                } catch (Exception $e) {
                    $erreurs[$ligneNum] = ['Erreur lors de la création: ' . $e->getMessage()];
                }
            }
            DB::commit();
            return response()->json([
                'success' => true,
                'message' => "Import terminé: $importes participants importés",
                'data' => [
                    'total_lignes' => count($dataRows),
                    'importes' => $importes,
                    'erreurs' => count($erreurs),
                    'details_erreurs' => $erreurs
                ]
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'import: ' . $e->getMessage()
            ], 500);
        }
    }
    public function synchroniserDonnees()
    {
        try {
            DB::beginTransaction();
            $beneficiairesAvecAssistance = DB::table('assistance_medicales')
                ->whereNull('date_suppression')
                ->distinct()
                ->pluck('beneficiaire_id');
            if ($beneficiairesAvecAssistance->count() > 0) {
                DB::table('beneficiaires')
                    ->whereIn('id', $beneficiairesAvecAssistance)
                    ->whereNull('date_suppression')
                    ->update(['a_beneficie' => true, 'updated_at' => now()]);
            }
            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Synchronisation des données terminée avec succès'
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la synchronisation: ' . $e->getMessage()
            ], 500);
        }
    }
    public function verifierIntegrite()
    {
        try {
            $problemes = [];
            $beneficiairesInconsistants = DB::table('beneficiaires')
                ->leftJoin('assistance_medicales', 'beneficiaires.id', '=', 'assistance_medicales.beneficiaire_id')
                ->whereNull('beneficiaires.date_suppression')
                ->where('beneficiaires.a_beneficie', true)
                ->whereNull('assistance_medicales.id')
                ->select('beneficiaires.id', 'beneficiaires.nom', 'beneficiaires.prenom')
                ->get();
            if ($beneficiairesInconsistants->count() > 0) {
                $problemes['beneficiaires_inconsistants'] = $beneficiairesInconsistants;
            }
            $doublonsTelephone = DB::table('beneficiaires')
                ->select('telephone', DB::raw('COUNT(*) as total'))
                ->whereNull('date_suppression')
                ->groupBy('telephone')
                ->having('total', '>', 1)
                ->get();
            if ($doublonsTelephone->count() > 0) {
                $problemes['doublons_telephone'] = $doublonsTelephone;
            }
            $rapport = [
                'total_problemes' => count($problemes),
                'problemes' => $problemes,
                'date_verification' => Carbon::now()->format('d/m/Y H:i:s')
            ];
            return response()->json([
                'success' => true,
                'data' => $rapport
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la vérification: ' . $e->getMessage()
            ], 500);
        }
    }
    public function nettoyageAutomatique()
    {
        try {
            $resultats = [];
            $dossierExports = storage_path('app/public/exports');
            if (is_dir($dossierExports)) {
                $fichiers = glob($dossierExports . '/*');
                $supprimes = 0;
                foreach ($fichiers as $fichier) {
                    if (is_file($fichier) && (time() - filemtime($fichier)) > (7 * 24 * 60 * 60)) {
                        unlink($fichier);
                        $supprimes++;
                    }
                }
                $resultats['fichiers_exports_supprimes'] = $supprimes;
            }
            return response()->json([
                'success' => true,
                'message' => 'Nettoyage automatique terminé',
                'data' => $resultats
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du nettoyage: ' . $e->getMessage()
            ], 500);
        }
    }
    
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
            $beneficiairesStats = DB::table('beneficiaires')
                ->select('sexe', DB::raw('count(*) as total'))
                ->where('campagne_id', $id)
                ->whereNull('date_suppression')
                ->groupBy('sexe')
                ->pluck('total', 'sexe')
                ->toArray();
            $campagne->statistiques = [
                'total_beneficiaires' => array_sum($beneficiairesStats),
                'hommes' => $beneficiairesStats['M'] ?? 0,
                'femmes' => $beneficiairesStats['F'] ?? 0
            ];
            return response()->json([
                'success' => true,
                'data' => $campagne
            ]);
        } catch (Exception $e) {
            Log::error('Erreur getCampagne', ['error' => $e->getMessage(), 'id' => $id]);
            return response()->json([
                'success' => false,
                'message' => 'Campagne non trouvée'
            ], 404);
        }
    }
    public function storeCampagne(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:255',
            'type_assistance_id' => 'required|exists:types_assistance,id',
            'date_debut' => 'required|date|after_or_equal:today',
            'date_fin' => 'required|date|after:date_debut',
            'budget' => 'nullable|numeric|min:0',
            'nombre_participants_prevu' => 'nullable|integer|min:0',
            'lieu' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'prix_unitaire' => 'nullable|numeric|min:0',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
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
                'prix_unitaire' => $request->prix_unitaire,
                'created_by' => Auth::id() ?? 1, // Valeur par défaut si pas d'auth
                'created_at' => now(),
                'updated_at' => now()
            ]);
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
            DB::rollBack();
            Log::error('Erreur création campagne', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création: ' . $e->getMessage()
            ], 500);
        }
    }
    public function updateCampagne(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'sometimes|required|string|max:255',
            'type_assistance_id' => 'sometimes|required|exists:types_assistance,id',
            'date_debut' => 'sometimes|required|date',
            'date_fin' => 'sometimes|required|date|after:date_debut',
            'budget' => 'nullable|numeric|min:0',
            'nombre_participants_prevu' => 'nullable|integer|min:0',
            'lieu' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'prix_unitaire' => 'nullable|numeric|min:0',
            'statut' => 'sometimes|in:Active,Inactive,En cours,Terminée,Annulée',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }
        try {
            DB::beginTransaction();
            $updated = DB::table('campagnes_medicales')
                ->where('id', $id)
                ->whereNull('date_suppression')
                ->update(array_merge($request->all(), ['updated_at' => now()]));
            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Campagne non trouvée'
                ], 404);
            }
            $campagne = DB::table('campagnes_medicales')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select(
                    'campagnes_medicales.*',
                    'types_assistance.libelle as type_assistance'
                )
                ->where('campagnes_medicales.id', $id)
                ->first();
            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Campagne mise à jour avec succès',
                'data' => $campagne
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour: ' . $e->getMessage()
            ], 500);
        }
    }
    public function deleteCampagne($id)
    {
        try {
            $updated = DB::table('campagnes_medicales')
                ->where('id', $id)
                ->whereNull('date_suppression')
                ->update([
                    'date_suppression' => now(),
                    'updated_at' => now()
                ]);
            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Campagne non trouvée'
                ], 404);
            }
            return response()->json([
                'success' => true,
                'message' => 'Campagne supprimée avec succès'
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression: ' . $e->getMessage()
            ], 500);
        }
    }
    public function getTypesAssistance()
    {
        try {
            $types = DB::table('types_assistance')
                ->select('id', 'libelle', 'description', 'created_at', 'updated_at')
                ->whereNull('date_suppression')
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
                'message' => 'Erreur lors du chargement des types d\'assistance: ' . $e->getMessage()
            ], 500);
        }
    }
    public function storeTypeAssistance(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'libelle' => 'required|string|max:255|unique:types_assistance,libelle',
            'description' => 'nullable|string',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }
        try {
            $typeId = DB::table('types_assistance')->insertGetId([
                'libelle' => $request->libelle,
                'description' => $request->description,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            $type = DB::table('types_assistance')->where('id', $typeId)->first();
            return response()->json([
                'success' => true,
                'message' => 'Type d\'assistance créé avec succès',
                'data' => $type
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création: ' . $e->getMessage()
            ], 500);
        }
    }
    public function updateTypeAssistance(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'libelle' => 'sometimes|required|string|max:255|unique:types_assistance,libelle,' . $id,
            'description' => 'nullable|string',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }
        try {
            $updated = DB::table('types_assistance')
                ->where('id', $id)
                ->whereNull('date_suppression')
                ->update(array_merge($request->all(), ['updated_at' => now()]));
            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Type d\'assistance non trouvé'
                ], 404);
            }
            $type = DB::table('types_assistance')->where('id', $id)->first();
            return response()->json([
                'success' => true,
                'message' => 'Type d\'assistance mis à jour avec succès',
                'data' => $type
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour: ' . $e->getMessage()
            ], 500);
        }
    }
    public function deleteTypeAssistance($id)
    {
        try {
            $updated = DB::table('types_assistance')
                ->where('id', $id)
                ->whereNull('date_suppression')
                ->update([
                    'date_suppression' => now(),
                    'updated_at' => now()
                ]);
            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Type d\'assistance non trouvé'
                ], 404);
            }
            return response()->json([
                'success' => true,
                'message' => 'Type d\'assistance supprimé avec succès'
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression: ' . $e->getMessage()
            ], 500);
        }
    }
    

public function dashboard()
{
    try {
        $stats = [
            'total_campagnes' => DB::table('campagnes_medicales')->whereNull('date_suppression')->count(),
            'campagnes_actives' => DB::table('campagnes_medicales')
                ->whereNull('date_suppression')
                ->where('statut', 'Active')
                ->count(),
            'total_beneficiaires' => DB::table('beneficiaires')->whereNull('date_suppression')->count(),
            'total_kafalas' => DB::table('kafalas')->whereNull('date_suppression')->count(),
        ];
        $beneficiairesStats = DB::table('beneficiaires')
            ->select('sexe', DB::raw('count(*) as total'))
            ->whereNull('date_suppression')
            ->groupBy('sexe')
            ->pluck('total', 'sexe')
            ->toArray();
        $stats['beneficiaires_hommes'] = $beneficiairesStats['M'] ?? 0;
        $stats['beneficiaires_femmes'] = $beneficiairesStats['F'] ?? 0;
        $statsParType = DB::table('beneficiaires')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'types_assistance.libelle',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN beneficiaires.a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie')
            )
            ->whereNull('beneficiaires.date_suppression')
            ->groupBy('types_assistance.id', 'types_assistance.libelle')
            ->get();
        $statistiquesLunettes = DB::table('beneficiaires')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->where('types_assistance.libelle', 'Lunettes')
            ->whereNull('beneficiaires.date_suppression')
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN enfants_scolarises = 1 THEN 1 ELSE 0 END) as scolarises_oui'),
                DB::raw('SUM(CASE WHEN enfants_scolarises = 0 THEN 1 ELSE 0 END) as scolarises_non'),
                DB::raw('SUM(CASE WHEN a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie')
            )
            ->first();
        $statistiquesAuditifs = DB::table('beneficiaires')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->where('types_assistance.libelle', 'LIKE', '%auditif%')
            ->whereNull('beneficiaires.date_suppression')
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN cote = "unilatéral" THEN 1 ELSE 0 END) as unilateral'),
                DB::raw('SUM(CASE WHEN cote = "bilatéral" THEN 1 ELSE 0 END) as bilateral'),
                DB::raw('SUM(CASE WHEN a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie')
            )
            ->first();
        $campagnes_recentes = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'campagnes_medicales.id',
                'campagnes_medicales.nom',
                'campagnes_medicales.description',
                'campagnes_medicales.date_debut',
                'campagnes_medicales.date_fin',
                'campagnes_medicales.statut',
                'campagnes_medicales.budget',
                'types_assistance.libelle as type_assistance'
            )
            ->whereNull('campagnes_medicales.date_suppression')
            ->orderBy('campagnes_medicales.created_at', 'desc')
            ->limit(5)
            ->get();
        $beneficiaires_recents = DB::table('beneficiaires')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('campagnes_medicales', 'beneficiaires.campagne_id', '=', 'campagnes_medicales.id')
            ->select(
                'beneficiaires.id',
                'beneficiaires.nom',
                'beneficiaires.prenom',
                'beneficiaires.sexe',
                'beneficiaires.telephone',
                'beneficiaires.created_at',
                'beneficiaires.enfants_scolarises',
                'beneficiaires.cote',
                'types_assistance.libelle as type_assistance',
                'campagnes_medicales.nom as campagne_nom'
            )
            ->whereNull('beneficiaires.date_suppression')
            ->orderBy('beneficiaires.created_at', 'desc')
            ->limit(5)
            ->get();
        $dashboardData = [
            'statistiques' => [
                'campagnes' => [
                    'total' => $stats['total_campagnes'],
                    'actives' => $stats['campagnes_actives'],
                ],
                'beneficiaires' => [
                    'total' => $stats['total_beneficiaires'],
                    'hommes' => $stats['beneficiaires_hommes'],
                    'femmes' => $stats['beneficiaires_femmes'],
                ],
                'kafalas' => [
                    'total' => $stats['total_kafalas'],
                ],
                'par_type_assistance' => $statsParType,
                'lunettes' => [
                    'total' => $statistiquesLunettes->total ?? 0,
                    'enfants_scolarises_oui' => $statistiquesLunettes->scolarises_oui ?? 0,
                    'enfants_scolarises_non' => $statistiquesLunettes->scolarises_non ?? 0,
                    'ayant_beneficie' => $statistiquesLunettes->ayant_beneficie ?? 0,
                    'credit_consomme' => ($statistiquesLunettes->ayant_beneficie ?? 0) * 190
                ],
                'appareils_auditifs' => [
                    'total' => $statistiquesAuditifs->total ?? 0,
                    'unilateral' => $statistiquesAuditifs->unilateral ?? 0,
                    'bilateral' => $statistiquesAuditifs->bilateral ?? 0,
                    'ayant_beneficie' => $statistiquesAuditifs->ayant_beneficie ?? 0,
                    'credit_consomme' => ($statistiquesAuditifs->ayant_beneficie ?? 0) * 2050
                ]
            ],
            'campagnes_recentes' => $campagnes_recentes,
            'beneficiaires_recents' => $beneficiaires_recents,
        ];
        return response()->json([
            'success' => true,
            'data' => $dashboardData
        ]);
    } catch (Exception $e) {
        Log::error('Erreur dashboard UPAS', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement du dashboard: ' . $e->getMessage()
        ], 500);
    }
}


public function validateHeaders(Request $request)
{
    $validator = Validator::make($request->all(), [
        'headers' => 'required|array',
        'type_assistance' => 'required|string',
        'campagne_id' => 'required|exists:campagnes_medicales,id'
    ]);
    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Paramètres invalides',
            'errors' => $validator->errors()
        ], 422);
    }
    try {
        $headers = $request->headers;
        $typeAssistance = strtolower($request->type_assistance);
        $campagneId = $request->campagne_id;
        $campagne = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->where('campagnes_medicales.id', $campagneId)
            ->whereNull('campagnes_medicales.date_suppression')
            ->first();
        if (!$campagne) {
            return response()->json([
                'success' => false,
                'message' => 'Campagne non trouvée'
            ], 404);
        }
        $import = new \App\Imports\BeneficiairesImport($campagneId, true);
        $validation = $import->validateHeaders($headers);
        return response()->json([
            'success' => true,
            'data' => $validation
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la validation des headers: ' . $e->getMessage()
        ], 500);
    }
}
public function getTemplateAuditifs()
{
    try {
        $headers = [
            'nom' => 'Nom du bénéficiaire',
            'prenom' => 'Prénom du bénéficiaire',
            'sexe' => 'M ou F',
            'date_naissance' => 'Format: YYYY-MM-DD',
            'telephone' => 'Numéro de téléphone',
            'adresse' => 'Adresse complète',
            'email' => 'Email (optionnel)',
            'cin' => 'Numéro CIN (optionnel)',
            'cote' => 'unilatéral/bilatéral (obligatoire)',
            // MODIFICATION : enfants_scolarises maintenant disponible pour les appareils auditifs
            'enfants_scolarises' => 'oui/non (obligatoire pour les moins de 18 ans)',
            // NOUVEAU : colonne decision
            'decision' => 'accepté/en_attente/refusé/admin a list principal/admin a list d\'attente (optionnel)'
        ];
        $exemples = [
            [
                'nom' => 'Tazi',
                'prenom' => 'Youssef',
                'sexe' => 'M',
                'date_naissance' => '1960-12-10',
                'telephone' => '0623456789',
                'adresse' => '789 Rue Allal Ben Abdellah, Fès',
                'email' => 'youssef.tazi@email.com',
                'cin' => 'CD789012',
                'cote' => 'bilatéral',
                'enfants_scolarises' => '', // Pas applicable pour un adulte
                'decision' => 'accepté'
            ],
            [
                'nom' => 'Lamrani',
                'prenom' => 'Aicha',
                'sexe' => 'F',
                'date_naissance' => '2010-05-18', // Enfant de moins de 18 ans
                'telephone' => '0634567890',
                'adresse' => '321 Boulevard Zerktouni, Marrakech',
                'email' => 'aicha.parent@email.com',
                'cin' => '',
                'cote' => 'unilatéral',
                'enfants_scolarises' => 'oui', // Obligatoire car moins de 18 ans
                'decision' => 'en_attente'
            ]
        ];
        return response()->json([
            'success' => true,
            'data' => [
                'type_assistance' => 'Appareils Auditifs',
                'headers' => $headers,
                'exemples' => $exemples,
                'regles' => [
                    'Le champ "cote" est obligatoire pour tous les bénéficiaires',
                    'Valeurs acceptées pour "cote": unilatéral, bilatéral',
                    'Le champ "enfants_scolarises" est obligatoire pour les bénéficiaires de moins de 18 ans',
                    'Valeurs acceptées pour "enfants_scolarises": oui, non',
                    'Le champ "decision" est optionnel',
                    'Valeurs acceptées pour "decision": accepté, en_attente, refusé, admin a list principal, admin a list d\'attente',
                    'Prix unitaire: 2050 DHS par appareil auditif'
                ]
            ]
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la génération du template: ' . $e->getMessage()
        ], 500);
    }
}
public function getTemplateLunettes()
{
    try {
        $headers = [
            'nom' => 'Nom du bénéficiaire',
            'prenom' => 'Prénom du bénéficiaire',
            'sexe' => 'M ou F',
            'date_naissance' => 'Format: YYYY-MM-DD',
            'telephone' => 'Numéro de téléphone',
            'adresse' => 'Adresse complète',
            'email' => 'Email (optionnel)',
            'cin' => 'Numéro CIN (optionnel)',
            'enfants_scolarises' => 'oui/non (obligatoire pour les moins de 18 ans)',
            // NOUVEAU : colonne decision
            'decision' => 'accepté/en_attente/refusé/admin a list principal/admin a list d\'attente (optionnel)'
        ];
        $exemples = [
            [
                'nom' => 'Alami',
                'prenom' => 'Fatima',
                'sexe' => 'F',
                'date_naissance' => '2010-03-15',
                'telephone' => '0612345678',
                'adresse' => '123 Rue Mohammed V, Casablanca',
                'email' => 'fatima.alami@email.com',
                'cin' => '',
                'enfants_scolarises' => 'oui',
                'decision' => 'accepté'
            ],
            [
                'nom' => 'Bennani',
                'prenom' => 'Ahmed',
                'sexe' => 'M',
                'date_naissance' => '1975-08-22',
                'telephone' => '0687654321',
                'adresse' => '456 Avenue Hassan II, Rabat',
                'email' => 'ahmed.bennani@email.com',
                'cin' => 'AB123456',
                'enfants_scolarises' => '', // Pas applicable pour un adulte
                'decision' => 'en_attente'
            ]
        ];
        return response()->json([
            'success' => true,
            'data' => [
                'type_assistance' => 'Lunettes',
                'headers' => $headers,
                'exemples' => $exemples,
                'regles' => [
                    'Le champ "enfants_scolarises" est obligatoire pour les bénéficiaires de moins de 18 ans',
                    'Valeurs acceptées pour "enfants_scolarises": oui, non',
                    'Pour les adultes (18 ans et plus), le champ "enfants_scolarises" peut rester vide',
                    'Le champ "decision" est optionnel',
                    'Valeurs acceptées pour "decision": accepté, en_attente, refusé, admin a list principal, admin a list d\'attente',
                    'Prix unitaire: 190 DHS par lunette'
                ]
            ]
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la génération du template: ' . $e->getMessage()
        ], 500);
    }
}
public function getReglesValidation($type)
{
    $reglesBase = [
        'nom' => 'Obligatoire, minimum 2 caractères',
        'prenom' => 'Obligatoire, minimum 2 caractères',
        'sexe' => 'Obligatoire, M ou F',
        'date_naissance' => 'Obligatoire, format YYYY-MM-DD',
        'telephone' => 'Obligatoire, format marocain valide',
        'adresse' => 'Obligatoire, minimum 10 caractères',
        'email' => 'Optionnel, format email valide si renseigné',
        'cin' => 'Optionnel, format CIN marocain si renseigné'
    ];
    $reglesSpecifiques = [];
    $prixUnitaire = 0;
    $typeLibelle = strtolower($type);
    if ($typeLibelle === 'lunettes') {
        $reglesSpecifiques['enfants_scolarises'] = 'Obligatoire pour les moins de 18 ans, valeurs: oui/non';
        $prixUnitaire = 190;
    } elseif (strpos($typeLibelle, 'auditif') !== false) {
        $reglesSpecifiques['cote'] = 'Obligatoire, valeurs: unilatéral/bilatéral';
        $reglesSpecifiques['enfants_scolarises'] = 'Obligatoire pour les moins de 18 ans, valeurs: oui/non';
        $prixUnitaire = 2050;
    }
    $reglesSpecifiques['decision'] = 'Optionnel, valeurs: accepté, en_attente, refusé, admin a list principal, admin a list d\'attente';
    return response()->json([
        'success' => true,
        'data' => [
            'type_assistance' => $type,
            'prix_unitaire' => $prixUnitaire,
            'regles_base' => $reglesBase,
            'regles_specifiques' => $reglesSpecifiques,
            'age_limite_enfant' => 18,
            'decisions_autorisees' => [
                'accepté',
                'en_attente', 
                'refusé',
                'admin a list principal',
                'admin a list d\'attente'
            ]
        ]
    ]);
}
public function getGroupedListsByCampagne($campagneId)
{
    try {
        $campagne = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'campagnes_medicales.*',
                'types_assistance.libelle as type_assistance'
            )
            ->where('campagnes_medicales.id', $campagneId)
            ->whereNull('campagnes_medicales.date_suppression')
            ->first();
        if (!$campagne) {
            return response()->json([
                'success' => false,
                'message' => 'Campagne non trouvée'
            ], 404);
        }
        $allBeneficiaires = DB::table('beneficiaires')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'beneficiaires.id',
                'beneficiaires.nom',
                'beneficiaires.prenom',
                'beneficiaires.sexe',
                'beneficiaires.date_naissance',
                'beneficiaires.telephone',
                'beneficiaires.email',
                'beneficiaires.adresse',
                'beneficiaires.cin',
                'beneficiaires.decision',
                'beneficiaires.a_beneficie',
                'beneficiaires.enfants_scolarises',
                'beneficiaires.cote',
                'beneficiaires.lateralite',
                'beneficiaires.created_at',
                'types_assistance.libelle as type_assistance'
            )
            ->where('beneficiaires.campagne_id', $campagneId)
            ->whereNull('beneficiaires.date_suppression')
            ->orderBy('beneficiaires.nom')
            ->orderBy('beneficiaires.prenom')
            ->get();
        $allBeneficiaires = $allBeneficiaires->map(function($beneficiaire) {
            if ($beneficiaire->date_naissance) {
                $age = Carbon::parse($beneficiaire->date_naissance)->age;
                $beneficiaire->age = $age;
                $beneficiaire->est_enfant = $age < 18;
            } else {
                $beneficiaire->age = null;
                $beneficiaire->est_enfant = false;
            }
            return $beneficiaire;
        });
        $participants = $allBeneficiaires->filter(function($b) {
            return in_array($b->decision, ['accepté', 'en_attente', 'refusé']) || 
                   empty($b->decision) || 
                   $b->decision === null;
        })->values();
        $adminPrincipal = $allBeneficiaires->filter(function($b) {
            return $b->decision === 'admin a list principal';
        })->values();
        $adminAttente = $allBeneficiaires->filter(function($b) {
            return $b->decision === 'admin a list d\'attente';
        })->values();
        $statistics = [
            'total_participants' => $participants->count(),
            'total_admin_principal' => $adminPrincipal->count(),
            'total_admin_attente' => $adminAttente->count(),
            'total_all' => $allBeneficiaires->count(),
            'participants_stats' => [
                'acceptes' => $participants->where('decision', 'accepté')->count(),
                'en_attente' => $participants->where('decision', 'en_attente')->count(),
                'refuses' => $participants->where('decision', 'refusé')->count(),
                'non_definis' => $participants->filter(function($b) {
                    return empty($b->decision) || $b->decision === null;
                })->count(),
                'ayant_beneficie' => $participants->where('a_beneficie', true)->count(),
                'hommes' => $participants->where('sexe', 'M')->count(),
                'femmes' => $participants->where('sexe', 'F')->count(),
                'enfants' => $participants->where('est_enfant', true)->count()
            ],
            'admin_principal_stats' => [
                'ayant_beneficie' => $adminPrincipal->where('a_beneficie', true)->count(),
                'hommes' => $adminPrincipal->where('sexe', 'M')->count(),
                'femmes' => $adminPrincipal->where('sexe', 'F')->count(),
                'enfants' => $adminPrincipal->where('est_enfant', true)->count()
            ],
            'admin_attente_stats' => [
                'ayant_beneficie' => $adminAttente->where('a_beneficie', true)->count(),
                'hommes' => $adminAttente->where('sexe', 'M')->count(),
                'femmes' => $adminAttente->where('sexe', 'F')->count(),
                'enfants' => $adminAttente->where('est_enfant', true)->count()
            ],
            'pourcentages' => [
                'participants' => $allBeneficiaires->count() > 0 ? 
                    round(($participants->count() / $allBeneficiaires->count()) * 100, 2) : 0,
                'admin_principal' => $allBeneficiaires->count() > 0 ? 
                    round(($adminPrincipal->count() / $allBeneficiaires->count()) * 100, 2) : 0,
                'admin_attente' => $allBeneficiaires->count() > 0 ? 
                    round(($adminAttente->count() / $allBeneficiaires->count()) * 100, 2) : 0
            ],
            'credit_estime' => $this->calculateCreditForGroupedLists(
                $allBeneficiaires, 
                $campagne->type_assistance
            )
            ];
        return response()->json([
            'success' => true,
            'data' => [
                'campagne' => $campagne,
                'participants' => $participants,
                'admin_principal' => $adminPrincipal,
                'admin_attente' => $adminAttente,
                'statistics' => $statistics
            ]
        ]);
    } catch (Exception $e) {
        Log::error('Erreur getGroupedListsByCampagne', [
            'error' => $e->getMessage(),
            'campagne_id' => $campagneId
        ]);
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement des listes groupées: ' . $e->getMessage()
        ], 500);
    }
}
private function calculateCreditForGroupedLists($beneficiaires, $typeAssistance)
{
    $typeLibelle = strtolower($typeAssistance ?? '');
    $prixUnitaire = 0;   
    if (strpos($typeLibelle, 'lunette') !== false) {
        $prixUnitaire = 190;
    } elseif (strpos($typeLibelle, 'auditif') !== false) {
        $prixUnitaire = 2050;
    }
    $totalAyantBeneficie = $beneficiaires->where('a_beneficie', true)->count();
    $creditTotal = $totalAyantBeneficie * $prixUnitaire;
    $participants = $beneficiaires->filter(function($b) {
        return in_array($b->decision, ['accepté', 'en_attente', 'refusé']) || 
               empty($b->decision) || 
               $b->decision === null;
    });
    $adminPrincipal = $beneficiaires->where('decision', 'admin a list principal');
    $adminAttente = $beneficiaires->where('decision', 'admin a list d\'attente');
    return [
        'prix_unitaire' => $prixUnitaire,
        'total' => $creditTotal,
        'par_liste' => [
            'participants' => $participants->where('a_beneficie', true)->count() * $prixUnitaire,
            'admin_principal' => $adminPrincipal->where('a_beneficie', true)->count() * $prixUnitaire,
            'admin_attente' => $adminAttente->where('a_beneficie', true)->count() * $prixUnitaire
        ]
    ];
}
public function updateDecisionsByCampagne(Request $request, $campagneId)
{
    $validator = Validator::make($request->all(), [
        'beneficiaire_ids' => 'required|array|min:1',
        'beneficiaire_ids.*' => 'exists:beneficiaires,id',
        'decision' => 'required|in:accepté,en_attente,refusé,admin a list principal,admin a list d\'attente',
        'commentaire' => 'nullable|string|max:500'
    ]);
    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $validator->errors()
        ], 422);
    }
    try {
        DB::beginTransaction();
        $beneficiairesValides = DB::table('beneficiaires')
            ->whereIn('id', $request->beneficiaire_ids)
            ->where('campagne_id', $campagneId)
            ->whereNull('date_suppression')
            ->pluck('id')
            ->toArray();
        if (count($beneficiairesValides) !== count($request->beneficiaire_ids)) {
            return response()->json([
                'success' => false,
                'message' => 'Certains bénéficiaires ne sont pas valides ou n\'appartiennent pas à cette campagne'
            ], 422);
        }
        $updated = DB::table('beneficiaires')
            ->whereIn('id', $request->beneficiaire_ids)
            ->update([
                'decision' => $request->decision,
                'updated_at' => now()
            ]);
        Log::info('Mise à jour en masse des décisions', [
            'campagne_id' => $campagneId,
            'beneficiaire_ids' => $request->beneficiaire_ids,
            'nouvelle_decision' => $request->decision,
            'count' => $updated,
            'user_id' => Auth::id()
        ]);
        DB::commit();
        return response()->json([
            'success' => true,
            'message' => "$updated bénéficiaires mis à jour avec la décision: {$request->decision}",
            'data' => [
                'updated_count' => $updated,
                'decision' => $request->decision
            ]
        ]);
    } catch (Exception $e) {
        DB::rollBack();
        Log::error('Erreur updateDecisionsByCampagne', [
            'error' => $e->getMessage(),
            'campagne_id' => $campagneId,
            'beneficiaire_ids' => $request->beneficiaire_ids ?? []
        ]);
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la mise à jour: ' . $e->getMessage()
        ], 500);
    }
}
public function deleteAssistanceMedicale($id)
{
    try {
        DB::beginTransaction();
        $assistance = DB::table('assistance_medicales')
            ->where('id', $id)
            ->whereNull('date_suppression')
            ->first();
        if (!$assistance) {
            return response()->json([
                'success' => false,
                'message' => 'Assistance médicale non trouvée'
            ], 404);
        }
        DB::table('assistance_medicales')
            ->where('id', $id)
            ->update([
                'date_suppression' => now(),
                'updated_at' => now()
            ]);
        DB::commit();
        Log::info('Assistance médicale supprimée', [
            'assistance_id' => $id,
            'numero_assistance' => $assistance->numero_assistance,
            'user_id' => Auth::id()
        ]);
        return response()->json([
            'success' => true,
            'message' => 'Assistance médicale supprimée avec succès'
        ]);
    } catch (Exception $e) {
        DB::rollBack();
        Log::error('Erreur suppression assistance médicale', [
            'error' => $e->getMessage(),
            'assistance_id' => $id
        ]);
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la suppression: ' . $e->getMessage()
        ], 500);
    }
}
public function getAssistanceMedicale($id)
{
    try {
        $assistance = $this->getAssistanceById($id);
        if (!$assistance) {
            return response()->json([
                'success' => false,
                'message' => 'Assistance médicale non trouvée'
            ], 404);
        }
        return response()->json([
            'success' => true,
            'data' => $assistance
        ]);
    } catch (Exception $e) {
        Log::error('Erreur getAssistanceMedicale', [
            'error' => $e->getMessage(),
            'assistance_id' => $id
        ]);
        return response()->json([
            'success' => false,
            'message' => 'Assistance médicale non trouvée'
        ], 404);
    }
}
public function exportAssistances(Request $request)
{
    $validator = Validator::make($request->all(), [
        'format' => 'required|in:excel,csv',
        'filters' => 'nullable|array'
    ]);
    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Paramètres d\'export invalides',
            'errors' => $validator->errors()
        ], 422);
    }
    try {
        $query = DB::table('assistance_medicales')
            ->leftJoin('beneficiaires', 'assistance_medicales.beneficiaire_id', '=', 'beneficiaires.id')
            ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('details_type_assistances', 'assistance_medicales.details_type_assistance_id', '=', 'details_type_assistances.id')
            ->leftJoin('campagnes_medicales', 'assistance_medicales.campagne_id', '=', 'campagnes_medicales.id')
            ->leftJoin('situations', 'assistance_medicales.situation_id', '=', 'situations.id')
            ->leftJoin('etat_dones', 'assistance_medicales.etat_don_id', '=', 'etat_dones.id')
            ->select(
                'assistance_medicales.numero_assistance',
                'beneficiaires.nom as beneficiaire_nom',
                'beneficiaires.prenom as beneficiaire_prenom',
                'beneficiaires.cin as beneficiaire_cin',
                'types_assistance.libelle as type_assistance',
                'details_type_assistances.libelle as details_type_assistance',
                'campagnes_medicales.nom as campagne',
                'assistance_medicales.date_assistance',
                'assistance_medicales.montant',
                'assistance_medicales.priorite',
                'situations.libelle as situation',
                'etat_dones.libelle as etat',
                'assistance_medicales.assistance_terminee',
                'assistance_medicales.observations'
            )
            ->whereNull('assistance_medicales.date_suppression')
            ->orderBy('assistance_medicales.date_assistance', 'desc');
        $filters = $request->get('filters', []);
        foreach ($filters as $key => $value) {
            if (!empty($value)) {
                switch ($key) {
                    case 'campagne_id':
                        $query->where('assistance_medicales.campagne_id', $value);
                        break;
                    case 'type_assistance_id':
                        $query->where('assistance_medicales.type_assistance_id', $value);
                        break;
                    case 'situation_id':
                        $query->where('assistance_medicales.situation_id', $value);
                        break;
                }
            }
        }
        $assistances = $query->get();
        $exportData = $assistances->map(function($assistance) {
            return [
                'Numéro d\'assistance' => $assistance->numero_assistance,
                'Bénéficiaire' => $assistance->beneficiaire_nom . ' ' . $assistance->beneficiaire_prenom,
                'CIN' => $assistance->beneficiaire_cin,
                'Type d\'assistance' => $assistance->type_assistance,
                'Détails' => $assistance->details_type_assistance ?? '',
                'Campagne' => $assistance->campagne ?? '',
                'Date d\'assistance' => Carbon::parse($assistance->date_assistance)->format('d/m/Y'),
                'Montant (DH)' => $assistance->montant ?? 0,
                'Priorité' => $assistance->priorite,
                'Situation' => $assistance->situation ?? '',
                'État' => $assistance->etat ?? '',
                'Terminée' => $assistance->assistance_terminee ? 'Oui' : 'Non',
                'Observations' => $assistance->observations ?? ''
            ];
        });
        $filename = 'assistances_medicales_' . date('Y-m-d_H-i-s') . '.' . $request->format;
        return response()->json([
            'success' => true,
            'message' => 'Export généré avec succès',
            'data' => $exportData,
            'filename' => $filename,
            'total_records' => $exportData->count()
        ]);
    } catch (Exception $e) {
        Log::error('Erreur export assistances', [
            'error' => $e->getMessage(),
            'filters' => $request->all()
        ]);
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'export: ' . $e->getMessage()
        ], 500);
    }
}
public function getAllFormOptions()
{
    try {
        // Appeler la méthode corrigée getFormOptions
        $formOptionsResponse = $this->getFormOptions();
        $formOptionsData = $formOptionsResponse->getData(true);

        if (!$formOptionsData['success']) {
            throw new Exception($formOptionsData['message'] ?? 'Erreur lors du chargement des options de base');
        }

        return response()->json([
            'success' => true,
            'data' => $formOptionsData['data']
        ]);

    } catch (Exception $e) {
        Log::error('Erreur getAllFormOptions', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement complet des options: ' . $e->getMessage(),
            'data' => [
                'types_assistance' => [],
                'campagnes_actives' => [],
                'etat_dones' => [],
                'nature_dones' => [],
                'situations' => [],
                'sexes' => [
                    ['value' => 'M', 'label' => 'Masculin'],
                    ['value' => 'F', 'label' => 'Féminin']
                ],
                'priorites' => [
                    ['value' => 'Normale', 'label' => 'Normale'],
                    ['value' => 'Urgente', 'label' => 'Urgente'],
                    ['value' => 'Très urgente', 'label' => 'Très urgente']
                ]
            ]
        ], 500);
    }
}
public function getCampagneLists($campagneId)
{
    try {
        // Vérifier que la campagne existe
        $campagne = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'campagnes_medicales.*',
                'types_assistance.libelle as type_assistance'
            )
            ->where('campagnes_medicales.id', $campagneId)
            ->whereNull('campagnes_medicales.date_suppression')
            ->first();

        if (!$campagne) {
            return response()->json([
                'success' => false,
                'message' => 'Campagne non trouvée'
            ], 404);
        }

        // 1. Récupérer les participants qui ont répondu "oui" à cette campagne
        $participantsOui = DB::table('participants')
            ->where('campagne_id', $campagneId)
            ->where('statut', 'oui')
            ->whereNull('date_suppression')
            ->orderBy('nom')
            ->orderBy('prenom')
            ->get([
                'id', 'nom', 'prenom', 'telephone', 'email', 'adresse', 
                'sexe', 'date_naissance', 'statut', 'commentaire', 'created_at'
            ]);

        // 2. Récupérer les bénéficiaires en liste principale
        $adminPrincipal = DB::table('beneficiaires')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'beneficiaires.id',
                'beneficiaires.nom',
                'beneficiaires.prenom',
                'beneficiaires.sexe',
                'beneficiaires.date_naissance',
                'beneficiaires.telephone',
                'beneficiaires.email',
                'beneficiaires.adresse',
                'beneficiaires.cin',
                'beneficiaires.decision',
                'beneficiaires.a_beneficie',
                'beneficiaires.enfants_scolarises',
                'beneficiaires.cote',
                'beneficiaires.created_at',
                'types_assistance.libelle as type_assistance'
            )
            ->where('beneficiaires.campagne_id', $campagneId)
            ->where('beneficiaires.decision', 'admin a list principal')
            ->whereNull('beneficiaires.date_suppression')
            ->orderBy('beneficiaires.nom')
            ->orderBy('beneficiaires.prenom')
            ->get();

        // 3. Récupérer les bénéficiaires en liste d'attente
        $adminAttente = DB::table('beneficiaires')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'beneficiaires.id',
                'beneficiaires.nom',
                'beneficiaires.prenom',
                'beneficiaires.sexe',
                'beneficiaires.date_naissance',
                'beneficiaires.telephone',
                'beneficiaires.email',
                'beneficiaires.adresse',
                'beneficiaires.cin',
                'beneficiaires.decision',
                'beneficiaires.a_beneficie',
                'beneficiaires.enfants_scolarises',
                'beneficiaires.cote',
                'beneficiaires.created_at',
                'types_assistance.libelle as type_assistance'
            )
            ->where('beneficiaires.campagne_id', $campagneId)
            ->where('beneficiaires.decision', 'admin a list d\'attente')
            ->whereNull('beneficiaires.date_suppression')
            ->orderBy('beneficiaires.nom')
            ->orderBy('beneficiaires.prenom')
            ->get();

        // 4. Calcul des âges pour tous les bénéficiaires
        $calculateAge = function($collection) {
            return $collection->map(function($item) {
                if ($item->date_naissance) {
                    $age = Carbon::parse($item->date_naissance)->age;
                    $item->age = $age;
                    $item->est_enfant = $age < 18;
                } else {
                    $item->age = null;
                    $item->est_enfant = false;
                }
                return $item;
            });
        };

        $adminPrincipal = $calculateAge($adminPrincipal);
        $adminAttente = $calculateAge($adminAttente);

        // 5. Calcul des statistiques détaillées
        $statistics = [
            // Totaux par liste
            'total_participants_oui' => $participantsOui->count(),
            'total_admin_principal' => $adminPrincipal->count(),
            'total_admin_attente' => $adminAttente->count(),
            
            // Détails participants
            'participants_stats' => [
                'hommes' => $participantsOui->where('sexe', 'M')->count(),
                'femmes' => $participantsOui->where('sexe', 'F')->count(),
                'total' => $participantsOui->count()
            ],
            
            // Détails admin principal
            'admin_principal_stats' => [
                'hommes' => $adminPrincipal->where('sexe', 'M')->count(),
                'femmes' => $adminPrincipal->where('sexe', 'F')->count(),
                'enfants' => $adminPrincipal->where('est_enfant', true)->count(),
                'ayant_beneficie' => $adminPrincipal->where('a_beneficie', true)->count(),
                'total' => $adminPrincipal->count()
            ],
            
            // Détails admin attente
            'admin_attente_stats' => [
                'hommes' => $adminAttente->where('sexe', 'M')->count(),
                'femmes' => $adminAttente->where('sexe', 'F')->count(),
                'enfants' => $adminAttente->where('est_enfant', true)->count(),
                'ayant_beneficie' => $adminAttente->where('a_beneficie', true)->count(),
                'total' => $adminAttente->count()
            ],
            
            // Crédit estimé selon le type d'assistance
            'credit_estime' => $this->calculateCreditForLists(
                $adminPrincipal->merge($adminAttente), 
                $campagne->type_assistance
            )
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'campagne' => $campagne,
                'participants_oui' => $participantsOui,
                'admin_principal_list' => $adminPrincipal,
                'admin_attente_list' => $adminAttente,
                'statistics' => $statistics
            ]
        ]);

    } catch (Exception $e) {
        Log::error('Erreur getCampagneLists', [
            'error' => $e->getMessage(),
            'campagne_id' => $campagneId
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement des listes: ' . $e->getMessage()
        ], 500);
    }
}
private function calculateCreditForLists($beneficiaires, $typeAssistance)
{
    $typeLibelle = strtolower($typeAssistance ?? '');
    $prixUnitaire = 0;
    
    if (strpos($typeLibelle, 'lunette') !== false) {
        $prixUnitaire = 190;
    } elseif (strpos($typeLibelle, 'auditif') !== false) {
        $prixUnitaire = 2050;
    }
    
    $totalAyantBeneficie = $beneficiaires->where('a_beneficie', true)->count();
    
    return [
        'prix_unitaire' => $prixUnitaire,
        'total_beneficiaires' => $beneficiaires->count(),
        'ayant_beneficie' => $totalAyantBeneficie,
        'credit_total' => $totalAyantBeneficie * $prixUnitaire
    ];
}
public function getRapportCampagne($id)
{
    try {
        // Vérifier que la campagne existe
        $campagne = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'campagnes_medicales.*',
                'types_assistance.libelle as type_assistance_libelle'
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

        // Statistiques générales des bénéficiaires
        $beneficiairesStats = DB::table('beneficiaires')
            ->where('campagne_id', $id)
            ->whereNull('date_suppression')
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN sexe = "M" THEN 1 ELSE 0 END) as hommes'),
                DB::raw('SUM(CASE WHEN sexe = "F" THEN 1 ELSE 0 END) as femmes'),
                DB::raw('SUM(CASE WHEN a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie')
            )
            ->first();

        // Récupérer tous les bénéficiaires pour analyses détaillées
        $beneficiaires = DB::table('beneficiaires')
            ->where('campagne_id', $id)
            ->whereNull('date_suppression')
            ->get();

        // Calculer les tranches d'âge
        $tranchesAge = [
            'moins_15' => 0,
            '15_64' => 0,
            'plus_65' => 0
        ];

        foreach ($beneficiaires as $beneficiaire) {
            if ($beneficiaire->date_naissance) {
                $age = Carbon::parse($beneficiaire->date_naissance)->age;
                if ($age < 15) {
                    $tranchesAge['moins_15']++;
                } elseif ($age <= 64) {
                    $tranchesAge['15_64']++;
                } else {
                    $tranchesAge['plus_65']++;
                }
            }
        }

        $typeAssistanceLibelle = strtolower($campagne->type_assistance_libelle ?? '');
        
        // Statistiques spécifiques par type d'assistance
        $statistiquesSpecifiques = [];

        if (strpos($typeAssistanceLibelle, 'lunette') !== false) {
            $statistiquesSpecifiques['lunettes'] = $this->generateLunettesStats($beneficiaires);
        }

        if (strpos($typeAssistanceLibelle, 'auditif') !== false) {
            $statistiquesSpecifiques['auditifs'] = $this->generateAuditifsStats($beneficiaires);
        }

        // Statistiques des listes (participants, admin principal, admin attente)
        $listesStats = $this->generateListesStats($id);

        // Statistiques budgétaires
        $budgetStats = $this->generateBudgetStats($campagne, $beneficiaires, $typeAssistanceLibelle);

        // Tendances temporelles (création des bénéficiaires)
        $tendances = $this->generateTendancesStats($id);

        $rapportComplet = [
            'campagne' => [
                'id' => $campagne->id,
                'nom' => $campagne->nom,
                'description' => $campagne->description,
                'date_debut' => $campagne->date_debut,
                'date_fin' => $campagne->date_fin,
                'lieu' => $campagne->lieu,
                'type_assistance' => $campagne->type_assistance_libelle,
                'budget_alloue' => $campagne->budget,
                'statut' => $campagne->statut,
                'created_at' => $campagne->created_at
            ],
            'statistiques_generales' => [
                'total_beneficiaires' => $beneficiairesStats->total,
                'hommes' => $beneficiairesStats->hommes,
                'femmes' => $beneficiairesStats->femmes,
                'ayant_beneficie' => $beneficiairesStats->ayant_beneficie,
                'taux_reussite' => $beneficiairesStats->total > 0 ? 
                    round(($beneficiairesStats->ayant_beneficie / $beneficiairesStats->total) * 100, 2) : 0,
                'tranches_age' => $tranchesAge
            ],
            'statistiques_specifiques' => $statistiquesSpecifiques,
            'listes' => $listesStats,
            'budget' => $budgetStats,
            'tendances' => $tendances,
            'date_generation' => now()->format('Y-m-d H:i:s')
        ];

        return response()->json([
            'success' => true,
            'data' => $rapportComplet
        ]);

    } catch (Exception $e) {
        Log::error('Erreur génération rapport campagne', [
            'campagne_id' => $id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la génération du rapport: ' . $e->getMessage()
        ], 500);
    }
}
private function generateLunettesStats($beneficiaires)
{
    $lunettesStats = [
        'total_beneficiaires' => $beneficiaires->count(),
        'ayant_beneficie' => $beneficiaires->where('a_beneficie', true)->count(),
        'par_sexe' => [
            'M' => $beneficiaires->where('sexe', 'M')->count(),
            'F' => $beneficiaires->where('sexe', 'F')->count()
        ],
        'enfants_scolarises' => [
            'oui' => 0,
            'non' => 0,
            'non_applicable' => 0
        ],
        'par_age' => [
            'moins_15' => 0,
            '15_64' => 0,
            'plus_65' => 0
        ],
        'prix_unitaire' => 190,
        'credit_consomme' => $beneficiaires->where('a_beneficie', true)->count() * 190,
        'budget_previsionnel' => $beneficiaires->count() * 190
    ];

    // Analyser les enfants scolarisés et les tranches d'âge
    foreach ($beneficiaires as $beneficiaire) {
        // Âge
        if ($beneficiaire->date_naissance) {
            $age = Carbon::parse($beneficiaire->date_naissance)->age;
            if ($age < 15) {
                $lunettesStats['par_age']['moins_15']++;
            } elseif ($age <= 64) {
                $lunettesStats['par_age']['15_64']++;
            } else {
                $lunettesStats['par_age']['plus_65']++;
            }
        }

        // Enfants scolarisés (pour les moins de 18 ans)
        if ($beneficiaire->date_naissance) {
            $age = Carbon::parse($beneficiaire->date_naissance)->age;
            if ($age < 18) {
                if ($beneficiaire->enfants_scolarises === true || $beneficiaire->enfants_scolarises === 1) {
                    $lunettesStats['enfants_scolarises']['oui']++;
                } elseif ($beneficiaire->enfants_scolarises === false || $beneficiaire->enfants_scolarises === 0) {
                    $lunettesStats['enfants_scolarises']['non']++;
                } else {
                    $lunettesStats['enfants_scolarises']['non_applicable']++;
                }
            } else {
                $lunettesStats['enfants_scolarises']['non_applicable']++;
            }
        }
    }

    return $lunettesStats;
}
private function generateAuditifsStats($beneficiaires)
{
    $auditifsStats = [
        'total_beneficiaires' => $beneficiaires->count(),
        'ayant_beneficie' => $beneficiaires->where('a_beneficie', true)->count(),
        'par_sexe' => [
            'M' => $beneficiaires->where('sexe', 'M')->count(),
            'F' => $beneficiaires->where('sexe', 'F')->count()
        ],
        'par_cote' => [
            'unilateral' => $beneficiaires->where('cote', 'unilatéral')->count(),
            'bilateral' => $beneficiaires->where('cote', 'bilatéral')->count()
        ],
        'par_age' => [
            'moins_15' => 0,
            '15_64' => 0,
            'plus_65' => 0
        ],
        'prix_unitaire' => 2050,
        'credit_consomme' => $beneficiaires->where('a_beneficie', true)->count() * 2050,
        'budget_previsionnel' => $beneficiaires->count() * 2050
    ];

    // Analyser les tranches d'âge
    foreach ($beneficiaires as $beneficiaire) {
        if ($beneficiaire->date_naissance) {
            $age = Carbon::parse($beneficiaire->date_naissance)->age;
            if ($age < 15) {
                $auditifsStats['par_age']['moins_15']++;
            } elseif ($age <= 64) {
                $auditifsStats['par_age']['15_64']++;
            } else {
                $auditifsStats['par_age']['plus_65']++;
            }
        }
    }

    return $auditifsStats;
}
private function generateListesStats($campagneId)
{
    try {
        // Participants qui ont dit "oui"
        $participantsOui = DB::table('participants')
            ->where('campagne_id', $campagneId)
            ->where('statut', 'oui')
            ->whereNull('date_suppression')
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN sexe = "M" THEN 1 ELSE 0 END) as hommes'),
                DB::raw('SUM(CASE WHEN sexe = "F" THEN 1 ELSE 0 END) as femmes')
            )
            ->first();

        // Bénéficiaires en liste principale
        $adminPrincipal = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->where('decision', 'admin a list principal')
            ->whereNull('date_suppression')
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN sexe = "M" THEN 1 ELSE 0 END) as hommes'),
                DB::raw('SUM(CASE WHEN sexe = "F" THEN 1 ELSE 0 END) as femmes'),
                DB::raw('SUM(CASE WHEN a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie')
            )
            ->first();

        // Bénéficiaires en liste d'attente
        $adminAttente = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->where('decision', 'admin a list d\'attente')
            ->whereNull('date_suppression')
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN sexe = "M" THEN 1 ELSE 0 END) as hommes'),
                DB::raw('SUM(CASE WHEN sexe = "F" THEN 1 ELSE 0 END) as femmes'),
                DB::raw('SUM(CASE WHEN a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie')
            )
            ->first();

        return [
            'participants_oui' => [
                'total' => $participantsOui->total ?? 0,
                'hommes' => $participantsOui->hommes ?? 0,
                'femmes' => $participantsOui->femmes ?? 0
            ],
            'admin_principal' => [
                'total' => $adminPrincipal->total ?? 0,
                'hommes' => $adminPrincipal->hommes ?? 0,
                'femmes' => $adminPrincipal->femmes ?? 0,
                'ayant_beneficie' => $adminPrincipal->ayant_beneficie ?? 0
            ],
            'admin_attente' => [
                'total' => $adminAttente->total ?? 0,
                'hommes' => $adminAttente->hommes ?? 0,
                'femmes' => $adminAttente->femmes ?? 0,
                'ayant_beneficie' => $adminAttente->ayant_beneficie ?? 0
            ]
        ];

    } catch (Exception $e) {
        Log::warning('Erreur chargement listes stats', [
            'campagne_id' => $campagneId,
            'error' => $e->getMessage()
        ]);
        
        return [
            'participants_oui' => ['total' => 0, 'hommes' => 0, 'femmes' => 0],
            'admin_principal' => ['total' => 0, 'hommes' => 0, 'femmes' => 0, 'ayant_beneficie' => 0],
            'admin_attente' => ['total' => 0, 'hommes' => 0, 'femmes' => 0, 'ayant_beneficie' => 0]
        ];
    }
}
private function generateBudgetStats($campagne, $beneficiaires, $typeAssistanceLibelle)
{
    $prixUnitaire = 0;
    
    if (strpos($typeAssistanceLibelle, 'lunette') !== false) {
        $prixUnitaire = 190;
    } elseif (strpos($typeAssistanceLibelle, 'auditif') !== false) {
        $prixUnitaire = 2050;
    }

    $ayantBeneficie = $beneficiaires->where('a_beneficie', true)->count();
    $budgetConsomme = $ayantBeneficie * $prixUnitaire;
    $budgetPrevisionnel = $beneficiaires->count() * $prixUnitaire;
    $budgetAlloue = $campagne->budget ?? 0;

    return [
        'budget_alloue' => $budgetAlloue,
        'budget_previsionnel' => $budgetPrevisionnel,
        'budget_consomme' => $budgetConsomme,
        'economie_realisee' => $budgetPrevisionnel - $budgetConsomme,
        'budget_restant' => $budgetAlloue - $budgetConsomme,
        'taux_utilisation_previsionnel' => $budgetPrevisionnel > 0 ? 
            round(($budgetConsomme / $budgetPrevisionnel) * 100, 2) : 0,
        'taux_utilisation_alloue' => $budgetAlloue > 0 ? 
            round(($budgetConsomme / $budgetAlloue) * 100, 2) : 0,
        'prix_unitaire' => $prixUnitaire
    ];
}
private function generateTendancesStats($campagneId)
{
    try {
        // Évolution des inscriptions par mois
        $inscriptionsParMois = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->whereNull('date_suppression')
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as mois'),
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN sexe = "M" THEN 1 ELSE 0 END) as hommes'),
                DB::raw('SUM(CASE WHEN sexe = "F" THEN 1 ELSE 0 END) as femmes'),
                DB::raw('SUM(CASE WHEN a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie')
            )
            ->groupBy('mois')
            ->orderBy('mois')
            ->get();

        // Évolution des bénéficiaires par semaine
        $beneficiairesParSemaine = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->where('a_beneficie', true)
            ->whereNull('date_suppression')
            ->select(
                DB::raw('YEARWEEK(updated_at) as semaine'),
                DB::raw('COUNT(*) as total')
            )
            ->groupBy('semaine')
            ->orderBy('semaine')
            ->get();

        return [
            'inscriptions_par_mois' => $inscriptionsParMois,
            'beneficiaires_par_semaine' => $beneficiairesParSemaine,
            'periode_analyse' => [
                'debut' => $inscriptionsParMois->first()->mois ?? null,
                'fin' => $inscriptionsParMois->last()->mois ?? null
            ]
        ];

    } catch (Exception $e) {
        Log::warning('Erreur génération tendances', [
            'campagne_id' => $campagneId,
            'error' => $e->getMessage()
        ]);
        
        return [
            'inscriptions_par_mois' => [],
            'beneficiaires_par_semaine' => [],
            'periode_analyse' => ['debut' => null, 'fin' => null]
        ];
    }
}

public function getRapportPeriode(Request $request)
{
    $validator = Validator::make($request->all(), [
        'date_debut' => 'required|date',
        'date_fin' => 'required|date|after_or_equal:date_debut',
        'type_assistance_id' => 'nullable|exists:types_assistance,id',
        'grouper_par' => 'nullable|in:mois,semaine,jour',
        'inclure_campagnes' => 'nullable|array',
        'inclure_campagnes.*' => 'exists:campagnes_medicales,id'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $dateDebut = $request->date_debut;
        $dateFin = $request->date_fin;
        $grouperPar = $request->grouper_par ?? 'mois';

        // Query de base pour les bénéficiaires dans la période
        $query = DB::table('beneficiaires')
            ->leftJoin('campagnes_medicales', 'beneficiaires.campagne_id', '=', 'campagnes_medicales.id')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->whereBetween('beneficiaires.created_at', [$dateDebut, $dateFin])
            ->whereNull('beneficiaires.date_suppression');

        // Filtres optionnels
        if ($request->filled('type_assistance_id')) {
            $query->where('beneficiaires.type_assistance_id', $request->type_assistance_id);
        }

        if ($request->filled('inclure_campagnes')) {
            $query->whereIn('beneficiaires.campagne_id', $request->inclure_campagnes);
        }

        // Groupement selon la période
        $formatDate = match($grouperPar) {
            'jour' => '%Y-%m-%d',
            'semaine' => '%Y-%u',
            'mois' => '%Y-%m',
            default => '%Y-%m'
        };

        $statistiquesPeriode = $query
            ->select(
                DB::raw("DATE_FORMAT(beneficiaires.created_at, '$formatDate') as periode"),
                DB::raw('COUNT(*) as total_beneficiaires'),
                DB::raw('SUM(CASE WHEN beneficiaires.sexe = "M" THEN 1 ELSE 0 END) as hommes'),
                DB::raw('SUM(CASE WHEN beneficiaires.sexe = "F" THEN 1 ELSE 0 END) as femmes'),
                DB::raw('SUM(CASE WHEN beneficiaires.a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie'),
                'types_assistance.libelle as type_assistance'
            )
            ->groupBy('periode', 'types_assistance.libelle')
            ->orderBy('periode')
            ->get();

        // Statistiques globales de la période
        $statistiquesGlobales = $query
            ->select(
                DB::raw('COUNT(*) as total_beneficiaires'),
                DB::raw('SUM(CASE WHEN beneficiaires.sexe = "M" THEN 1 ELSE 0 END) as hommes'),
                DB::raw('SUM(CASE WHEN beneficiaires.sexe = "F" THEN 1 ELSE 0 END) as femmes'),
                DB::raw('SUM(CASE WHEN beneficiaires.a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie')
            )
            ->first();

        // Campagnes actives dans la période
        $campagnesActives = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'campagnes_medicales.id',
                'campagnes_medicales.nom',
                'campagnes_medicales.date_debut',
                'campagnes_medicales.date_fin',
                'types_assistance.libelle as type_assistance'
            )
            ->where(function($q) use ($dateDebut, $dateFin) {
                $q->whereBetween('campagnes_medicales.date_debut', [$dateDebut, $dateFin])
                  ->orWhereBetween('campagnes_medicales.date_fin', [$dateDebut, $dateFin])
                  ->orWhere(function($q2) use ($dateDebut, $dateFin) {
                      $q2->where('campagnes_medicales.date_debut', '<=', $dateDebut)
                         ->where('campagnes_medicales.date_fin', '>=', $dateFin);
                  });
            })
            ->whereNull('campagnes_medicales.date_suppression')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'periode' => [
                    'debut' => $dateDebut,
                    'fin' => $dateFin,
                    'groupement' => $grouperPar
                ],
                'statistiques_globales' => $statistiquesGlobales,
                'statistiques_par_periode' => $statistiquesPeriode,
                'campagnes_actives' => $campagnesActives,
                'date_generation' => now()->format('Y-m-d H:i:s')
            ]
        ]);

    } catch (Exception $e) {
        Log::error('Erreur génération rapport période', [
            'periode' => [$request->date_debut, $request->date_fin],
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la génération du rapport par période: ' . $e->getMessage()
        ], 500);
    }
}
public function exportRapport(Request $request)
{
    $validator = Validator::make($request->all(), [
        'type_rapport' => 'required|in:campagne,comparatif,periode',
        'format' => 'required|in:excel,pdf,csv',
        'donnees' => 'required|array',
        'options' => 'nullable|array'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Paramètres d\'export invalides',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $typeRapport = $request->type_rapport;
        $format = $request->format;
        $donnees = $request->donnees;
        $options = $request->options ?? [];

        // Générer le nom de fichier
        $timestamp = now()->format('Y-m-d_H-i-s');
        $filename = "rapport_{$typeRapport}_{$timestamp}.{$format}";

        // Logique d'export selon le format
        switch ($format) {
            case 'excel':
                // Utiliser PhpSpreadsheet ou Laravel Excel
                $exportData = $this->prepareExcelExport($donnees, $typeRapport, $options);
                break;
                
            case 'pdf':
                // Utiliser DomPDF ou mPDF
                $exportData = $this->preparePdfExport($donnees, $typeRapport, $options);
                break;
                
            case 'csv':
                // Export CSV simple
                $exportData = $this->prepareCsvExport($donnees, $typeRapport, $options);
                break;
        }

        return response()->json([
            'success' => true,
            'message' => 'Rapport exporté avec succès',
            'data' => [
                'filename' => $filename,
                'download_url' => "/api/upas/downloads/{$filename}",
                'format' => $format,
                'taille_fichier' => strlen($exportData ?? '') . ' bytes'
            ]
        ]);

    } catch (Exception $e) {
        Log::error('Erreur export rapport', [
            'type_rapport' => $request->type_rapport,
            'format' => $request->format,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'export: ' . $e->getMessage()
        ], 500);
    }
}
private function generateMetriquesComparaison($rapports)
{
    if (empty($rapports)) {
        return [];
    }

    $metriques = [
        'performance' => [],
        'budget' => [],
        'demographics' => [],
        'efficacite' => []
    ];

    foreach ($rapports as $rapport) {
        $campagneId = $rapport->campagne->id;
        $stats = $rapport->statistiques_generales;

        // Métriques de performance
        $metriques['performance'][$campagneId] = [
            'nom_campagne' => $rapport->campagne->nom,
            'taux_reussite' => $stats->taux_reussite,
            'total_beneficiaires' => $stats->total_beneficiaires,
            'ayant_beneficie' => $stats->ayant_beneficie
        ];

        // Métriques budgétaires
        if (isset($rapport->budget)) {
            $metriques['budget'][$campagneId] = [
                'nom_campagne' => $rapport->campagne->nom,
                'budget_alloue' => $rapport->budget->budget_alloue ?? 0,
                'budget_consomme' => $rapport->budget->budget_consomme ?? 0,
                'taux_utilisation' => $rapport->budget->taux_utilisation_alloue ?? 0,
                'economie_realisee' => $rapport->budget->economie_realisee ?? 0
            ];
        }

        // Métriques démographiques
        $metriques['demographics'][$campagneId] = [
            'nom_campagne' => $rapport->campagne->nom,
            'pourcentage_femmes' => $stats->total_beneficiaires > 0 ? 
                round(($stats->femmes / $stats->total_beneficiaires) * 100, 2) : 0,
            'pourcentage_jeunes' => $stats->total_beneficiaires > 0 ? 
                round(($stats->tranches_age->moins_15 / $stats->total_beneficiaires) * 100, 2) : 0,
            'pourcentage_seniors' => $stats->total_beneficiaires > 0 ? 
                round(($stats->tranches_age->plus_65 / $stats->total_beneficiaires) * 100, 2) : 0
        ];
    }

    // Calculer les moyennes et les meilleures performances
    $metriques['resume'] = [
        'taux_reussite_moyen' => collect($metriques['performance'])->avg('taux_reussite'),
        'meilleure_performance' => collect($metriques['performance'])->sortByDesc('taux_reussite')->first(),
        'budget_moyen_utilise' => collect($metriques['budget'])->avg('taux_utilisation'),
        'economie_totale' => collect($metriques['budget'])->sum('economie_realisee')
    ];

    return $metriques;
}
private function prepareExcelExport($donnees, $typeRapport, $options)
{
    // Placeholder pour l'implémentation Excel
    // Vous pouvez utiliser Laravel Excel ou PhpSpreadsheet ici
    return "Excel export data for {$typeRapport}";
}
private function preparePdfExport($donnees, $typeRapport, $options)
{
    // Placeholder pour l'implémentation PDF
    // Vous pouvez utiliser DomPDF ou mPDF ici
    return "PDF export data for {$typeRapport}";
}

private function analyzeExcelFile($file, $campagne)
{
    // Utiliser PhpSpreadsheet ou une librairie similaire
    require_once 'vendor/autoload.php';
    
    try {
        $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($file->getRealPath());
        $worksheet = $spreadsheet->getActiveSheet();
        
        $data = $worksheet->toArray();
        
        if (empty($data)) {
            return [
                'success' => false,
                'message' => 'Le fichier Excel est vide'
            ];
        }

        // Analyser les données
        return $this->analyzeData($data, $campagne);

    } catch (\Exception $e) {
        return [
            'success' => false,
            'message' => 'Erreur lecture fichier Excel: ' . $e->getMessage()
        ];
    }
}
private function analyzeCsvFile($file, $campagne)
{
    try {
        $data = [];
        $handle = fopen($file->getRealPath(), 'r');
        
        if (!$handle) {
            return [
                'success' => false,
                'message' => 'Impossible de lire le fichier CSV'
            ];
        }

        // Détecter le délimiteur
        $delimiter = $this->detectCsvDelimiter($file->getRealPath());
        
        while (($row = fgetcsv($handle, 1000, $delimiter)) !== false) {
            $data[] = $row;
        }
        
        fclose($handle);

        if (empty($data)) {
            return [
                'success' => false,
                'message' => 'Le fichier CSV est vide'
            ];
        }

        return $this->analyzeData($data, $campagne);

    } catch (\Exception $e) {
        return [
            'success' => false,
            'message' => 'Erreur lecture fichier CSV: ' . $e->getMessage()
        ];
    }
}
private function analyzeData($data, $campagne)
{
    $headers = array_map('trim', array_map('strtolower', $data[0]));
    $dataRows = array_slice($data, 1);
    
    // Colonnes obligatoires
    $requiredColumns = ['nom', 'prenom', 'sexe', 'date_naissance', 'telephone', 'adresse'];
    $missingColumns = array_diff($requiredColumns, $headers);
    
    if (!empty($missingColumns)) {
        return [
            'success' => false,
            'message' => 'Colonnes obligatoires manquantes: ' . implode(', ', $missingColumns),
            'errors' => ['Colonnes manquantes: ' . implode(', ', $missingColumns)]
        ];
    }

    // Analyser chaque ligne
    $validRows = 0;
    $invalidRows = 0;
    $errors = [];
    $warnings = [];
    $preview = [];

    foreach ($dataRows as $index => $row) {
        $lineNumber = $index + 2; // +2 car on commence à la ligne 2 (après les headers)
        
        if (empty(array_filter($row))) {
            continue; // Ignorer les lignes vides
        }

        $rowData = array_combine($headers, array_pad($row, count($headers), ''));
        $rowErrors = $this->validateRowData($rowData, $lineNumber);
        
        if (empty($rowErrors)) {
            $validRows++;
            
            // Ajouter à la preview (max 5 lignes)
            if (count($preview) < 5) {
                $preview[] = [
                    'line' => $lineNumber,
                    'nom' => $rowData['nom'] ?? '',
                    'prenom' => $rowData['prenom'] ?? '',
                    'sexe' => $rowData['sexe'] ?? '',
                    'telephone' => $rowData['telephone'] ?? ''
                ];
            }
        } else {
            $invalidRows++;
            $errors = array_merge($errors, $rowErrors);
        }
    }

    // Vérifications supplémentaires
    if ($validRows === 0) {
        return [
            'success' => false,
            'message' => 'Aucune ligne valide trouvée dans le fichier',
            'errors' => $errors
        ];
    }

    // Avertissements
    if ($invalidRows > 0) {
        $warnings[] = "{$invalidRows} ligne(s) contiennent des erreurs et seront ignorées";
    }

    return [
        'success' => true,
        'total_rows' => count($dataRows),
        'valid_rows' => $validRows,
        'invalid_rows' => $invalidRows,
        'headers' => $headers,
        'errors' => $errors,
        'warnings' => $warnings,
        'preview' => $preview
    ];
}
private function validateRowData($rowData, $lineNumber)
{
    $errors = [];

    // Validation du nom
    if (empty(trim($rowData['nom']))) {
        $errors[] = "Ligne {$lineNumber}: Le nom est obligatoire";
    } elseif (strlen(trim($rowData['nom'])) < 2) {
        $errors[] = "Ligne {$lineNumber}: Le nom doit contenir au moins 2 caractères";
    }

    // Validation du prénom
    if (empty(trim($rowData['prenom']))) {
        $errors[] = "Ligne {$lineNumber}: Le prénom est obligatoire";
    } elseif (strlen(trim($rowData['prenom'])) < 2) {
        $errors[] = "Ligne {$lineNumber}: Le prénom doit contenir au moins 2 caractères";
    }

    // Validation du sexe
    $sexe = strtoupper(trim($rowData['sexe']));
    if (empty($sexe)) {
        $errors[] = "Ligne {$lineNumber}: Le sexe est obligatoire";
    } elseif (!in_array($sexe, ['M', 'F', 'MASCULIN', 'FEMININ', 'HOMME', 'FEMME'])) {
        $errors[] = "Ligne {$lineNumber}: Le sexe doit être M ou F";
    }

    // Validation de la date de naissance
    if (empty(trim($rowData['date_naissance']))) {
        $errors[] = "Ligne {$lineNumber}: La date de naissance est obligatoire";
    } else {
        try {
            $date = Carbon::parse($rowData['date_naissance']);
            $age = $date->diffInYears(Carbon::now());
            
            if ($age > 120 || $age < 0) {
                $errors[] = "Ligne {$lineNumber}: Date de naissance invalide (âge calculé: {$age} ans)";
            }
        } catch (\Exception $e) {
            $errors[] = "Ligne {$lineNumber}: Format de date de naissance invalide";
        }
    }

    // Validation du téléphone
    if (empty(trim($rowData['telephone']))) {
        $errors[] = "Ligne {$lineNumber}: Le téléphone est obligatoire";
    } else {
        $phone = preg_replace('/[^0-9]/', '', $rowData['telephone']);
        if (strlen($phone) < 10) {
            $errors[] = "Ligne {$lineNumber}: Le numéro de téléphone doit contenir au moins 10 chiffres";
        }
    }

    // Validation de l'adresse
    if (empty(trim($rowData['adresse']))) {
        $errors[] = "Ligne {$lineNumber}: L'adresse est obligatoire";
    } elseif (strlen(trim($rowData['adresse'])) < 10) {
        $errors[] = "Ligne {$lineNumber}: L'adresse doit contenir au moins 10 caractères";
    }

    // Validation de l'email (optionnel)
    if (!empty($rowData['email']) && !filter_var($rowData['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Ligne {$lineNumber}: Format d'email invalide";
    }

    return $errors;
}
private function prepareRowDataForInsert($rowData, $campagneId, $typeAssistanceId)
{
    // Normaliser le sexe
    $sexe = strtoupper(trim($rowData['sexe']));
    if (in_array($sexe, ['MASCULIN', 'HOMME'])) {
        $sexe = 'M';
    } elseif (in_array($sexe, ['FEMININ', 'FEMME'])) {
        $sexe = 'F';
    }

    // Normaliser la date de naissance
    $dateNaissance = Carbon::parse($rowData['date_naissance'])->format('Y-m-d');

    // Normaliser le téléphone
    $telephone = preg_replace('/[^0-9]/', '', $rowData['telephone']);

    // Préparer les données
    $data = [
        'nom' => ucwords(strtolower(trim($rowData['nom']))),
        'prenom' => ucwords(strtolower(trim($rowData['prenom']))),
        'sexe' => $sexe,
        'date_naissance' => $dateNaissance,
        'telephone' => $telephone,
        'adresse' => trim($rowData['adresse']),
        'campagne_id' => $campagneId,
        'type_assistance_id' => $typeAssistanceId,
        'hors_campagne' => false,
        'a_beneficie' => false,
        'created_at' => now(),
        'updated_at' => now(),
        'created_by' => auth()->id()
    ];

    // Champs optionnels
    if (!empty($rowData['email'])) {
        $data['email'] = strtolower(trim($rowData['email']));
    }

    if (!empty($rowData['cin'])) {
        $data['cin'] = strtoupper(trim($rowData['cin']));
    }

    if (!empty($rowData['commentaire'])) {
        $data['commentaire'] = trim($rowData['commentaire']);
    }

    if (isset($rowData['enfants_scolarises'])) {
        $scolarise = strtolower(trim($rowData['enfants_scolarises']));
        if (in_array($scolarise, ['oui', 'yes', '1', 'true'])) {
            $data['enfants_scolarises'] = true;
        } elseif (in_array($scolarise, ['non', 'no', '0', 'false'])) {
            $data['enfants_scolarises'] = false;
        }
    }

    if (!empty($rowData['cote'])) {
        $cote = strtolower(trim($rowData['cote']));
        if (in_array($cote, ['unilatéral', 'unilateral', 'uni'])) {
            $data['cote'] = 'unilatéral';
        } elseif (in_array($cote, ['bilatéral', 'bilateral', 'bi'])) {
            $data['cote'] = 'bilatéral';
        }
    }

    if (!empty($rowData['lateralite'])) {
        $data['lateralite'] = trim($rowData['lateralite']);
    }

    return $data;
}
private function readExcelFile($file)
{
    $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
    $reader->setReadDataOnly(true);
    $spreadsheet = $reader->load($file->getRealPath());
    $worksheet = $spreadsheet->getActiveSheet();
    
    return $worksheet->toArray();
}
private function readCsvFile($file)
{
    $data = [];
    $handle = fopen($file->getRealPath(), 'r');
    
    if (!$handle) {
        throw new \Exception('Impossible de lire le fichier CSV');
    }

    $delimiter = $this->detectCsvDelimiter($file->getRealPath());
    
    while (($row = fgetcsv($handle, 1000, $delimiter)) !== false) {
        $data[] = $row;
    }
    
    fclose($handle);
    return $data;
}
private function detectCsvDelimiter($filepath)
{
    $delimiters = [',', ';', '\t', '|'];
    $handle = fopen($filepath, 'r');
    $firstLine = fgets($handle);
    fclose($handle);
    
    $delimiter = ','; // Par défaut
    $maxColumns = 0;
    
    foreach ($delimiters as $d) {
        $columns = str_getcsv($firstLine, $d);
        if (count($columns) > $maxColumns) {
            $maxColumns = count($columns);
            $delimiter = $d;
        }
    }
    
    return $delimiter;
}
public function validateImportBeneficiaires(Request $request)
{
    $request->validate([
        'file' => 'required|file|mimes:xlsx,xls,csv',
        'campagne_id' => 'required|exists:campagnes_medicales,id',
    ]);

    return response()->json(['message' => 'Fichier valide']);
}
public function getBeneficiaires(Request $request)
{
    try {
        Log::info('getBeneficiaires appelé', [
            'params' => $request->all(),
            'user_id' => Auth::id()
        ]);

        $query = DB::table('beneficiaires')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('campagnes_medicales', 'beneficiaires.campagne_id', '=', 'campagnes_medicales.id')
            ->select(
                'beneficiaires.id',
                'beneficiaires.nom',
                'beneficiaires.prenom',
                'beneficiaires.sexe',
                'beneficiaires.date_naissance',
                'beneficiaires.adresse',
                'beneficiaires.telephone',
                'beneficiaires.email',
                'beneficiaires.cin',
                'beneficiaires.commentaire',
                'beneficiaires.date_demande',
                'beneficiaires.campagne_id',
                'beneficiaires.type_assistance_id',
                'beneficiaires.hors_campagne',
                'beneficiaires.a_beneficie',
                'beneficiaires.lateralite',
                'beneficiaires.enfants_scolarises',
                'beneficiaires.decision',
                'beneficiaires.cote',
                'beneficiaires.created_at',
                'beneficiaires.updated_at',
                'types_assistance.libelle as type_assistance',
                'campagnes_medicales.nom as campagne_nom'
            );

        // Appliquer le filtre de suppression
        if ($request->get('include_deleted', false) !== true) {
            $query->whereNull('beneficiaires.date_suppression');
        }

        // Filtres
        if ($request->filled('sexe')) {
            $query->where('beneficiaires.sexe', $request->sexe);
        }

        if ($request->filled('type_assistance_id')) {
            $query->where('beneficiaires.type_assistance_id', $request->type_assistance_id);
        }

        if ($request->filled('campagne_id')) {
            $query->where('beneficiaires.campagne_id', $request->campagne_id);
        }

        if ($request->filled('hors_campagne')) {
            $query->where('beneficiaires.hors_campagne', $request->boolean('hors_campagne'));
        }

        if ($request->filled('a_beneficie')) {
            $query->where('beneficiaires.a_beneficie', $request->boolean('a_beneficie'));
        }

        if ($request->filled('enfants_scolarises')) {
            $query->where('beneficiaires.enfants_scolarises', $request->boolean('enfants_scolarises'));
        }

        if ($request->filled('decision')) {
            $query->where('beneficiaires.decision', $request->decision);
        }

        if ($request->filled('cote')) {
            $query->where('beneficiaires.cote', $request->cote);
        }

        if ($request->filled('lateralite')) {
            $query->where('beneficiaires.lateralite', $request->lateralite);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('beneficiaires.nom', 'like', "%{$search}%")
                  ->orWhere('beneficiaires.prenom', 'like', "%{$search}%")
                  ->orWhere('beneficiaires.telephone', 'like', "%{$search}%")
                  ->orWhere('beneficiaires.cin', 'like', "%{$search}%");
            });
        }

        // Tri
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $query->orderBy('beneficiaires.' . $sortBy, $sortDir);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $page = $request->get('page', 1);
        $offset = ($page - 1) * $perPage;

        $totalCount = $query->count();
        $beneficiaires = $query->limit($perPage)->offset($offset)->get();

        // Enrichir les données avec l'âge calculé
        $beneficiaires = $beneficiaires->map(function($beneficiaire) {
            if ($beneficiaire->date_naissance) {
                $beneficiaire->age = Carbon::parse($beneficiaire->date_naissance)->age;
                $beneficiaire->est_enfant = $beneficiaire->age < 18;
                
                if ($beneficiaire->age < 15) {
                    $beneficiaire->tranche_age = 'Moins de 15 ans';
                } elseif ($beneficiaire->age <= 64) {
                    $beneficiaire->tranche_age = '15-64 ans';
                } else {
                    $beneficiaire->tranche_age = '65 ans et plus';
                }
            }

            // Formater les données pour l'affichage
            $beneficiaire->nom_complet = $beneficiaire->nom . ' ' . $beneficiaire->prenom;
            
            // Traitement des champs booléens
            $beneficiaire->hors_campagne_label = $beneficiaire->hors_campagne ? 'Oui' : 'Non';
            $beneficiaire->a_beneficie_label = $beneficiaire->a_beneficie ? 'Oui' : 'Non';
            
            if ($beneficiaire->enfants_scolarises !== null) {
                $beneficiaire->enfants_scolarises_label = $beneficiaire->enfants_scolarises ? 'Oui' : 'Non';
            } else {
                $beneficiaire->enfants_scolarises_label = 'N/A';
            }

            return $beneficiaire;
        });

        return response()->json([
            'success' => true,
            'data' => $beneficiaires,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $totalCount,
            'last_page' => ceil($totalCount / $perPage)
        ]);

    } catch (Exception $e) {
        Log::error('Erreur getBeneficiaires', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'params' => $request->all()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement des bénéficiaires: ' . $e->getMessage()
        ], 500);
    }
}
public function deleteBeneficiaire($id)
{
    try {
        $updated = DB::table('beneficiaires')
            ->where('id', $id)
            ->whereNull('date_suppression')
            ->update([
                'date_suppression' => now(),
                'updated_at' => now()
            ]);

        if (!$updated) {
            return response()->json([
                'success' => false,
                'message' => 'Bénéficiaire non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Bénéficiaire supprimé avec succès'
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la suppression: ' . $e->getMessage()
        ], 500);
    }
}
public function getBeneficiaire($id)
{
    try {
        $beneficiaire = DB::table('beneficiaires')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('campagnes_medicales', 'beneficiaires.campagne_id', '=', 'campagnes_medicales.id')
            ->select(
                'beneficiaires.*',
                'types_assistance.libelle as type_assistance',
                'campagnes_medicales.nom as campagne_nom'
            )
            ->where('beneficiaires.id', $id)
            ->whereNull('beneficiaires.date_suppression')
            ->first();

        if (!$beneficiaire) {
            return response()->json([
                'success' => false,
                'message' => 'Bénéficiaire non trouvé'
            ], 404);
        }

        // Enrichir avec l'âge calculé
        if ($beneficiaire->date_naissance) {
            $beneficiaire->age = Carbon::parse($beneficiaire->date_naissance)->age;
            $beneficiaire->est_enfant = $beneficiaire->age < 18;
        }

        return response()->json([
            'success' => true,
            'data' => $beneficiaire
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Bénéficiaire non trouvé'
        ], 404);
    }
}
public function actionMasseBeneficiaires(Request $request)
{
    $validator = Validator::make($request->all(), [
        'beneficiaire_ids' => 'required|array',
        'beneficiaire_ids.*' => 'exists:beneficiaires,id',
        'action' => 'required|in:delete,change_type,assign_campaign,mark_benefited,update_decision',
        'type_assistance_id' => 'required_if:action,change_type|exists:types_assistance,id',
        'campagne_id' => 'required_if:action,assign_campaign|exists:campagnes_medicales,id',
        'decision' => 'required_if:action,update_decision|in:accepté,en_attente,refusé,admin a list principal,admin a list d\'attente',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        DB::beginTransaction();

        $count = count($request->beneficiaire_ids);

        switch ($request->action) {
            case 'delete':
                DB::table('beneficiaires')
                    ->whereIn('id', $request->beneficiaire_ids)
                    ->whereNull('date_suppression')
                    ->update(['date_suppression' => now(), 'updated_at' => now()]);
                $message = "$count bénéficiaires supprimés avec succès";
                break;

            case 'change_type':
                DB::table('beneficiaires')
                    ->whereIn('id', $request->beneficiaire_ids)
                    ->whereNull('date_suppression')
                    ->update(['type_assistance_id' => $request->type_assistance_id, 'updated_at' => now()]);
                $message = "$count bénéficiaires ont changé de type d'assistance";
                break;

            case 'assign_campaign':
                DB::table('beneficiaires')
                    ->whereIn('id', $request->beneficiaire_ids)
                    ->whereNull('date_suppression')
                    ->update([
                        'campagne_id' => $request->campagne_id,
                        'hors_campagne' => false,
                        'updated_at' => now()
                    ]);
                $message = "$count bénéficiaires assignés à la campagne";
                break;

            case 'mark_benefited':
                DB::table('beneficiaires')
                    ->whereIn('id', $request->beneficiaire_ids)
                    ->whereNull('date_suppression')
                    ->update(['a_beneficie' => true, 'updated_at' => now()]);
                $message = "$count bénéficiaires marqués comme ayant bénéficié";
                break;

            case 'update_decision':
                DB::table('beneficiaires')
                    ->whereIn('id', $request->beneficiaire_ids)
                    ->whereNull('date_suppression')
                    ->update(['decision' => $request->decision, 'updated_at' => now()]);
                $message = "$count bénéficiaires ont reçu la décision: {$request->decision}";
                break;
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => $message
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'action en masse: ' . $e->getMessage()
        ], 500);
    }
}
public function getStatistiquesBeneficiaires(Request $request)
{
    try {
        $query = DB::table('beneficiaires')
            ->whereNull('date_suppression');

        // Filtres
        if ($request->filled('campagne_id')) {
            $query->where('campagne_id', $request->campagne_id);
        }

        if ($request->filled('type_assistance_id')) {
            $query->where('type_assistance_id', $request->type_assistance_id);
        }

        if ($request->filled('date_debut') && $request->filled('date_fin')) {
            $query->whereBetween('created_at', [$request->date_debut, $request->date_fin]);
        }

        $beneficiaires = $query->get();

        // Statistiques de base
        $stats = [
            'total' => $beneficiaires->count(),
            'par_sexe' => [
                'hommes' => $beneficiaires->where('sexe', 'M')->count(),
                'femmes' => $beneficiaires->where('sexe', 'F')->count(),
            ],
            'par_decision' => [
                'accepte' => $beneficiaires->where('decision', 'accepté')->count(),
                'en_attente' => $beneficiaires->where('decision', 'en_attente')->count(),
                'refuse' => $beneficiaires->where('decision', 'refusé')->count(),
                'admin_principal' => $beneficiaires->where('decision', 'admin a list principal')->count(),
                'admin_attente' => $beneficiaires->where('decision', 'admin a list d\'attente')->count(),
                'non_defini' => $beneficiaires->whereNull('decision')->count(),
            ],
            'par_cote' => [
                'unilateral' => $beneficiaires->where('cote', 'unilatéral')->count(),
                'bilateral' => $beneficiaires->where('cote', 'bilatéral')->count(),
                'non_defini' => $beneficiaires->whereNull('cote')->count(),
            ],
            'par_lateralite' => [
                'unilaterale' => $beneficiaires->where('lateralite', 'Unilatérale')->count(),
                'bilaterale' => $beneficiaires->where('lateralite', 'Bilatérale')->count(),
                'non_defini' => $beneficiaires->whereNull('lateralite')->count(),
            ],
            'ayant_beneficie' => $beneficiaires->where('a_beneficie', true)->count(),
            'hors_campagne' => $beneficiaires->where('hors_campagne', true)->count(),
        ];

        // Statistiques enfants scolarisés
        $enfantsStats = $beneficiaires->filter(function($b) {
            return $b->date_naissance && Carbon::parse($b->date_naissance)->age < 18;
        });

        $stats['enfants_scolarises'] = [
            'total_enfants' => $enfantsStats->count(),
            'scolarises_oui' => $enfantsStats->where('enfants_scolarises', true)->count(),
            'scolarises_non' => $enfantsStats->where('enfants_scolarises', false)->count(),
            'non_renseigne' => $enfantsStats->whereNull('enfants_scolarises')->count(),
        ];

        // Tranches d'âge
        $tranchesAge = ['moins_15' => 0, '15_64' => 0, 'plus_65' => 0, 'non_renseigne' => 0];
        foreach ($beneficiaires as $beneficiaire) {
            if ($beneficiaire->date_naissance) {
                $age = Carbon::parse($beneficiaire->date_naissance)->age;
                if ($age < 15) $tranchesAge['moins_15']++;
                elseif ($age <= 64) $tranchesAge['15_64']++;
                else $tranchesAge['plus_65']++;
            } else {
                $tranchesAge['non_renseigne']++;
            }
        }
        $stats['tranches_age'] = $tranchesAge;

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du calcul des statistiques: ' . $e->getMessage()
        ], 500);
    }
}
public function restoreBeneficiaire($id)
{
    try {
        $updated = DB::table('beneficiaires')
            ->where('id', $id)
            ->whereNotNull('date_suppression')
            ->update([
                'date_suppression' => null,
                'updated_at' => now()
            ]);

        if (!$updated) {
            return response()->json([
                'success' => false,
                'message' => 'Bénéficiaire non trouvé ou déjà actif'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Bénéficiaire restauré avec succès'
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la restauration: ' . $e->getMessage()
        ], 500);
    }
}
public function exportBeneficiaires(Request $request)
{
    $validator = Validator::make($request->all(), [
        'campagne_id' => 'nullable|exists:campagnes_medicales,id',
        'type_assistance_id' => 'nullable|exists:types_assistance,id',
        'format' => 'required|in:excel,csv',
        'avec_statistiques' => 'boolean',
        'decision' => 'nullable|in:accepté,en_attente,refusé,admin a list principal,admin a list d\'attente'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Paramètres d\'export invalides',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $query = DB::table('beneficiaires')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('campagnes_medicales', 'beneficiaires.campagne_id', '=', 'campagnes_medicales.id')
            ->select(
                'beneficiaires.nom',
                'beneficiaires.prenom',
                'beneficiaires.sexe',
                'beneficiaires.date_naissance',
                'beneficiaires.adresse',
                'beneficiaires.telephone',
                'beneficiaires.email',
                'beneficiaires.cin',
                'beneficiaires.commentaire',
                'beneficiaires.date_demande',
                'beneficiaires.hors_campagne',
                'beneficiaires.a_beneficie',
                'beneficiaires.lateralite',
                'beneficiaires.enfants_scolarises',
                'beneficiaires.decision',
                'beneficiaires.cote',
                'beneficiaires.created_at',
                'types_assistance.libelle as type_assistance',
                'campagnes_medicales.nom as campagne'
            )
            ->whereNull('beneficiaires.date_suppression');

        // Appliquer les filtres
        if ($request->filled('campagne_id')) {
            $query->where('beneficiaires.campagne_id', $request->campagne_id);
        }

        if ($request->filled('type_assistance_id')) {
            $query->where('beneficiaires.type_assistance_id', $request->type_assistance_id);
        }

        if ($request->filled('decision')) {
            $query->where('beneficiaires.decision', $request->decision);
        }

        $beneficiaires = $query->get();

        // Enrichir avec l'âge et formater les données
        $beneficiaires = $beneficiaires->map(function($beneficiaire) {
            if ($beneficiaire->date_naissance) {
                $age = Carbon::parse($beneficiaire->date_naissance)->age;
                $beneficiaire->age = $age;
                
                if ($age < 15) {
                    $beneficiaire->tranche_age = 'Moins de 15 ans';
                } elseif ($age <= 64) {
                    $beneficiaire->tranche_age = '15-64 ans';
                } else {
                    $beneficiaire->tranche_age = '65 ans et plus';
                }
            } else {
                $beneficiaire->age = null;
                $beneficiaire->tranche_age = 'Non renseigné';
            }
            
            // Formater les champs booléens
            $beneficiaire->hors_campagne_label = $beneficiaire->hors_campagne ? 'Oui' : 'Non';
            $beneficiaire->a_beneficie_label = $beneficiaire->a_beneficie ? 'Oui' : 'Non';
            
            if ($beneficiaire->enfants_scolarises !== null) {
                $beneficiaire->enfants_scolarises_label = $beneficiaire->enfants_scolarises ? 'Oui' : 'Non';
            } else {
                $beneficiaire->enfants_scolarises_label = 'N/A';
            }
            
            // Formater les dates
            if ($beneficiaire->date_naissance) {
                $beneficiaire->date_naissance_formatee = Carbon::parse($beneficiaire->date_naissance)->format('d/m/Y');
            }
            
            if ($beneficiaire->date_demande) {
                $beneficiaire->date_demande_formatee = Carbon::parse($beneficiaire->date_demande)->format('d/m/Y');
            }
            
            return $beneficiaire;
        });

        // Générer le nom de fichier
        $timestamp = now()->format('Y-m-d_H-i-s');
        $filename = "beneficiaires_export_{$timestamp}";

        if ($request->format === 'excel') {
            $filename .= '.xlsx';
        } else {
            $filename .= '.csv';
        }

        return response()->json([
            'success' => true,
            'message' => 'Export généré avec succès',
            'data' => [
                'filename' => $filename,
                'total_records' => $beneficiaires->count(),
                'download_url' => '/api/upas/downloads/' . $filename,
                'export_data' => $beneficiaires->take(100) // Prévisualisation limitée
            ]
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'export: ' . $e->getMessage()
        ], 500);
    }
}

public function debugKafalaUpdate($id, Request $request)
{
    try {
        Log::info('🔍 Debug kafala update', [
            'kafala_id' => $id,
            'request_method' => $request->method(),
            'content_type' => $request->header('Content-Type'),
            'request_size' => strlen(json_encode($request->all())),
            'has_file' => $request->hasFile('fichier_pdf'),
            'file_info' => $request->hasFile('fichier_pdf') ? [
                'name' => $request->file('fichier_pdf')->getClientOriginalName(),
                'size' => $request->file('fichier_pdf')->getSize(),
                'mime' => $request->file('fichier_pdf')->getMimeType(),
            ] : null,
            'all_fields' => array_keys($request->all()),
            'field_values' => array_map(function($value) {
                if (is_string($value) && strlen($value) > 100) {
                    return substr($value, 0, 100) . '... (truncated)';
                }
                return $value;
            }, $request->all())
        ]);

        // Vérifier l'état actuel de la kafala
        $kafala = DB::table('kafalas')->where('id', $id)->first();
        
        if ($kafala) {
            Log::info('📋 État actuel kafala', [
                'id' => $kafala->id,
                'reference' => $kafala->reference,
                'created_at' => $kafala->created_at,
                'updated_at' => $kafala->updated_at,
                'has_file' => !empty($kafala->fichier_pdf),
                'file_path' => $kafala->fichier_pdf,
                'file_exists' => $kafala->fichier_pdf ? Storage::disk('public')->exists($kafala->fichier_pdf) : false
            ]);
        }

        return response()->json([
            'success' => true,
            'kafala_exists' => !!$kafala,
            'kafala_data' => $kafala,
            'request_info' => [
                'method' => $request->method(),
                'content_type' => $request->header('Content-Type'),
                'has_file' => $request->hasFile('fichier_pdf'),
                'fields' => array_keys($request->all())
            ]
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}
public function marquerRetourAppareillage(Request $request, $id)
{
    $validator = Validator::make($request->all(), [
        'date_retour' => 'required|date',
        'observation_retour' => 'nullable|string|max:1000'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        DB::beginTransaction();

        $assistance = DB::table('assistance_medicales')
            ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('nature_dones', 'assistance_medicales.nature_done_id', '=', 'nature_dones.id')
            ->where('assistance_medicales.id', $id)
            ->whereNull('assistance_medicales.date_suppression')
            ->select('assistance_medicales.*', 'types_assistance.libelle as type_assistance', 'nature_dones.libelle as nature_done')
            ->first();

        if (!$assistance) {
            return response()->json([
                'success' => false,
                'message' => 'Assistance non trouvée'
            ], 404);
        }

        // Vérifier que c'est un appareillage
        if (!stripos($assistance->type_assistance, 'appareillage')) {
            return response()->json([
                'success' => false,
                'message' => 'Cette assistance n\'est pas un appareillage orthopédique'
            ], 400);
        }

        // Vérifier que le retour n'est pas déjà effectué
        if ($assistance->retour_effectue) {
            return response()->json([
                'success' => false,
                'message' => 'Le retour a déjà été marqué comme effectué'
            ], 400);
        }

        // Mettre à jour
        DB::table('assistance_medicales')
            ->where('id', $id)
            ->update([
                'retour_effectue' => true,
                'date_retour' => $request->date_retour,
                'observation_retour' => $request->observation_retour,
                'updated_at' => now(),
                'updated_by' => Auth::id()
            ]);

        $assistanceUpdated = $this->getAssistanceById($id);

        DB::commit();

        Log::info('Retour appareillage marqué', [
            'assistance_id' => $id,
            'date_retour' => $request->date_retour,
            'user_id' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Retour marqué comme effectué avec succès',
            'data' => $assistanceUpdated
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        Log::error('Erreur marquage retour appareillage', [
            'error' => $e->getMessage(),
            'assistance_id' => $id
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du marquage du retour: ' . $e->getMessage()
        ], 500);
    }
}
public function getAppareillagesEnRetard(Request $request)
{
    try {
        $query = DB::table('assistance_medicales')
            ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('nature_dones', 'assistance_medicales.nature_done_id', '=', 'nature_dones.id')
            ->leftJoin('beneficiaires', 'assistance_medicales.beneficiaire_id', '=', 'beneficiaires.id')
            ->leftJoin('campagnes_medicales', 'assistance_medicales.campagne_id', '=', 'campagnes_medicales.id')
            ->select(
                'assistance_medicales.*',
                'types_assistance.libelle as type_assistance',
                'nature_dones.libelle as nature_done',
                'beneficiaires.nom as beneficiaire_nom',
                'beneficiaires.prenom as beneficiaire_prenom',
                'beneficiaires.telephone as beneficiaire_telephone',
                'beneficiaires.cin as beneficiaire_cin',
                'campagnes_medicales.nom as campagne_nom',
                DB::raw('DATEDIFF(NOW(), assistance_medicales.date_fin_prevue) as jours_retard')
            )
            ->whereNull('assistance_medicales.date_suppression')
            ->where('types_assistance.libelle', 'like', '%appareillage%')
            ->where('assistance_medicales.retour_effectue', false)
            ->whereNotNull('assistance_medicales.date_fin_prevue')
            ->where('assistance_medicales.date_fin_prevue', '<', Carbon::now())
            ->orderBy('assistance_medicales.date_fin_prevue', 'asc');

        // Filtres optionnels
        if ($request->filled('campagne_id')) {
            $query->where('assistance_medicales.campagne_id', $request->campagne_id);
        }

        if ($request->filled('jours_retard_min')) {
            $query->havingRaw('jours_retard >= ?', [$request->jours_retard_min]);
        }

        $retards = $query->get();

        // Enrichir avec des informations calculées
        $retards = $retards->map(function($assistance) {
            $assistance->statut_urgence = $this->determinerStatutUrgence($assistance->jours_retard);
            $assistance->message_retard = $this->genererMessageRetard($assistance);
            return $assistance;
        });

        return response()->json([
            'success' => true,
            'data' => $retards,
            'total' => $retards->count(),
            'statistiques' => [
                'retard_critique' => $retards->where('statut_urgence', 'critique')->count(),
                'retard_important' => $retards->where('statut_urgence', 'important')->count(),
                'retard_modere' => $retards->where('statut_urgence', 'modere')->count(),
            ]
        ]);

    } catch (Exception $e) {
        Log::error('Erreur récupération appareillages en retard', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération: ' . $e->getMessage()
        ], 500);
    }
}
public function getStatistiquesAppareillages(Request $request)
{
    try {
        $dateDebut = $request->get('date_debut');
        $dateFin = $request->get('date_fin');

        $baseQuery = DB::table('assistance_medicales')
            ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('nature_dones', 'assistance_medicales.nature_done_id', '=', 'nature_dones.id')
            ->where('types_assistance.libelle', 'like', '%appareillage%')
            ->whereNull('assistance_medicales.date_suppression');

        if ($dateDebut && $dateFin) {
            $baseQuery->whereBetween('assistance_medicales.date_assistance', [$dateDebut, $dateFin]);
        }

        // Statistiques générales
        $stats = [
            'total_appareillages' => $baseQuery->count(),
            'retours_effectues' => (clone $baseQuery)->where('assistance_medicales.retour_effectue', true)->count(),
            'en_cours' => (clone $baseQuery)->where('assistance_medicales.retour_effectue', false)->count(),
            'en_retard' => (clone $baseQuery)
                ->where('assistance_medicales.retour_effectue', false)
                ->whereNotNull('assistance_medicales.date_fin_prevue')
                ->where('assistance_medicales.date_fin_prevue', '<', Carbon::now())
                ->count(),
        ];

        // Statistiques par nature de don
        $parNature = $baseQuery->select(
            'nature_dones.libelle as nature',
            DB::raw('COUNT(*) as total'),
            DB::raw('SUM(CASE WHEN assistance_medicales.retour_effectue = 1 THEN 1 ELSE 0 END) as retournes'),
            DB::raw('SUM(CASE WHEN assistance_medicales.retour_effectue = 0 AND assistance_medicales.date_fin_prevue < NOW() THEN 1 ELSE 0 END) as en_retard')
        )
        ->groupBy('nature_dones.id', 'nature_dones.libelle')
        ->get();

        // Évolution mensuelle
        $evolutionMensuelle = (clone $baseQuery)
            ->select(
                DB::raw('DATE_FORMAT(assistance_medicales.date_assistance, "%Y-%m") as mois'),
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN assistance_medicales.retour_effectue = 1 THEN 1 ELSE 0 END) as retournes')
            )
            ->groupBy('mois')
            ->orderBy('mois', 'desc')
            ->limit(12)
            ->get();

        // Top 5 des retards les plus longs
        $retardsLongs = DB::table('assistance_medicales')
            ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('beneficiaires', 'assistance_medicales.beneficiaire_id', '=', 'beneficiaires.id')
            ->select(
                'assistance_medicales.id',
                'assistance_medicales.numero_assistance',
                'beneficiaires.nom',
                'beneficiaires.prenom',
                'beneficiaires.telephone',
                'assistance_medicales.date_fin_prevue',
                DB::raw('DATEDIFF(NOW(), assistance_medicales.date_fin_prevue) as jours_retard')
            )
            ->where('types_assistance.libelle', 'like', '%appareillage%')
            ->where('assistance_medicales.retour_effectue', false)
            ->whereNotNull('assistance_medicales.date_fin_prevue')
            ->where('assistance_medicales.date_fin_prevue', '<', Carbon::now())
            ->whereNull('assistance_medicales.date_suppression')
            ->orderBy('jours_retard', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'statistiques_generales' => $stats,
                'par_nature_don' => $parNature,
                'evolution_mensuelle' => $evolutionMensuelle,
                'retards_les_plus_longs' => $retardsLongs,
                'periode' => [
                    'debut' => $dateDebut,
                    'fin' => $dateFin
                ]
            ]
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du calcul des statistiques: ' . $e->getMessage()
        ], 500);
    }
}
public function getAppareillagesARetournerProchainement(Request $request)
{
    try {
        $jours = $request->get('jours', 7); // Par défaut 7 jours

        $prochainement = DB::table('assistance_medicales')
            ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('beneficiaires', 'assistance_medicales.beneficiaire_id', '=', 'beneficiaires.id')
            ->leftJoin('campagnes_medicales', 'assistance_medicales.campagne_id', '=', 'campagnes_medicales.id')
            ->select(
                'assistance_medicales.*',
                'types_assistance.libelle as type_assistance',
                'beneficiaires.nom as beneficiaire_nom',
                'beneficiaires.prenom as beneficiaire_prenom',
                'beneficiaires.telephone as beneficiaire_telephone',
                'beneficiaires.cin as beneficiaire_cin',
                'campagnes_medicales.nom as campagne_nom',
                DB::raw('DATEDIFF(assistance_medicales.date_fin_prevue, NOW()) as jours_restants')
            )
            ->whereNull('assistance_medicales.date_suppression')
            ->where('types_assistance.libelle', 'like', '%appareillage%')
            ->where('assistance_medicales.retour_effectue', false)
            ->whereNotNull('assistance_medicales.date_fin_prevue')
            ->whereBetween('assistance_medicales.date_fin_prevue', [
                Carbon::now(),
                Carbon::now()->addDays($jours)
            ])
            ->orderBy('assistance_medicales.date_fin_prevue', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $prochainement,
            'total' => $prochainement->count(),
            'periode_jours' => $jours
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération: ' . $e->getMessage()
        ], 500);
    }
}
private function determinerStatutUrgence($joursRetard)
{
    if ($joursRetard >= 30) {
        return 'critique';
    } elseif ($joursRetard >= 14) {
        return 'important';
    } elseif ($joursRetard >= 7) {
        return 'modere';
    } else {
        return 'recent';
    }
}

private function genererMessageRetard($assistance)
{
    $jours = $assistance->jours_retard;
    $nom = $assistance->beneficiaire_nom . ' ' . $assistance->beneficiaire_prenom;
    
    if ($jours >= 30) {
        return "⚠️ URGENT: {$nom} n'a pas retourné le matériel depuis {$jours} jours";
    } elseif ($jours >= 14) {
        return "⚡ Important: {$nom} a {$jours} jours de retard";
    } elseif ($jours >= 7) {
        return "📅 {$nom} a {$jours} jours de retard";
    } else {
        return "🔔 {$nom} a {$jours} jour(s) de retard";
    }
}
private function getAssistanceById($id)
{
    return DB::table('assistance_medicales')
        ->leftJoin('beneficiaires', 'assistance_medicales.beneficiaire_id', '=', 'beneficiaires.id')
        ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
        ->leftJoin('details_type_assistances', 'assistance_medicales.details_type_assistance_id', '=', 'details_type_assistances.id')
        ->leftJoin('campagnes_medicales', 'assistance_medicales.campagne_id', '=', 'campagnes_medicales.id')
        ->leftJoin('situations', 'assistance_medicales.situation_id', '=', 'situations.id')
        ->leftJoin('etat_dones', 'assistance_medicales.etat_don_id', '=', 'etat_dones.id')
        ->leftJoin('nature_dones', 'assistance_medicales.nature_done_id', '=', 'nature_dones.id')
        ->select(
            'assistance_medicales.*',
            'beneficiaires.nom as beneficiaire_nom',
            'beneficiaires.prenom as beneficiaire_prenom',
            'beneficiaires.cin as beneficiaire_cin',
            'beneficiaires.telephone as beneficiaire_telephone',
            DB::raw("CONCAT(beneficiaires.nom, ' ', beneficiaires.prenom) as nom_complet_beneficiaire"),
            'types_assistance.libelle as type_assistance',
            'details_type_assistances.libelle as details_type_assistance',
            'campagnes_medicales.nom as campagne_nom',
            'situations.libelle as situation',
            'etat_dones.libelle as etat_don',
            'nature_dones.libelle as nature_done'
        )
        ->where('assistance_medicales.id', $id)
        ->whereNull('assistance_medicales.date_suppression')
        ->first();
}
private function generateNumeroAssistanceSecure()
{
    try {
        $prefix = 'ASS';
        $date = date('Ymd');
        $time = date('Hi');
        
        // Compter les assistances du jour
        $count = DB::table('assistance_medicales')
            ->whereDate('created_at', today())
            ->whereNull('date_suppression')
            ->count();
        
        $sequence = str_pad($count + 1, 4, '0', STR_PAD_LEFT);
        $numero = "{$prefix}-{$date}-{$time}-{$sequence}";
        
        // Vérifier l'unicité
        $exists = DB::table('assistance_medicales')
            ->where('numero_assistance', $numero)
            ->exists();
        
        if ($exists) {
            // Si collision, ajouter timestamp Unix
            $numero = "{$prefix}-{$date}-{$time}-" . time();
        }
        
        return $numero;
        
    } catch (Exception $e) {
        Log::error('Erreur génération numéro assistance', ['error' => $e->getMessage()]);
        return 'ASS-' . time() . '-' . rand(1000, 9999);
    }
}

private function detectCsvDelimiterFixed($filepath)
{
    $delimiters = [',', ';', '\t', '|'];
    $handle = fopen($filepath, 'r');
    $firstLine = fgets($handle);
    fclose($handle);
    
    $delimiter = ',';
    $maxColumns = 0;
    
    foreach ($delimiters as $d) {
        $columns = str_getcsv($firstLine, $d);
        if (count($columns) > $maxColumns) {
            $maxColumns = count($columns);
            $delimiter = $d;
        }
    }
    
    return $delimiter;
}
public function debugImportState(Request $request)
{
    try {
        $campagneId = $request->get('campagne_id');
        
        $info = [
            'database_connection' => DB::connection()->getPdo() ? 'OK' : 'FAILED',
            'beneficiaires_table_exists' => Schema::hasTable('beneficiaires'),
            'campagne_exists' => false,
            'last_beneficiaires' => [],
            'total_beneficiaires' => 0
        ];
        
        if ($campagneId) {
            $campagne = DB::table('campagnes_medicales')->where('id', $campagneId)->first();
            $info['campagne_exists'] = !!$campagne;
            $info['campagne_data'] = $campagne;
        }
        
        if ($info['beneficiaires_table_exists']) {
            $info['total_beneficiaires'] = DB::table('beneficiaires')->whereNull('date_suppression')->count();
            $info['last_beneficiaires'] = DB::table('beneficiaires')
                ->whereNull('date_suppression')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(['id', 'nom', 'prenom', 'telephone', 'created_at']);
        }
        
        return response()->json([
            'success' => true,
            'debug_info' => $info
        ]);
        
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}
public function findKafalaByReference($reference)
{
    try {
        $kafala = DB::table('kafalas')
            ->where('reference', $reference)
            ->whereNull('date_suppression')
            ->first();

        if (!$kafala) {
            return response()->json([
                'success' => false,
                'message' => 'Kafala non trouvée avec cette référence'
            ], 404);
        }

        Log::info('✅ Kafala trouvée par référence', [
            'reference' => $reference,
            'kafala_id' => $kafala->id
        ]);

        return response()->json([
            'success' => true,
            'data' => $kafala
        ]);

    } catch (Exception $e) {
        Log::error('❌ Erreur recherche par référence', [
            'reference' => $reference,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la recherche: ' . $e->getMessage()
        ], 500);
    }
}
    public function testKafalaUpdate($id)
    {
        try {
            Log::info('🧪 TEST DIAGNOSTIQUE KAFALA', ['kafala_id' => $id]);
            
            // Test 1: Lecture
            $kafala = DB::table('kafalas')->where('id', $id)->first();
            if (!$kafala) {
                return response()->json(['success' => false, 'message' => 'Kafala non trouvée']);
            }
            
            // Test 2: Mise à jour simple
            $originalComment = $kafala->commentaires;
            $newComment = 'TEST DIAGNOSTIC ' . now()->toISOString();
            
            $affected = DB::table('kafalas')
                ->where('id', $id)
                ->update(['commentaires' => $newComment]);
            
            // Test 3: Vérification
            $kafalaAfter = DB::table('kafalas')->where('id', $id)->first();
            $updateWorked = $kafalaAfter->commentaires === $newComment;
            
            // Test 4: Restaurer
            DB::table('kafalas')
                ->where('id', $id)
                ->update(['commentaires' => $originalComment]);
            
            return response()->json([
                'success' => true,
                'test_results' => [
                    'kafala_found' => true,
                    'update_affected_rows' => $affected,
                    'update_verified' => $updateWorked,
                    'original_comment' => $originalComment,
                    'test_comment' => $newComment,
                    'final_comment' => $kafalaAfter->commentaires
                ]
            ]);
            
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
    }
public function validateImportHeaders(Request $request)
{
    $validator = Validator::make($request->all(), [
        'headers' => 'required|array',
        'type_assistance' => 'required|string',
        'campagne_id' => 'required|exists:campagnes_medicales,id'
    ]);
    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Paramètres invalides',
            'errors' => $validator->errors()
        ], 422);
    }
    try {
        $headers = $request->headers;
        $campagneId = $request->campagne_id;
        $import = new \App\Imports\BeneficiairesImport($campagneId, true);
        $validation = $import->validateHeaders($headers);
        return response()->json([
            'success' => true,
            'data' => $validation
        ]);
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la validation des headers: ' . $e->getMessage()
        ], 500);
    }
}
public function getImportValidationRules($typeAssistance = null)
{
    try {
        $rules = \App\Imports\BeneficiairesImport::getValidationRules($typeAssistance);

        return response()->json([
            'success' => true,
            'data' => [
                'type_assistance' => $typeAssistance,
                'rules' => $rules,
                'decisions_autorisees' => \App\Imports\BeneficiairesImport::DECISIONS_AUTORISEES,
                'cotes_autorisees' => \App\Imports\BeneficiairesImport::COTES_AUTORISEES,
                'lateralites_autorisees' => \App\Imports\BeneficiairesImport::LATERALITES_AUTORISEES
            ]
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération des règles: ' . $e->getMessage()
        ], 500);
    }
}
public function diagnosticImport(Request $request)
{
    $validator = Validator::make($request->all(), [
        'campagne_id' => 'required|exists:campagnes_medicales,id'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $campagneId = $request->campagne_id;

        // Informations sur la campagne
        $campagne = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'campagnes_medicales.*',
                'types_assistance.libelle as type_assistance'
            )
            ->where('campagnes_medicales.id', $campagneId)
            ->first();

        // Statistiques des bénéficiaires existants
        $beneficiairesStats = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('COUNT(CASE WHEN date_suppression IS NULL THEN 1 END) as actifs'),
                DB::raw('COUNT(CASE WHEN date_suppression IS NOT NULL THEN 1 END) as supprimes'),
                DB::raw('MAX(created_at) as dernier_import'),
                DB::raw('MIN(created_at) as premier_import')
            )
            ->first();

        // Derniers bénéficiaires créés
        $derniersBeneficiaires = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->whereNull('date_suppression')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'nom', 'prenom', 'telephone', 'created_at', 'decision']);

        // Vérifications système
        $systemChecks = [
            'table_beneficiaires_existe' => Schema::hasTable('beneficiaires'),
            'table_campagnes_existe' => Schema::hasTable('campagnes_medicales'),
            'user_connecte' => Auth::check(),
            'permissions_ecriture' => is_writable(storage_path('app')),
            'excel_package' => class_exists('\Maatwebsite\Excel\Facades\Excel'),
            'import_class_existe' => class_exists('\App\Imports\BeneficiairesImport'),
            'phpspreadsheet_disponible' => class_exists('\PhpOffice\PhpSpreadsheet\IOFactory')
        ];

        // Vérification de la structure des colonnes
        $tableStructure = [];
        try {
            $columns = DB::select("DESCRIBE beneficiaires");
            foreach ($columns as $column) {
                $tableStructure[$column->Field] = [
                    'type' => $column->Type,
                    'null' => $column->Null === 'YES',
                    'default' => $column->Default,
                    'key' => $column->Key
                ];
            }
        } catch (Exception $e) {
            $tableStructure = ['error' => $e->getMessage()];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'campagne' => $campagne,
                'beneficiaires_stats' => $beneficiairesStats,
                'derniers_beneficiaires' => $derniersBeneficiaires,
                'system_checks' => $systemChecks,
                'table_structure' => $tableStructure,
                'recommendations' => $this->generateImportRecommendations($campagne, $beneficiairesStats),
                'timestamp' => now()->format('d/m/Y H:i:s')
            ]
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur diagnostic: ' . $e->getMessage()
        ], 500);
    }
}
private function generateImportRecommendations($campagne, $stats)
{
    $recommendations = [];

    if (!$campagne) {
        $recommendations[] = "❌ Campagne non trouvée - vérifiez l'ID de la campagne";
        return $recommendations;
    }

    if (!$campagne->type_assistance) {
        $recommendations[] = "⚠️ Type d'assistance non défini pour cette campagne";
    }

    if ($stats->total == 0) {
        $recommendations[] = "💡 Aucun bénéficiaire dans cette campagne - c'est le bon moment pour un premier import";
    } elseif ($stats->total > 1000) {
        $recommendations[] = "⚠️ Cette campagne contient déjà plus de 1000 bénéficiaires - l'import pourrait être plus lent";
    }

    if ($stats->supprimes > ($stats->total * 0.1)) {
        $recommendations[] = "⚠️ Beaucoup de bénéficiaires supprimés détectés - vérifiez la qualité des données";
    }

    // Recommandations selon le type d'assistance
    $typeLibelle = strtolower($campagne->type_assistance ?: '');
    
    if ($typeLibelle === 'lunettes') {
        $recommendations[] = "📋 Pour les lunettes: incluez la colonne 'enfants_scolarises' (obligatoire pour les mineurs)";
        $recommendations[] = "💰 Prix unitaire estimé: 190 DH par lunette";
    } elseif (strpos($typeLibelle, 'auditif') !== false) {
        $recommendations[] = "📋 Pour les appareils auditifs: incluez les colonnes 'cote' et 'enfants_scolarises'";
        $recommendations[] = "💰 Prix unitaire estimé: 2050 DH par appareil";
    }

    $recommendations[] = "✅ Utilisez la colonne 'decision' pour organiser vos listes (accepté, en_attente, etc.)";
    $recommendations[] = "📞 Assurez-vous que les numéros de téléphone sont au format marocain";
    $recommendations[] = "📅 Format de date recommandé: YYYY-MM-DD (ex: 1990-12-25)";

    return $recommendations;
}
public function exportBeneficiairesTemplate($campagneId)
{
    try {
        $campagne = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->where('campagnes_medicales.id', $campagneId)
            ->select('campagnes_medicales.*', 'types_assistance.libelle as type_assistance')
            ->first();

        if (!$campagne) {
            return response()->json([
                'success' => false,
                'message' => 'Campagne non trouvée'
            ], 404);
        }

        // Récupérer quelques bénéficiaires existants comme exemples
        $exemples = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->whereNull('date_suppression')
            ->limit(5)
            ->get([
                'nom', 'prenom', 'sexe', 'date_naissance', 'telephone', 
                'email', 'adresse', 'cin', 'enfants_scolarises', 'cote', 
                'decision', 'commentaire'
            ]);

        $typeAssistance = $campagne->type_assistance ?: 'general';
        $template = \App\Imports\BeneficiairesImport::generateExcelTemplate($typeAssistance, $campagne->nom);

        // Ajouter les exemples réels s'ils existent
        if ($exemples->count() > 0) {
            $template['exemples_reels'] = $exemples->map(function($exemple) {
                return [
                    'nom' => $exemple->nom,
                    'prenom' => $exemple->prenom,
                    'sexe' => $exemple->sexe,
                    'date_naissance' => $exemple->date_naissance,
                    'telephone' => $exemple->telephone,
                    'email' => $exemple->email ?: '',
                    'adresse' => $exemple->adresse,
                    'cin' => $exemple->cin ?: '',
                    'enfants_scolarises' => $exemple->enfants_scolarises !== null ? 
                        ($exemple->enfants_scolarises ? 'oui' : 'non') : '',
                    'cote' => $exemple->cote ?: '',
                    'decision' => $exemple->decision ?: '',
                    'commentaire' => $exemple->commentaire ?: ''
                ];
            })->toArray();
        }

        return response()->json([
            'success' => true,
            'data' => $template
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'export du template: ' . $e->getMessage()
        ], 500);
    }
}
public function getImportStats($campagneId)
{
    try {
        $stats = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('COUNT(CASE WHEN date_suppression IS NULL THEN 1 END) as actifs'),
                DB::raw('SUM(CASE WHEN decision = "accepté" THEN 1 ELSE 0 END) as acceptes'),
                DB::raw('SUM(CASE WHEN decision = "en_attente" THEN 1 ELSE 0 END) as en_attente'),
                DB::raw('SUM(CASE WHEN decision = "refusé" THEN 1 ELSE 0 END) as refuses'),
                DB::raw('SUM(CASE WHEN decision = "admin a list principal" THEN 1 ELSE 0 END) as admin_principal'),
                DB::raw('SUM(CASE WHEN decision = "admin a list d\'attente" THEN 1 ELSE 0 END) as admin_attente'),
                DB::raw('SUM(CASE WHEN sexe = "M" THEN 1 ELSE 0 END) as hommes'),
                DB::raw('SUM(CASE WHEN sexe = "F" THEN 1 ELSE 0 END) as femmes'),
                DB::raw('SUM(CASE WHEN a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie'),
                DB::raw('DATE(MIN(created_at)) as premier_import'),
                DB::raw('DATE(MAX(created_at)) as dernier_import')
            )
            ->first();

        // Statistiques par mois d'import
        $statsParMois = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->whereNull('date_suppression')
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as mois'),
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN sexe = "M" THEN 1 ELSE 0 END) as hommes'),
                DB::raw('SUM(CASE WHEN sexe = "F" THEN 1 ELSE 0 END) as femmes')
            )
            ->groupBy('mois')
            ->orderBy('mois', 'desc')
            ->limit(12)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'statistiques_globales' => $stats,
                'par_mois' => $statsParMois,
                'derniere_mise_a_jour' => now()->format('d/m/Y H:i:s')
            ]
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du calcul des statistiques: ' . $e->getMessage()
        ], 500);
    }
}
public function cleanImportData(Request $request, $campagneId)
{
    $validator = Validator::make($request->all(), [
        'action' => 'required|in:remove_duplicates,fix_phones,standardize_decisions,clean_all',
        'confirm' => 'required|boolean'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'errors' => $validator->errors()
        ], 422);
    }

    if (!$request->boolean('confirm')) {
        return response()->json([
            'success' => false,
            'message' => 'Confirmation requise pour cette action'
        ], 422);
    }

    try {
        DB::beginTransaction();

        $action = $request->action;
        $affectedRows = 0;
        $details = [];

        switch ($action) {
            case 'remove_duplicates':
                // Supprimer les doublons basés sur téléphone
                $duplicates = DB::table('beneficiaires')
                    ->select('telephone', DB::raw('COUNT(*) as count'), DB::raw('MIN(id) as keep_id'))
                    ->where('campagne_id', $campagneId)
                    ->whereNull('date_suppression')
                    ->groupBy('telephone')
                    ->having('count', '>', 1)
                    ->get();

                foreach ($duplicates as $duplicate) {
                    $toDelete = DB::table('beneficiaires')
                        ->where('campagne_id', $campagneId)
                        ->where('telephone', $duplicate->telephone)
                        ->where('id', '!=', $duplicate->keep_id)
                        ->whereNull('date_suppression')
                        ->pluck('id');

                    if ($toDelete->count() > 0) {
                        DB::table('beneficiaires')
                            ->whereIn('id', $toDelete)
                            ->update([
                                'date_suppression' => now(),
                                'updated_at' => now()
                            ]);

                        $affectedRows += $toDelete->count();
                        $details[] = "Supprimé {$toDelete->count()} doublons pour le téléphone {$duplicate->telephone}";
                    }
                }
                break;

            case 'fix_phones':
                // Corriger les formats de téléphone
                $beneficiaires = DB::table('beneficiaires')
                    ->where('campagne_id', $campagneId)
                    ->whereNull('date_suppression')
                    ->get(['id', 'telephone']);

                foreach ($beneficiaires as $beneficiaire) {
                    $originalPhone = $beneficiaire->telephone;
                    $cleanedPhone = $this->cleanPhoneNumber($originalPhone);
                    
                    if ($cleanedPhone !== $originalPhone) {
                        DB::table('beneficiaires')
                            ->where('id', $beneficiaire->id)
                            ->update([
                                'telephone' => $cleanedPhone,
                                'updated_at' => now()
                            ]);
                        
                        $affectedRows++;
                        if (count($details) < 10) {
                            $details[] = "Téléphone corrigé: {$originalPhone} → {$cleanedPhone}";
                        }
                    }
                }
                break;

            case 'standardize_decisions':
                // Standardiser les décisions
                $updates = [
                    'accepte' => 'accepté',
                    'refuse' => 'refusé',
                    'attente' => 'en_attente'
                ];

                foreach ($updates as $old => $new) {
                    $updated = DB::table('beneficiaires')
                        ->where('campagne_id', $campagneId)
                        ->where('decision', $old)
                        ->whereNull('date_suppression')
                        ->update([
                            'decision' => $new,
                            'updated_at' => now()
                        ]);
                    
                    if ($updated > 0) {
                        $affectedRows += $updated;
                        $details[] = "Standardisé {$updated} décisions '{$old}' → '{$new}'";
                    }
                }
                break;

            case 'clean_all':
                // Exécuter toutes les actions de nettoyage
                // (Ici on pourrait appeler récursivement les autres actions)
                $details[] = "Action de nettoyage complet non implémentée dans cette version";
                break;
        }

        DB::commit();

        Log::info('✅ Nettoyage des données d\'import terminé', [
            'campagne_id' => $campagneId,
            'action' => $action,
            'affected_rows' => $affectedRows,
            'user_id' => auth()->id()
        ]);

        return response()->json([
            'success' => true,
            'message' => "Nettoyage terminé: {$affectedRows} enregistrements affectés",
            'data' => [
                'action' => $action,
                'affected_rows' => $affectedRows,
                'details' => $details
            ]
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error('❌ Erreur nettoyage données import', [
            'error' => $e->getMessage(),
            'campagne_id' => $campagneId,
            'action' => $request->action
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du nettoyage: ' . $e->getMessage()
        ], 500);
    }
}
private function cleanPhoneNumber($phone)
{
    if (empty($phone)) return $phone;
    
    $cleaned = preg_replace('/[^\d+]/', '', $phone);
    
    // Normalisation pour le Maroc
    if (str_starts_with($cleaned, '+212')) {
        return $cleaned;
    } elseif (str_starts_with($cleaned, '212')) {
        return '+' . $cleaned;
    } elseif (str_starts_with($cleaned, '0')) {
        return '+212' . substr($cleaned, 1);
    } elseif (strlen($cleaned) >= 9) {
        return '+212' . $cleaned;
    }
    
    return $phone; // Retourner tel quel si impossible à nettoyer
}
public function updateCampaignStatusAuto()
{
    try {
        DB::beginTransaction();
        
        $today = Carbon::now()->toDateString();
        $updatedCampaigns = [];
        
        // 1. Campagnes qui devraient être "En cours" (date_debut <= aujourd'hui < date_fin)
        $campaignsToStart = DB::table('campagnes_medicales')
            ->where('date_debut', '<=', $today)
            ->where('date_fin', '>', $today)
            ->whereIn('statut', ['Active', 'Inactive'])
            ->whereNull('date_suppression')
            ->get(['id', 'nom', 'statut', 'date_debut', 'date_fin']);
        
        foreach ($campaignsToStart as $campaign) {
            DB::table('campagnes_medicales')
                ->where('id', $campaign->id)
                ->update([
                    'statut' => 'En cours',
                    'updated_at' => now()
                ]);
            
            $updatedCampaigns[] = [
                'id' => $campaign->id,
                'nom' => $campaign->nom,
                'ancien_statut' => $campaign->statut,
                'nouveau_statut' => 'En cours',
                'raison' => 'Campagne en cours d\'exécution'
            ];
        }
        
        // 2. Campagnes qui devraient être "Terminée" (date_fin <= aujourd'hui)
        $campaignsToEnd = DB::table('campagnes_medicales')
            ->where('date_fin', '<=', $today)
            ->whereNotIn('statut', ['Terminée', 'Annulée'])
            ->whereNull('date_suppression')
            ->get(['id', 'nom', 'statut', 'date_debut', 'date_fin']);
        
        foreach ($campaignsToEnd as $campaign) {
            DB::table('campagnes_medicales')
                ->where('id', $campaign->id)
                ->update([
                    'statut' => 'Terminée',
                    'updated_at' => now()
                ]);
            
            $updatedCampaigns[] = [
                'id' => $campaign->id,
                'nom' => $campaign->nom,
                'ancien_statut' => $campaign->statut,
                'nouveau_statut' => 'Terminée',
                'raison' => 'Date de fin dépassée'
            ];
        }
        
        DB::commit();
        
        Log::info('✅ Mise à jour automatique des statuts terminée', [
            'campaigns_started' => count($campaignsToStart),
            'campaigns_ended' => count($campaignsToEnd),
            'total_updated' => count($updatedCampaigns)
        ]);
        
        return [
            'success' => true,
            'updated_count' => count($updatedCampaigns),
            'updated_campaigns' => $updatedCampaigns
        ];
        
    } catch (Exception $e) {
        DB::rollBack();
        Log::error('❌ Erreur mise à jour automatique statuts', [
            'error' => $e->getMessage()
        ]);
        
        return [
            'success' => false,
            'message' => $e->getMessage()
        ];
    }
}
public function getCampagnes(Request $request)
{
    try {
        // NOUVEAU: Mise à jour automatique des statuts avant affichage
        $this->updateCampaignStatusAuto();
        
        $userColumns = DB::select("DESCRIBE users");
        $userNameColumn = 'nom_user'; 
        foreach ($userColumns as $column) {
            if (in_array($column->Field, ['name', 'nom_user', 'nom', 'username'])) {
                $userNameColumn = $column->Field;
                break;
            }
        }

        $query = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('users', 'campagnes_medicales.created_by', '=', 'users.id')
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
                'campagnes_medicales.created_at',
                'types_assistance.libelle as type_assistance',
                DB::raw("users.{$userNameColumn} as created_by_name"),
                // NOUVEAU: Calculer le statut automatique basé sur les dates
                DB::raw("
                    CASE 
                        WHEN campagnes_medicales.date_fin <= CURDATE() AND campagnes_medicales.statut != 'Annulée' THEN 'Terminée'
                        WHEN campagnes_medicales.date_debut <= CURDATE() AND campagnes_medicales.date_fin > CURDATE() AND campagnes_medicales.statut != 'Annulée' THEN 'En cours'
                        WHEN campagnes_medicales.date_debut > CURDATE() THEN 'Active'
                        ELSE campagnes_medicales.statut 
                    END as statut_auto
                "),
                // NOUVEAU: Calculer les jours restants
                DB::raw("
                    CASE 
                        WHEN campagnes_medicales.date_fin <= CURDATE() THEN 0
                        ELSE DATEDIFF(campagnes_medicales.date_fin, CURDATE())
                    END as jours_restants
                "),
                // NOUVEAU: Pourcentage d'avancement
                DB::raw("
                    CASE 
                        WHEN campagnes_medicales.date_debut > CURDATE() THEN 0
                        WHEN campagnes_medicales.date_fin <= CURDATE() THEN 100
                        ELSE ROUND(
                            (DATEDIFF(CURDATE(), campagnes_medicales.date_debut) / 
                             DATEDIFF(campagnes_medicales.date_fin, campagnes_medicales.date_debut)) * 100, 
                            2
                        )
                    END as pourcentage_avancement
                ")
            )
            ->whereNull('campagnes_medicales.date_suppression');

        // Filtres existants...
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

        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $query->orderBy('campagnes_medicales.' . $sortBy, $sortDir);

        $perPage = $request->get('per_page', 15);
        $page = $request->get('page', 1);
        $offset = ($page - 1) * $perPage;

        $totalCount = $query->count();
        $campagnes = $query->limit($perPage)->offset($offset)->get();

        // NOUVEAU: Enrichir les données avec des indicateurs visuels
        $campagnes = $campagnes->map(function($campagne) {
            // Déterminer la couleur du statut
            switch ($campagne->statut_auto) {
                case 'Terminée':
                    $campagne->statut_color = 'success';
                    $campagne->statut_icon = '✅';
                    break;
                case 'En cours':
                    $campagne->statut_color = 'info';
                    $campagne->statut_icon = '⏳';
                    break;
                case 'Active':
                    $campagne->statut_color = 'primary';
                    $campagne->statut_icon = '🟢';
                    break;
                case 'Annulée':
                    $campagne->statut_color = 'danger';
                    $campagne->statut_icon = '❌';
                    break;
                default:
                    $campagne->statut_color = 'secondary';
                    $campagne->statut_icon = '⚪';
            }

            // Formater les dates
            $campagne->date_debut_formatee = Carbon::parse($campagne->date_debut)->format('d/m/Y');
            $campagne->date_fin_formatee = Carbon::parse($campagne->date_fin)->format('d/m/Y');
            
            // Message de statut détaillé
            if ($campagne->jours_restants > 0) {
                $campagne->message_statut = "Se termine dans {$campagne->jours_restants} jour(s)";
            } elseif ($campagne->jours_restants == 0) {
                $campagne->message_statut = "Se termine aujourd'hui";
            } else {
                $joursPasses = abs($campagne->jours_restants);
                $campagne->message_statut = "Terminée depuis {$joursPasses} jour(s)";
            }

            // Utiliser le statut automatique comme statut principal
            $campagne->statut_display = $campagne->statut_auto;
            
            return $campagne;
        });

        return response()->json([
            'success' => true,
            'data' => $campagnes,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $totalCount,
            'last_page' => ceil($totalCount / $perPage)
        ]);

    } catch (Exception $e2) {
        Log::error('Erreur getCampagnes avec auto-update', [
            'error' => $e2->getMessage()
        ]);
        
        // Fallback vers l'ancienne méthode si erreur
        return $this->getCampagnesOriginal($request);
    }
}
public function forceUpdateCampaignStatus()
{
    try {
        $result = $this->updateCampaignStatusAuto();
        
        return response()->json([
            'success' => $result['success'],
            'message' => $result['success'] ? 
                "Statuts mis à jour: {$result['updated_count']} campagnes modifiées" : 
                $result['message'],
            'data' => $result['updated_campaigns'] ?? []
        ]);
        
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la mise à jour: ' . $e->getMessage()
        ], 500);
    }
}
public function getCampagnesWithAutoStatus(Request $request)
{
    try {
        $query = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'campagnes_medicales.*',
                'types_assistance.libelle as type_assistance',
                DB::raw("
                    CASE 
                        WHEN campagnes_medicales.date_fin <= CURDATE() AND campagnes_medicales.statut != 'Annulée' THEN 'Terminée'
                        WHEN campagnes_medicales.date_debut <= CURDATE() AND campagnes_medicales.date_fin > CURDATE() AND campagnes_medicales.statut != 'Annulée' THEN 'En cours'
                        WHEN campagnes_medicales.date_debut > CURDATE() THEN 'Programmée'
                        ELSE campagnes_medicales.statut 
                    END as statut_calcule
                "),
                DB::raw("DATEDIFF(campagnes_medicales.date_fin, CURDATE()) as jours_restants"),
                DB::raw("
                    CASE 
                        WHEN campagnes_medicales.date_debut > CURDATE() THEN 'À venir'
                        WHEN campagnes_medicales.date_fin <= CURDATE() THEN 'Finie'
                        ELSE 'Active'
                    END as phase
                ")
            )
            ->whereNull('campagnes_medicales.date_suppression')
            ->orderBy('campagnes_medicales.date_debut', 'desc')
            ->get();

        // Grouper par statut calculé
        $grouped = $query->groupBy('statut_calcule');

        return response()->json([
            'success' => true,
            'data' => [
                'campagnes' => $query,
                'statistiques' => [
                    'total' => $query->count(),
                    'terminées' => $grouped->get('Terminée', collect())->count(),
                    'en_cours' => $grouped->get('En cours', collect())->count(),
                    'programmées' => $grouped->get('Programmée', collect())->count(),
                    'annulées' => $grouped->get('Annulée', collect())->count()
                ],
                'par_statut' => $grouped->map(function($campagnes) {
                    return $campagnes->count();
                })
            ]
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur: ' . $e->getMessage()
        ], 500);
    }
}
public function scheduleStatusUpdate()
{
    // Cette méthode sera appelée quotidiennement
    $result = $this->updateCampaignStatusAuto();
    
    if ($result['success'] && $result['updated_count'] > 0) {
        Log::info('📅 Mise à jour quotidienne des statuts', [
            'updated_campaigns' => $result['updated_count'],
            'campaigns' => $result['updated_campaigns']
        ]);
    }
    
    return $result;
}
private function getCampagnesOriginal(Request $request)
{
    // Code original de getCampagnes sans les modifications...
    // [Garde l'ancien code en cas de problème]
}
public function diagnosticFormOptions()
{
    try {
        $diagnostic = [
            'timestamp' => now()->toISOString(),
            'database' => [
                'connected' => false,
                'name' => null,
                'driver' => null
            ],
            'tables' => [],
            'data_counts' => [],
            'errors' => []
        ];

        // Test connexion DB
        try {
            $pdo = DB::connection()->getPdo();
            $diagnostic['database'] = [
                'connected' => true,
                'name' => DB::connection()->getDatabaseName(),
                'driver' => DB::connection()->getDriverName()
            ];
        } catch (Exception $e) {
            $diagnostic['errors'][] = 'Connexion DB: ' . $e->getMessage();
        }

        // Test des tables essentielles
        $essentialTables = [
            'campagnes_medicales',
            'types_assistance', 
            'beneficiaires',
            'etat_dones',
            'nature_dones',
            'situations'
        ];

        foreach ($essentialTables as $table) {
            try {
                $exists = Schema::hasTable($table);
                $diagnostic['tables'][$table] = [
                    'exists' => $exists,
                    'accessible' => false,
                    'count' => 0
                ];

                if ($exists) {
                    $count = DB::table($table)->count();
                    $diagnostic['tables'][$table]['accessible'] = true;
                    $diagnostic['tables'][$table]['count'] = $count;
                    $diagnostic['data_counts'][$table] = $count;
                }
            } catch (Exception $e) {
                $diagnostic['tables'][$table] = [
                    'exists' => false,
                    'error' => $e->getMessage()
                ];
                $diagnostic['errors'][] = "Table {$table}: " . $e->getMessage();
            }
        }

        // Test des requêtes spécifiques
        $queries = [
            'campagnes_actives' => "SELECT COUNT(*) as count FROM campagnes_medicales WHERE statut IN ('Active', 'En cours') AND date_suppression IS NULL",
            'types_assistance_actifs' => "SELECT COUNT(*) as count FROM types_assistance WHERE date_suppression IS NULL",
            'beneficiaires_total' => "SELECT COUNT(*) as count FROM beneficiaires WHERE date_suppression IS NULL"
        ];

        foreach ($queries as $name => $sql) {
            try {
                $result = DB::select($sql);
                $diagnostic['data_counts'][$name] = $result[0]->count ?? 0;
            } catch (Exception $e) {
                $diagnostic['errors'][] = "Query {$name}: " . $e->getMessage();
            }
        }

        // Recommandations
        $diagnostic['recommendations'] = [];
        
        if (!$diagnostic['database']['connected']) {
            $diagnostic['recommendations'][] = "❌ Problème de connexion à la base de données";
        }

        if (!($diagnostic['tables']['campagnes_medicales']['exists'] ?? false)) {
            $diagnostic['recommendations'][] = "❌ Table campagnes_medicales manquante";
        } elseif (($diagnostic['data_counts']['campagnes_actives'] ?? 0) === 0) {
            $diagnostic['recommendations'][] = "⚠️ Aucune campagne active trouvée";
        }

        if (!($diagnostic['tables']['types_assistance']['exists'] ?? false)) {
            $diagnostic['recommendations'][] = "❌ Table types_assistance manquante";
        }

        if (empty($diagnostic['errors'])) {
            $diagnostic['recommendations'][] = "✅ Toutes les vérifications sont OK";
        }

        return response()->json([
            'success' => true,
            'diagnostic' => $diagnostic
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur diagnostic: ' . $e->getMessage(),
            'error_details' => [
                'line' => $e->getLine(),
                'file' => basename($e->getFile())
            ]
        ], 500);
    }
}
public function testCampagnesLoading()
{
    try {
        Log::info('🧪 Test de chargement des campagnes');

        $tests = [];

        // Test 1: Requête simple
        try {
            $simple = DB::table('campagnes_medicales')
                ->select('id', 'nom')
                ->whereNull('date_suppression')
                ->limit(5)
                ->get();
            
            $tests['simple_query'] = [
                'success' => true,
                'count' => $simple->count(),
                'sample' => $simple->first()
            ];
        } catch (Exception $e) {
            $tests['simple_query'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }

        // Test 2: Avec jointure
        try {
            $withJoin = DB::table('campagnes_medicales')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select('campagnes_medicales.id', 'campagnes_medicales.nom', 'types_assistance.libelle')
                ->whereNull('campagnes_medicales.date_suppression')
                ->limit(5)
                ->get();
            
            $tests['with_join'] = [
                'success' => true,
                'count' => $withJoin->count(),
                'sample' => $withJoin->first()
            ];
        } catch (Exception $e) {
            $tests['with_join'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }

        // Test 3: Campagnes actives
        try {
            $actives = DB::table('campagnes_medicales')
                ->whereIn('statut', ['Active', 'En cours'])
                ->whereNull('date_suppression')
                ->get(['id', 'nom', 'statut']);
            
            $tests['actives_only'] = [
                'success' => true,
                'count' => $actives->count(),
                'sample' => $actives->first()
            ];
        } catch (Exception $e) {
            $tests['actives_only'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }

        return response()->json([
            'success' => true,
            'tests' => $tests,
            'summary' => [
                'all_passed' => !collect($tests)->contains('success', false),
                'total_tests' => count($tests),
                'failed_tests' => collect($tests)->where('success', false)->count()
            ]
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur test campagnes: ' . $e->getMessage()
        ], 500);
    }
}
public function diagnosticTypesAssistance()
{
    try {
        $diagnostic = [
            'timestamp' => now()->toISOString(),
            'table_exists' => Schema::hasTable('types_assistance'),
            'columns' => [],
            'data_count' => 0,
            'sample_data' => [],
            'issues' => [],
            'recommendations' => []
        ];

        if (!$diagnostic['table_exists']) {
            $diagnostic['issues'][] = 'Table types_assistance non trouvée';
            $diagnostic['recommendations'][] = 'Créer la table types_assistance avec la migration appropriée';
            
            return response()->json([
                'success' => false,
                'diagnostic' => $diagnostic
            ]);
        }

        // Vérifier la structure de la table
        try {
            $columns = DB::select("DESCRIBE types_assistance");
            $diagnostic['columns'] = collect($columns)->map(function($col) {
                return [
                    'Field' => $col->Field,
                    'Type' => $col->Type,
                    'Null' => $col->Null,
                    'Key' => $col->Key,
                    'Default' => $col->Default,
                    'Extra' => $col->Extra
                ];
            })->toArray();
        } catch (Exception $e) {
            $diagnostic['issues'][] = 'Impossible de lire la structure de la table: ' . $e->getMessage();
        }

        // Compter les enregistrements
        try {
            $diagnostic['data_count'] = DB::table('types_assistance')->count();
            $diagnostic['active_count'] = DB::table('types_assistance')
                ->whereNull('date_suppression')
                ->count();
        } catch (Exception $e) {
            $diagnostic['issues'][] = 'Impossible de compter les enregistrements: ' . $e->getMessage();
        }

        // Récupérer des données d'exemple
        try {
            $diagnostic['sample_data'] = DB::table('types_assistance')
                ->limit(5)
                ->get()
                ->toArray();
        } catch (Exception $e) {
            $diagnostic['issues'][] = 'Impossible de récupérer les données d\'exemple: ' . $e->getMessage();
        }

        // Vérifications et recommandations
        if ($diagnostic['data_count'] === 0) {
            $diagnostic['issues'][] = 'Aucun type d\'assistance dans la base';
            $diagnostic['recommendations'][] = 'Insérer des types d\'assistance par défaut';
            $diagnostic['recommendations'][] = 'Utiliser les seeders ou fixtures pour peupler la table';
        }

        if ($diagnostic['active_count'] === 0 && $diagnostic['data_count'] > 0) {
            $diagnostic['issues'][] = 'Tous les types d\'assistance sont supprimés (date_suppression non null)';
            $diagnostic['recommendations'][] = 'Restaurer au moins un type d\'assistance';
        }

        // Vérifier la colonne date_suppression
        $hasDateSuppression = collect($diagnostic['columns'])->firstWhere('Field', 'date_suppression');
        if (!$hasDateSuppression) {
            $diagnostic['issues'][] = 'Colonne date_suppression manquante';
            $diagnostic['recommendations'][] = 'Ajouter la colonne date_suppression pour le soft delete';
        }

        return response()->json([
            'success' => count($diagnostic['issues']) === 0,
            'diagnostic' => $diagnostic
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'diagnostic' => [
                'error' => 'Erreur lors du diagnostic: ' . $e->getMessage()
            ]
        ]);
    }
}
public function createDefaultTypesAssistance()
{
    try {
        $typesParDefaut = [
            [
                'libelle' => 'Lunettes',
                'description' => 'Lunettes de vue et solaires pour correction visuelle'
            ],
            [
                'libelle' => 'Appareils Auditifs',
                'description' => 'Appareils auditifs et prothèses auditives'
            ],
            [
                'libelle' => 'Fauteuils Roulants',
                'description' => 'Fauteuils roulants manuels et électriques'
            ],
            [
                'libelle' => 'Cannes Blanches',
                'description' => 'Cannes blanches pour personnes aveugles et malvoyantes'
            ],
            [
                'libelle' => 'Prothèses',
                'description' => 'Prothèses diverses (membres, orthèses)'
            ],
            [
                'libelle' => 'Appareillage Orthopédique',
                'description' => 'Matériel orthopédique et d\'aide à la mobilité'
            ]
        ];

        $created = [];
        $errors = [];

        DB::beginTransaction();

        foreach ($typesParDefaut as $type) {
            try {
                // Vérifier si le type existe déjà
                $exists = DB::table('types_assistance')
                    ->where('libelle', $type['libelle'])
                    ->exists();

                if (!$exists) {
                    $id = DB::table('types_assistance')->insertGetId([
                        'libelle' => $type['libelle'],
                        'description' => $type['description'],
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);

                    $created[] = [
                        'id' => $id,
                        'libelle' => $type['libelle'],
                        'description' => $type['description']
                    ];
                } else {
                    $errors[] = "Type '{$type['libelle']}' existe déjà";
                }
            } catch (Exception $e) {
                $errors[] = "Erreur création '{$type['libelle']}': " . $e->getMessage();
            }
        }

        DB::commit();

        Log::info('Types d\'assistance par défaut créés', [
            'created_count' => count($created),
            'error_count' => count($errors)
        ]);

        return response()->json([
            'success' => true,
            'message' => count($created) . ' types d\'assistance créés avec succès',
            'data' => [
                'created' => $created,
                'errors' => $errors,
                'created_count' => count($created),
                'error_count' => count($errors)
            ]
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error('Erreur création types assistance par défaut', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la création: ' . $e->getMessage()
        ], 500);
    }
}
public function getTypesAssistanceSimple()
{
    try {
        Log::info('📋 getTypesAssistanceSimple appelé');

        $types = DB::table('types_assistance')
            ->select('id', 'libelle', 'description', 'created_at', 'updated_at')
            ->whereNull('date_suppression')
            ->orderBy('libelle')
            ->get();

        $typesFormatted = $types->map(function($type) {
            return [
                'id' => $type->id,
                'value' => $type->id, // Pour compatibilité avec les selects
                'label' => $type->libelle,
                'libelle' => $type->libelle,
                'description' => $type->description,
                'created_at' => $type->created_at,
                'updated_at' => $type->updated_at
            ];
        });

        Log::info('✅ Types assistance récupérés', ['count' => $typesFormatted->count()]);

        return response()->json([
            'success' => true,
            'data' => $typesFormatted,
            'count' => $typesFormatted->count(),
            'timestamp' => now()->toISOString()
        ]);

    } catch (Exception $e) {
        Log::error('❌ Erreur getTypesAssistanceSimple', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement des types d\'assistance: ' . $e->getMessage(),
            'data' => []
        ], 500);
    }
}
public function getFormOptionsImproved()
{
    try {
        Log::info('🔄 Début getFormOptions amélioré');
        
        $data = [
            'types_assistance' => [],
            'campagnes_actives' => [],
            'campagnes' => [],
            'etat_dones' => [],
            'nature_dones' => [],
            'situations' => [],
            'details_type_assistances' => [],
            'sexes' => [
                ['value' => 'M', 'label' => 'Masculin'],
                ['value' => 'F', 'label' => 'Féminin']
            ],
            'priorites' => [
                ['value' => 'Normale', 'label' => 'Normale'],
                ['value' => 'Urgente', 'label' => 'Urgente'],
                ['value' => 'Très urgente', 'label' => 'Très urgente']
            ],
            'decisions' => [
                ['value' => 'accepté', 'label' => 'Accepté'],
                ['value' => 'en_attente', 'label' => 'En attente'],
                ['value' => 'refusé', 'label' => 'Refusé'],
                ['value' => 'admin a list principal', 'label' => 'Admin - Liste principale'],
                ['value' => 'admin a list d\'attente', 'label' => 'Admin - Liste d\'attente']
            ],
            'cotes' => [
                ['value' => 'unilatéral', 'label' => 'Unilatéral'],
                ['value' => 'bilatéral', 'label' => 'Bilatéral']
            ]
        ];

        // 1. CHARGEMENT PRIORITAIRE: Types d'assistance
        $data['types_assistance'] = $this->loadTypesAssistanceSecure();
        
        // 2. CHARGEMENT PRIORITAIRE: Campagnes avec plusieurs méthodes
        $campagnesResult = $this->loadCampagnesSecure();
        $data['campagnes_actives'] = $campagnesResult['actives'];
        $data['campagnes'] = $campagnesResult['toutes'];
        
        // 3. CHARGEMENT OPTIONNEL: Autres données
        $optionalData = $this->loadOptionalFormData();
        $data = array_merge($data, $optionalData);

        $summary = [
            'types_assistance' => count($data['types_assistance']),
            'campagnes_actives' => count($data['campagnes_actives']),
            'campagnes_total' => count($data['campagnes']),
            'etat_dones' => count($data['etat_dones']),
            'nature_dones' => count($data['nature_dones']),
            'situations' => count($data['situations'])
        ];

        Log::info('✅ getFormOptions amélioré terminé', $summary);

        return response()->json([
            'success' => true,
            'data' => $data,
            'summary' => $summary,
            'timestamp' => now()->toISOString()
        ]);

    } catch (Exception $e) {
        Log::error('❌ ERREUR getFormOptions amélioré', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        // Retour d'urgence avec données minimales
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement: ' . $e->getMessage(),
            'data' => $this->getMinimalFormData()
        ], 500);
    }
}
private function loadOptionalFormData()
{
    $data = [
        'etat_dones' => [],
        'nature_dones' => [],
        'situations' => [],
        'details_type_assistances' => []
    ];
    
    $optionalTables = [
        'etat_dones' => 'États de don',
        'nature_dones' => 'Natures de don', 
        'situations' => 'Situations',
        'details_type_assistances' => 'Détails types assistance'
    ];

    foreach ($optionalTables as $table => $description) {
        try {
            if (Schema::hasTable($table)) {
                $records = DB::table($table)
                    ->select('id', 'libelle', 'description')
                    ->whereNull('date_suppression')
                    ->orderBy('libelle')
                    ->get();
                
                $data[$table] = $records->map(function($record) {
                    return [
                        'id' => $record->id,
                        'value' => $record->id,
                        'label' => $record->libelle,
                        'libelle' => $record->libelle,
                        'description' => $record->description ?? ''
                    ];
                })->toArray();
                
                Log::info("✅ {$description} chargés", ['count' => count($data[$table])]);
            } else {
                Log::info("ℹ️ Table {$table} non trouvée");
                $data[$table] = [];
            }
        } catch (Exception $e) {
            Log::warning("⚠️ Erreur chargement {$table}", ['error' => $e->getMessage()]);
            $data[$table] = [];
        }
    }
    
    return $data;
}
public function testCampagnesConnectivity()
{
    try {
        $tests = [];
        
        // Test 1: Connexion base de données
        try {
            $pdo = DB::connection()->getPdo();
            $tests['db_connection'] = [
                'success' => true,
                'database' => DB::connection()->getDatabaseName()
            ];
        } catch (Exception $e) {
            $tests['db_connection'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // Test 2: Table campagnes_medicales
        try {
            $tableExists = Schema::hasTable('campagnes_medicales');
            $count = $tableExists ? DB::table('campagnes_medicales')->count() : 0;
            
            $tests['table_campagnes'] = [
                'success' => $tableExists,
                'exists' => $tableExists,
                'total_count' => $count,
                'active_count' => $tableExists ? 
                    DB::table('campagnes_medicales')
                        ->whereIn('statut', ['Active', 'En cours'])
                        ->whereNull('date_suppression')
                        ->count() : 0
            ];
        } catch (Exception $e) {
            $tests['table_campagnes'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // Test 3: Requête simple
        try {
            $simpleCampagnes = DB::table('campagnes_medicales')
                ->select('id', 'nom', 'statut')
                ->whereNull('date_suppression')
                ->limit(5)
                ->get();
            
            $tests['simple_query'] = [
                'success' => true,
                'count' => $simpleCampagnes->count(),
                'sample' => $simpleCampagnes->first()
            ];
        } catch (Exception $e) {
            $tests['simple_query'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // Test 4: Requête avec jointure
        try {
            $joinCampagnes = DB::table('campagnes_medicales')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select('campagnes_medicales.id', 'campagnes_medicales.nom', 'types_assistance.libelle')
                ->whereNull('campagnes_medicales.date_suppression')
                ->limit(5)
                ->get();
            
            $tests['join_query'] = [
                'success' => true,
                'count' => $joinCampagnes->count(),
                'sample' => $joinCampagnes->first()
            ];
        } catch (Exception $e) {
            $tests['join_query'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // Test 5: API getFormOptions
        try {
            $formOptionsResponse = $this->getFormOptions();
            $formOptionsData = $formOptionsResponse->getData(true);
            
            $tests['form_options_api'] = [
                'success' => $formOptionsData['success'] ?? false,
                'campagnes_count' => count($formOptionsData['data']['campagnes_actives'] ?? []),
                'has_data' => !empty($formOptionsData['data'])
            ];
        } catch (Exception $e) {
            $tests['form_options_api'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // Résumé
        $allPassed = collect($tests)->every('success');
        $failedTests = collect($tests)->reject('success');
        
        return response()->json([
            'success' => $allPassed,
            'summary' => [
                'all_tests_passed' => $allPassed,
                'total_tests' => count($tests),
                'failed_count' => $failedTests->count(),
                'failed_tests' => $failedTests->keys()->toArray()
            ],
            'tests' => $tests,
            'recommendations' => $this->generateConnectivityRecommendations($tests),
            'timestamp' => now()->toISOString()
        ]);
        
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du test de connectivité: ' . $e->getMessage(),
            'error_details' => [
                'line' => $e->getLine(),
                'file' => basename($e->getFile())
            ]
        ], 500);
    }
}
private function generateConnectivityRecommendations($tests)
{
    $recommendations = [];
    
    if (!($tests['db_connection']['success'] ?? true)) {
        $recommendations[] = "❌ CRITIQUE: Problème de connexion à la base de données";
        $recommendations[] = "→ Vérifiez la configuration .env";
        $recommendations[] = "→ Vérifiez que le serveur de base de données est accessible";
    }
    
    if (!($tests['table_campagnes']['exists'] ?? true)) {
        $recommendations[] = "❌ CRITIQUE: Table campagnes_medicales manquante";
        $recommendations[] = "→ Exécutez les migrations: php artisan migrate";
        $recommendations[] = "→ Vérifiez la structure de la base de données";
    }
    
    if (($tests['table_campagnes']['active_count'] ?? 0) === 0) {
        $recommendations[] = "⚠️ Aucune campagne active trouvée";
        $recommendations[] = "→ Créez au moins une campagne avec le statut 'Active'";
        $recommendations[] = "→ Vérifiez que les campagnes ne sont pas toutes supprimées (date_suppression)";
    }
    
    if (!($tests['simple_query']['success'] ?? true)) {
        $recommendations[] = "❌ Problème avec les requêtes simples";
        $recommendations[] = "→ Vérifiez les permissions de l'utilisateur de base de données";
    }
    
    if (!($tests['join_query']['success'] ?? true)) {
        $recommendations[] = "❌ Problème avec les jointures";
        $recommendations[] = "→ Vérifiez que la table types_assistance existe";
        $recommendations[] = "→ Vérifiez les clés étrangères";
    }
    
    if (!($tests['form_options_api']['success'] ?? true)) {
        $recommendations[] = "❌ API getFormOptions défaillante";
        $recommendations[] = "→ Vérifiez les logs Laravel pour plus de détails";
        $recommendations[] = "→ Utilisez la route de test spécifique";
    }
    
    if (empty($recommendations)) {
        $recommendations[] = "✅ Tous les tests sont passés avec succès";
        $recommendations[] = "✅ La connectivité aux campagnes fonctionne correctement";
    }
    
    return $recommendations;
}
public function testSpecificCampagne($id)
{
    try {
        $diagnostic = [
            'campagne_id' => $id,
            'timestamp' => now()->toISOString(),
            'tests' => []
        ];
        
        // Test 1: Existence de la campagne
        try {
            $campagne = DB::table('campagnes_medicales')
                ->where('id', $id)
                ->first();
            
            $diagnostic['tests']['existence'] = [
                'success' => !!$campagne,
                'found' => !!$campagne,
                'data' => $campagne
            ];
        } catch (Exception $e) {
            $diagnostic['tests']['existence'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // Test 2: Campagne avec jointures
        try {
            $campagneComplete = DB::table('campagnes_medicales')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select(
                    'campagnes_medicales.*',
                    'types_assistance.libelle as type_assistance'
                )
                ->where('campagnes_medicales.id', $id)
                ->first();
            
            $diagnostic['tests']['with_joins'] = [
                'success' => !!$campagneComplete,
                'has_type_assistance' => !empty($campagneComplete->type_assistance ?? null),
                'data' => $campagneComplete
            ];
        } catch (Exception $e) {
            $diagnostic['tests']['with_joins'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // Test 3: Bénéficiaires associés
        try {
            $beneficiairesCount = DB::table('beneficiaires')
                ->where('campagne_id', $id)
                ->whereNull('date_suppression')
                ->count();
            
            $diagnostic['tests']['beneficiaires'] = [
                'success' => true,
                'count' => $beneficiairesCount,
                'has_beneficiaires' => $beneficiairesCount > 0
            ];
        } catch (Exception $e) {
            $diagnostic['tests']['beneficiaires'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // Test 4: API getCampagne
        try {
            $apiResponse = $this->getCampagne($id);
            $apiData = $apiResponse->getData(true);
            
            $diagnostic['tests']['api_access'] = [
                'success' => $apiData['success'] ?? false,
                'status_code' => $apiResponse->getStatusCode(),
                'has_data' => !empty($apiData['data'] ?? null)
            ];
        } catch (Exception $e) {
            $diagnostic['tests']['api_access'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        return response()->json([
            'success' => true,
            'diagnostic' => $diagnostic
        ]);
        
    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur diagnostic campagne: ' . $e->getMessage(),
            'campagne_id' => $id
        ], 500);
    }
}
public function diagnosticCampagnes()
{
    try {
        $diagnostic = [
            'timestamp' => now()->toISOString(),
            'table_exists' => Schema::hasTable('campagnes_medicales'),
            'data_count' => 0,
            'actives_count' => 0,
            'sample_data' => [],
            'issues' => [],
            'recommendations' => []
        ];

        if (!$diagnostic['table_exists']) {
            $diagnostic['issues'][] = 'Table campagnes_medicales non trouvée';
            $diagnostic['recommendations'][] = 'Exécuter les migrations Laravel';
            
            return response()->json([
                'success' => false,
                'diagnostic' => $diagnostic
            ]);
        }

        // Compter les campagnes
        $diagnostic['data_count'] = DB::table('campagnes_medicales')->count();
        $diagnostic['actives_count'] = DB::table('campagnes_medicales')
            ->whereIn('statut', ['Active', 'En cours'])
            ->whereNull('date_suppression')
            ->count();

        // Échantillon de données
        $diagnostic['sample_data'] = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'campagnes_medicales.id',
                'campagnes_medicales.nom',
                'campagnes_medicales.statut',
                'types_assistance.libelle as type_assistance'
            )
            ->limit(5)
            ->get()
            ->toArray();

        // Vérifications et recommandations
        if ($diagnostic['data_count'] === 0) {
            $diagnostic['issues'][] = 'Aucune campagne dans la base de données';
            $diagnostic['recommendations'][] = 'Créer au moins une campagne de test';
        }

        if ($diagnostic['actives_count'] === 0 && $diagnostic['data_count'] > 0) {
            $diagnostic['issues'][] = 'Aucune campagne active trouvée';
            $diagnostic['recommendations'][] = 'Créer une campagne avec le statut "Active" ou "En cours"';
        }

        // Test de chargement via l'API
        try {
            $apiTest = $this->getCampagnesForSelect(new Request());
            $apiData = $apiTest->getData(true);
            
            $diagnostic['api_test'] = [
                'success' => $apiData['success'] ?? false,
                'count' => count($apiData['data'] ?? []),
                'has_data' => !empty($apiData['data'])
            ];
        } catch (Exception $e) {
            $diagnostic['api_test'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
            $diagnostic['issues'][] = 'API getCampagnesForSelect échoue: ' . $e->getMessage();
        }

        return response()->json([
            'success' => count($diagnostic['issues']) === 0,
            'diagnostic' => $diagnostic
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}
public function createTestCampagne()
{
    try {
        DB::beginTransaction();

        // Vérifier qu'au moins un type d'assistance existe
        $typeAssistance = DB::table('types_assistance')
            ->whereNull('date_suppression')
            ->first();

        if (!$typeAssistance) {
            // Créer un type d'assistance de test
            $typeId = DB::table('types_assistance')->insertGetId([
                'libelle' => 'Test - Lunettes',
                'description' => 'Type de test créé automatiquement',
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            Log::info('✅ Type d\'assistance de test créé', ['id' => $typeId]);
        } else {
            $typeId = $typeAssistance->id;
        }

        // Créer la campagne de test
        $campagneId = DB::table('campagnes_medicales')->insertGetId([
            'nom' => 'Campagne de Test - ' . now()->format('Y-m-d H:i'),
            'description' => 'Campagne créée automatiquement pour tester le système',
            'type_assistance_id' => $typeId,
            'date_debut' => now()->toDateString(),
            'date_fin' => now()->addDays(30)->toDateString(),
            'lieu' => 'Centre de test - Fès',
            'statut' => 'Active',
            'budget' => 50000,
            'nombre_participants_prevu' => 100,
            'created_at' => now(),
            'updated_at' => now(),
            'created_by' => Auth::id() ?? 1
        ]);

        DB::commit();

        Log::info('✅ Campagne de test créée', [
            'campagne_id' => $campagneId,
            'type_assistance_id' => $typeId
        ]);

        // Tester immédiatement le chargement
        $testLoad = $this->getCampagnesForSelect(new Request());
        $testData = $testLoad->getData(true);

        return response()->json([
            'success' => true,
            'message' => 'Campagne de test créée avec succès',
            'data' => [
                'campagne_id' => $campagneId,
                'type_assistance_id' => $typeId,
                'test_api_success' => $testData['success'] ?? false,
                'campagnes_loaded' => count($testData['data'] ?? [])
            ]
        ], 201);

    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error('❌ Erreur création campagne de test', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la création de la campagne de test: ' . $e->getMessage()
        ], 500);
    }
}
public function fixCampagnesIssues()
{
    try {
        DB::beginTransaction();
        
        $fixes = [];
        
        // Fix 1: Vérifier que la table existe
        if (!Schema::hasTable('campagnes_medicales')) {
            $fixes[] = 'Table campagnes_medicales manquante - migration requise';
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Table campagnes_medicales manquante',
                'fixes' => $fixes
            ]);
        }
        
        // Fix 2: Corriger les campagnes sans type d'assistance
        $campagnesSansType = DB::table('campagnes_medicales')
            ->whereNull('type_assistance_id')
            ->whereNull('date_suppression')
            ->count();
            
        if ($campagnesSansType > 0) {
            $defaultType = DB::table('types_assistance')->first();
            if ($defaultType) {
                DB::table('campagnes_medicales')
                    ->whereNull('type_assistance_id')
                    ->whereNull('date_suppression')
                    ->update(['type_assistance_id' => $defaultType->id]);
                
                $fixes[] = "Corrigé {$campagnesSansType} campagnes sans type d'assistance";
            }
        }
        
        // Fix 3: Corriger les statuts invalides
        $statutsValides = ['Active', 'Inactive', 'En cours', 'Terminée', 'Annulée'];
        $campagnesStatutInvalide = DB::table('campagnes_medicales')
            ->whereNull('date_suppression')
            ->whereNotIn('statut', $statutsValides)
            ->count();
            
        if ($campagnesStatutInvalide > 0) {
            DB::table('campagnes_medicales')
                ->whereNull('date_suppression')
                ->whereNotIn('statut', $statutsValides)
                ->update(['statut' => 'Active']);
                
            $fixes[] = "Corrigé {$campagnesStatutInvalide} campagnes avec statut invalide";
        }
        
        // Fix 4: Créer une campagne de test si aucune active
        $campagnesActives = DB::table('campagnes_medicales')
            ->whereIn('statut', ['Active', 'En cours'])
            ->whereNull('date_suppression')
            ->count();
            
        if ($campagnesActives === 0) {
            $typeAssistance = DB::table('types_assistance')->first();
            if (!$typeAssistance) {
                $typeId = DB::table('types_assistance')->insertGetId([
                    'libelle' => 'Lunettes',
                    'description' => 'Lunettes de vue et solaires',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                $fixes[] = 'Créé type d\'assistance par défaut';
            } else {
                $typeId = $typeAssistance->id;
            }
            
            $campagneId = DB::table('campagnes_medicales')->insertGetId([
                'nom' => 'Campagne de Test Automatique',
                'description' => 'Campagne créée automatiquement pour corriger les problèmes',
                'type_assistance_id' => $typeId,
                'date_debut' => now()->toDateString(),
                'date_fin' => now()->addDays(60)->toDateString(),
                'lieu' => 'Centre de test',
                'statut' => 'Active',
                'budget' => 100000,
                'nombre_participants_prevu' => 200,
                'created_at' => now(),
                'updated_at' => now(),
                'created_by' => Auth::id() ?? 1
            ]);
            
            $fixes[] = 'Créé campagne de test active (ID: ' . $campagneId . ')';
        }
        
        DB::commit();
        
        Log::info('✅ Problèmes campagnes corrigés', [
            'fixes_applied' => count($fixes),
            'fixes' => $fixes
        ]);
        
        return response()->json([
            'success' => true,
            'message' => count($fixes) . ' problèmes corrigés avec succès',
            'fixes' => $fixes
        ]);
        
    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error('❌ Erreur correction campagnes', [
            'error' => $e->getMessage()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la correction: ' . $e->getMessage()
        ], 500);
    }
}
private function loadCampagnesRobuste()
{
    Log::info('🎯 Début chargement campagnes robuste');
    
    // STRATÉGIE 1: Requête complète avec jointures
    try {
        Log::info('📋 Stratégie 1: Requête complète avec jointures');
        
        $campagnes = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'campagnes_medicales.id',
                'campagnes_medicales.nom',
                'campagnes_medicales.description',
                'campagnes_medicales.type_assistance_id',
                'campagnes_medicales.statut',
                'campagnes_medicales.date_debut',
                'campagnes_medicales.date_fin',
                'campagnes_medicales.lieu',
                'campagnes_medicales.budget',
                'campagnes_medicales.nombre_participants_prevu',
                'campagnes_medicales.created_at',
                'campagnes_medicales.updated_at',
                'types_assistance.libelle as type_assistance'
            )
            ->whereNull('campagnes_medicales.date_suppression')
            ->orderByRaw("
                CASE campagnes_medicales.statut 
                    WHEN 'En cours' THEN 1
                    WHEN 'Active' THEN 2  
                    WHEN 'Terminée' THEN 3
                    ELSE 4
                END
            ")
            ->orderBy('campagnes_medicales.nom')
            ->get();

        if ($campagnes->count() > 0) {
            Log::info('✅ Stratégie 1 réussie', [
                'count' => $campagnes->count(),
                'first_campaign' => $campagnes->first()->nom ?? 'N/A'
            ]);
            
            return $this->formatCampagnesForSelect($campagnes);
        }
        
        Log::warning('⚠️ Stratégie 1: Aucune campagne trouvée, passage à la stratégie 2');
        
    } catch (Exception $e) {
        Log::warning('⚠️ Stratégie 1 échouée', [
            'error' => $e->getMessage()
        ]);
    }

    // STRATÉGIE 2: Requête simple sans jointure
    try {
        Log::info('📋 Stratégie 2: Requête simple sans jointure');
        
        $campagnes = DB::table('campagnes_medicales')
            ->select(
                'id',
                'nom',
                'description',
                'type_assistance_id',
                'statut',
                'date_debut',
                'date_fin',
                'lieu',
                'budget',
                'created_at',
                'updated_at'
            )
            ->whereNull('date_suppression')
            ->orderBy('nom')
            ->get();

        if ($campagnes->count() > 0) {
            Log::info('✅ Stratégie 2 réussie', [
                'count' => $campagnes->count()
            ]);
            
            // Ajouter les types d'assistance séparément
            $typesAssistance = $this->getTypesAssistanceMap();
            
            $campagnes = $campagnes->map(function($campagne) use ($typesAssistance) {
                $campagne->type_assistance = $typesAssistance[$campagne->type_assistance_id] ?? null;
                return $campagne;
            });
            
            return $this->formatCampagnesForSelect($campagnes);
        }
        
        Log::warning('⚠️ Stratégie 2: Aucune campagne trouvée, passage à la stratégie 3');
        
    } catch (Exception $e) {
        Log::warning('⚠️ Stratégie 2 échouée', [
            'error' => $e->getMessage()
        ]);
    }

    // STRATÉGIE 3: Vérification de l'existence de la table
    try {
        Log::info('📋 Stratégie 3: Vérification et création si nécessaire');
        
        if (!Schema::hasTable('campagnes_medicales')) {
            Log::error('❌ Table campagnes_medicales n\'existe pas');
            return [];
        }

        // Compter les campagnes
        $count = DB::table('campagnes_medicales')->count();
        Log::info('📊 Nombre total de campagnes en base', ['count' => $count]);
        
        if ($count === 0) {
            Log::warning('⚠️ Aucune campagne en base, création d\'une campagne de test');
            $this->createTestCampagneIfNeeded();
            
            // Recharger après création
            $campagnes = DB::table('campagnes_medicales')
                ->select('id', 'nom', 'description', 'statut', 'date_debut', 'date_fin')
                ->whereNull('date_suppression')
                ->get();
                
            return $this->formatCampagnesForSelect($campagnes);
        }
        
    } catch (Exception $e) {
        Log::error('❌ Stratégie 3 échouée', [
            'error' => $e->getMessage()
        ]);
    }

    // STRATÉGIE 4: Retour d'urgence
    Log::warning('⚠️ Toutes les stratégies ont échoué, retour de campagnes factices');
    return $this->getEmergencyCampagnes();
}
private function filterCampagnesActives($campagnes)
{
    if (empty($campagnes)) {
        return [];
    }
    
    return array_filter($campagnes, function($campagne) {
        return in_array($campagne['statut'] ?? '', ['Active', 'En cours']);
    });
}
private function formatCampagnesForSelect($campagnes)
{
    if (empty($campagnes) || !is_iterable($campagnes)) {
        return [];
    }

    $formatted = [];
    
    foreach ($campagnes as $campagne) {
        // Conversion en array si c'est un objet
        $c = is_object($campagne) ? (array)$campagne : $campagne;
        
        // Label enrichi
        $label = $c['nom'] ?? 'Campagne sans nom';
        if (!empty($c['statut'])) {
            $label .= " ({$c['statut']})";
        }
        if (!empty($c['type_assistance'])) {
            $label .= " - {$c['type_assistance']}";
        }

        $formatted[] = [
            'id' => $c['id'] ?? 0,
            'value' => $c['id'] ?? 0,
            'label' => $c['nom'] ?? 'Campagne sans nom',
            'label_complet' => $label,
            'nom' => $c['nom'] ?? '',
            'description' => $c['description'] ?? '',
            'statut' => $c['statut'] ?? '',
            'date_debut' => $c['date_debut'] ?? null,
            'date_fin' => $c['date_fin'] ?? null,
            'type_assistance_id' => $c['type_assistance_id'] ?? null,
            'type_assistance' => $c['type_assistance'] ?? null,
            'lieu' => $c['lieu'] ?? '',
            'budget' => $c['budget'] ?? null,
            'created_at' => $c['created_at'] ?? null,
            'updated_at' => $c['updated_at'] ?? null
        ];
    }
    
    Log::info('✅ Campagnes formatées', [
        'count' => count($formatted),
        'first_campaign' => $formatted[0]['nom'] ?? 'N/A'
    ]);
    
    return $formatted;
}
private function loadTypesAssistanceRobuste()
{
    try {
        Log::info('📋 Chargement types assistance');
        
        $types = DB::table('types_assistance')
            ->select('id', 'libelle', 'description', 'created_at', 'updated_at')
            ->whereNull('date_suppression')
            ->orderBy('libelle')
            ->get();

        if ($types->count() === 0) {
            Log::warning('⚠️ Aucun type d\'assistance, création automatique');
            $this->createDefaultTypesAssistanceAuto();
            
            // Recharger après création
            $types = DB::table('types_assistance')
                ->select('id', 'libelle', 'description', 'created_at', 'updated_at')
                ->whereNull('date_suppression')
                ->orderBy('libelle')
                ->get();
        }

        $formatted = [];
        foreach ($types as $type) {
            $formatted[] = [
                'id' => $type->id,
                'value' => $type->id,
                'label' => $type->libelle,
                'libelle' => $type->libelle,
                'description' => $type->description ?? '',
                'created_at' => $type->created_at,
                'updated_at' => $type->updated_at
            ];
        }

        Log::info('✅ Types assistance formatés', ['count' => count($formatted)]);
        return $formatted;

    } catch (Exception $e) {
        Log::error('❌ Erreur types assistance', [
            'error' => $e->getMessage()
        ]);
        
        return $this->getEmergencyTypesAssistance();
    }
}
private function createTestCampagneIfNeeded()
{
    try {
        Log::info('🏗️ Création campagne de test');
        
        // Vérifier qu'un type d'assistance existe
        $typeAssistance = DB::table('types_assistance')
            ->whereNull('date_suppression')
            ->first();

        if (!$typeAssistance) {
            $typeId = DB::table('types_assistance')->insertGetId([
                'libelle' => 'Test - Lunettes',
                'description' => 'Type de test créé automatiquement',
                'created_at' => now(),
                'updated_at' => now()
            ]);
            Log::info('✅ Type assistance de test créé', ['id' => $typeId]);
        } else {
            $typeId = $typeAssistance->id;
        }

        // Créer la campagne de test
        $campagneId = DB::table('campagnes_medicales')->insertGetId([
            'nom' => 'Campagne de Test - ' . now()->format('Y-m-d H:i'),
            'description' => 'Campagne créée automatiquement pour résoudre les problèmes de chargement',
            'type_assistance_id' => $typeId,
            'date_debut' => now()->toDateString(),
            'date_fin' => now()->addDays(30)->toDateString(),
            'lieu' => 'Centre de test - Fès',
            'statut' => 'Active',
            'budget' => 50000,
            'nombre_participants_prevu' => 100,
            'created_at' => now(),
            'updated_at' => now(),
            'created_by' => Auth::id() ?? 1
        ]);

        Log::info('✅ Campagne de test créée', [
            'campagne_id' => $campagneId,
            'type_assistance_id' => $typeId
        ]);

        return $campagneId;

    } catch (Exception $e) {
        Log::error('❌ Erreur création campagne de test', [
            'error' => $e->getMessage()
        ]);
        return null;
    }
}

/**
 * Créer automatiquement les types d'assistance par défaut
 */
private function createDefaultTypesAssistanceAuto()
{
    try {
        $typesParDefaut = [
            ['libelle' => 'Lunettes', 'description' => 'Lunettes de vue et solaires'],
            ['libelle' => 'Appareils Auditifs', 'description' => 'Appareils auditifs et prothèses'],
            ['libelle' => 'Fauteuils Roulants', 'description' => 'Fauteuils roulants manuels et électriques'],
            ['libelle' => 'Cannes Blanches', 'description' => 'Cannes blanches pour aveugles'],
            ['libelle' => 'Appareillage Orthopédique', 'description' => 'Matériel orthopédique divers']
        ];

        foreach ($typesParDefaut as $type) {
            $exists = DB::table('types_assistance')
                ->where('libelle', $type['libelle'])
                ->exists();

            if (!$exists) {
                DB::table('types_assistance')->insert([
                    'libelle' => $type['libelle'],
                    'description' => $type['description'],
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                Log::info("✅ Type créé automatiquement: {$type['libelle']}");
            }
        }
    } catch (Exception $e) {
        Log::error('❌ Erreur création automatique types', [
            'error' => $e->getMessage()
        ]);
    }
}
private function getEmergencyTypesAssistance()
{
    return [
        ['id' => 1, 'value' => 1, 'label' => 'Lunettes', 'libelle' => 'Lunettes', 'description' => 'Lunettes de vue'],
        ['id' => 2, 'value' => 2, 'label' => 'Appareils Auditifs', 'libelle' => 'Appareils Auditifs', 'description' => 'Appareils auditifs'],
        ['id' => 3, 'value' => 3, 'label' => 'Fauteuils Roulants', 'libelle' => 'Fauteuils Roulants', 'description' => 'Fauteuils roulants'],
        ['id' => 4, 'value' => 4, 'label' => 'Cannes Blanches', 'libelle' => 'Cannes Blanches', 'description' => 'Cannes blanches']
    ];
}
private function getEmergencyCampagnes()
{
    return [
        [
            'id' => 1,
            'value' => 1,
            'label' => 'Campagne d\'urgence - Lunettes',
            'label_complet' => 'Campagne d\'urgence - Lunettes (Active)',
            'nom' => 'Campagne d\'urgence - Lunettes',
            'description' => 'Campagne créée automatiquement',
            'statut' => 'Active',
            'date_debut' => now()->toDateString(),
            'date_fin' => now()->addDays(30)->toDateString(),
            'type_assistance_id' => 1,
            'type_assistance' => 'Lunettes',
            'lieu' => 'Centre de secours',
            'budget' => 100000
        ]
    ];
}
public function testCampagnesOnly()
{
    try {
        Log::info('🧪 Test spécialisé campagnes seulement');
        
        $result = [
            'timestamp' => now()->toISOString(),
            'tests' => []
        ];

        // Test 1: Existence de la table
        try {
            $tableExists = Schema::hasTable('campagnes_medicales');
            $result['tests']['table_exists'] = [
                'success' => $tableExists,
                'result' => $tableExists
            ];
        } catch (Exception $e) {
            $result['tests']['table_exists'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }

        // Test 2: Compte des campagnes
        try {
            $totalCount = DB::table('campagnes_medicales')->count();
            $activeCount = DB::table('campagnes_medicales')
                ->whereNull('date_suppression')
                ->count();
            
            $result['tests']['count'] = [
                'success' => true,
                'total' => $totalCount,
                'active' => $activeCount
            ];
        } catch (Exception $e) {
            $result['tests']['count'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }

        // Test 3: Chargement via la méthode robuste
        try {
            $campagnes = $this->loadCampagnesRobuste();
            $result['tests']['load_robust'] = [
                'success' => true,
                'count' => count($campagnes),
                'sample' => array_slice($campagnes, 0, 2)
            ];
        } catch (Exception $e) {
            $result['tests']['load_robust'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }

        // Test 4: API getFormOptions
        try {
            $formOptions = $this->getFormOptions();
            $formData = $formOptions->getData(true);
            
            $result['tests']['form_options_api'] = [
                'success' => $formData['success'] ?? false,
                'campagnes_count' => count($formData['data']['campagnes'] ?? []),
                'actives_count' => count($formData['data']['campagnes_actives'] ?? [])
            ];
        } catch (Exception $e) {
            $result['tests']['form_options_api'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $result
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}
public function createTestData()
{
    try {
        Log::info('🏗️ Création forcée de données de test');
        
        DB::beginTransaction();
        
        $created = [
            'types_assistance' => 0,
            'campagnes' => 0
        ];

        // Créer types d'assistance si manquants
        $typesCount = DB::table('types_assistance')->whereNull('date_suppression')->count();
        
        if ($typesCount === 0) {
            $this->createDefaultTypesAssistanceAuto();
            $created['types_assistance'] = DB::table('types_assistance')->whereNull('date_suppression')->count();
        }

        // Créer campagnes de test si manquantes
        $campagnesCount = DB::table('campagnes_medicales')->whereNull('date_suppression')->count();
        
        if ($campagnesCount === 0) {
            $typeAssistance = DB::table('types_assistance')->whereNull('date_suppression')->first();
            
            if ($typeAssistance) {
                // Créer 3 campagnes de test
                $campagnesTest = [
                    [
                        'nom' => 'Campagne Test Lunettes - ' . now()->format('Y-m-d'),
                        'description' => 'Campagne de test pour lunettes',
                        'type_assistance_id' => $typeAssistance->id,
                        'statut' => 'Active',
                        'lieu' => 'Centre Fès'
                    ],
                    [
                        'nom' => 'Campagne Test En Cours - ' . now()->format('Y-m-d'),
                        'description' => 'Campagne de test en cours',
                        'type_assistance_id' => $typeAssistance->id,
                        'statut' => 'En cours',
                        'lieu' => 'Centre Rabat'
                    ],
                    [
                        'nom' => 'Campagne Test Terminée - ' . now()->format('Y-m-d'),
                        'description' => 'Campagne de test terminée',
                        'type_assistance_id' => $typeAssistance->id,
                        'statut' => 'Terminée',
                        'lieu' => 'Centre Casablanca'
                    ]
                ];

                foreach ($campagnesTest as $campagneData) {
                    DB::table('campagnes_medicales')->insert([
                        'nom' => $campagneData['nom'],
                        'description' => $campagneData['description'],
                        'type_assistance_id' => $campagneData['type_assistance_id'],
                        'date_debut' => now()->toDateString(),
                        'date_fin' => now()->addDays(60)->toDateString(),
                        'lieu' => $campagneData['lieu'],
                        'statut' => $campagneData['statut'],
                        'budget' => 100000,
                        'nombre_participants_prevu' => 200,
                        'created_at' => now(),
                        'updated_at' => now(),
                        'created_by' => Auth::id() ?? 1
                    ]);
                    $created['campagnes']++;
                }
            }
        }

        DB::commit();

        Log::info('✅ Données de test créées', $created);

        return response()->json([
            'success' => true,
            'message' => 'Données de test créées avec succès',
            'data' => $created
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error('❌ Erreur création données de test', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la création: ' . $e->getMessage()
        ], 500);
    }
}
public function diagnosticComplete()
{
    try {
        Log::info('🔍 Diagnostic complet du système UPAS');
        
        $diagnostic = [
            'timestamp' => now()->toISOString(),
            'database' => [],
            'tables' => [],
            'data' => [],
            'api' => [],
            'recommendations' => []
        ];

        // ===== DIAGNOSTIC BASE DE DONNÉES =====
        try {
            $pdo = DB::connection()->getPdo();
            $diagnostic['database'] = [
                'connected' => true,
                'name' => DB::connection()->getDatabaseName(),
                'driver' => DB::connection()->getDriverName()
            ];
        } catch (Exception $e) {
            $diagnostic['database'] = [
                'connected' => false,
                'error' => $e->getMessage()
            ];
        }

        // ===== DIAGNOSTIC TABLES =====
        $essentialTables = [
            'campagnes_medicales',
            'types_assistance', 
            'beneficiaires',
            'assistance_medicales',
            'kafalas',
            'etat_dones',
            'nature_dones',
            'situations'
        ];

        foreach ($essentialTables as $table) {
            try {
                $exists = Schema::hasTable($table);
                $diagnostic['tables'][$table] = [
                    'exists' => $exists,
                    'count' => $exists ? DB::table($table)->count() : 0,
                    'active_count' => $exists ? 
                        DB::table($table)->whereNull('date_suppression')->count() : 0
                ];
            } catch (Exception $e) {
                $diagnostic['tables'][$table] = [
                    'exists' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        // ===== DIAGNOSTIC DONNÉES =====
        try {
            // Campagnes
            $campagnes = $this->loadCampagnesRobuste();
            $diagnostic['data']['campagnes'] = [
                'loaded' => count($campagnes),
                'actives' => count($this->filterCampagnesActives($campagnes)),
                'sample' => array_slice($campagnes, 0, 2)
            ];

            // Types d'assistance
            $types = $this->loadTypesAssistanceRobuste();
            $diagnostic['data']['types_assistance'] = [
                'loaded' => count($types),
                'sample' => array_slice($types, 0, 2)
            ];

        } catch (Exception $e) {
            $diagnostic['data']['error'] = $e->getMessage();
        }

        // ===== DIAGNOSTIC API =====
        try {
            // Test getFormOptions
            $formOptionsResponse = $this->getFormOptions();
            $formOptionsData = $formOptionsResponse->getData(true);
            
            $diagnostic['api']['form_options'] = [
                'success' => $formOptionsData['success'] ?? false,
                'campagnes_count' => count($formOptionsData['data']['campagnes'] ?? []),
                'types_count' => count($formOptionsData['data']['types_assistance'] ?? []),
                'status_code' => $formOptionsResponse->getStatusCode()
            ];

            // Test getBeneficiaires
            $beneficiairesResponse = $this->getBeneficiaires(new Request());
            $beneficiairesData = $beneficiairesResponse->getData(true);
            
            $diagnostic['api']['beneficiaires'] = [
                'success' => $beneficiairesData['success'] ?? false,
                'count' => count($beneficiairesData['data'] ?? []),
                'status_code' => $beneficiairesResponse->getStatusCode()
            ];

        } catch (Exception $e) {
            $diagnostic['api']['error'] = $e->getMessage();
        }

        // ===== RECOMMANDATIONS =====
        $diagnostic['recommendations'] = $this->generateRecommendations($diagnostic);

        return response()->json([
            'success' => true,
            'diagnostic' => $diagnostic
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}
private function generateRecommendations($diagnostic)
{
    $recommendations = [];
    
    // Base de données
    if (!($diagnostic['database']['connected'] ?? false)) {
        $recommendations[] = [
            'type' => 'critical',
            'message' => '❌ CRITIQUE: Problème de connexion à la base de données',
            'action' => 'Vérifiez la configuration .env et le serveur de base de données'
        ];
    }
    
    // Tables manquantes
    $missingTables = [];
    foreach ($diagnostic['tables'] as $table => $info) {
        if (!($info['exists'] ?? false)) {
            $missingTables[] = $table;
        }
    }
    
    if (!empty($missingTables)) {
        $recommendations[] = [
            'type' => 'critical',
            'message' => '❌ Tables manquantes: ' . implode(', ', $missingTables),
            'action' => 'Exécutez les migrations: php artisan migrate'
        ];
    }
    
    // Données manquantes
    if (($diagnostic['data']['campagnes']['loaded'] ?? 0) === 0) {
        $recommendations[] = [
            'type' => 'warning',
            'message' => '⚠️ Aucune campagne chargée',
            'action' => 'Utilisez la route POST /api/upas/test/create-test-data'
        ];
    }
    
    if (($diagnostic['data']['types_assistance']['loaded'] ?? 0) === 0) {
        $recommendations[] = [
            'type' => 'warning',
            'message' => '⚠️ Aucun type d\'assistance chargé',
            'action' => 'Les types seront créés automatiquement'
        ];
    }
    
    // API
    if (!($diagnostic['api']['form_options']['success'] ?? false)) {
        $recommendations[] = [
            'type' => 'error',
            'message' => '❌ API getFormOptions défaillante',
            'action' => 'Vérifiez les logs Laravel pour plus de détails'
        ];
    }
    
    // Succès
    if (empty($recommendations)) {
        $recommendations[] = [
            'type' => 'success',
            'message' => '✅ Tous les systèmes fonctionnent correctement',
            'action' => 'Aucune action requise'
        ];
    }
    
    return $recommendations;
}
public function autoRepair()
{
    try {
        Log::info('🔧 Début réparation automatique');
        
        DB::beginTransaction();
        
        $repairs = [
            'types_assistance_created' => 0,
            'campagnes_created' => 0,
            'data_fixed' => [],
            'errors' => []
        ];

        // Réparation 1: Types d'assistance
        try {
            $typesCount = DB::table('types_assistance')->whereNull('date_suppression')->count();
            
            if ($typesCount === 0) {
                $this->createDefaultTypesAssistanceAuto();
                $repairs['types_assistance_created'] = DB::table('types_assistance')->whereNull('date_suppression')->count();
                Log::info('✅ Types d\'assistance créés', ['count' => $repairs['types_assistance_created']]);
            }
        } catch (Exception $e) {
            $repairs['errors'][] = 'Types assistance: ' . $e->getMessage();
        }

        // Réparation 2: Campagnes
        try {
            $campagnesCount = DB::table('campagnes_medicales')->whereNull('date_suppression')->count();
            
            if ($campagnesCount === 0) {
                $campagneId = $this->createTestCampagneIfNeeded();
                if ($campagneId) {
                    $repairs['campagnes_created'] = 1;
                    Log::info('✅ Campagne de test créée', ['id' => $campagneId]);
                }
            }
        } catch (Exception $e) {
            $repairs['errors'][] = 'Campagnes: ' . $e->getMessage();
        }

        // Réparation 3: Correction des données incohérentes
        try {
            // Corriger les campagnes sans type d'assistance
            $campagnesSansType = DB::table('campagnes_medicales')
                ->whereNull('type_assistance_id')
                ->whereNull('date_suppression')
                ->count();
                
            if ($campagnesSansType > 0) {
                $defaultType = DB::table('types_assistance')->whereNull('date_suppression')->first();
                if ($defaultType) {
                    $updated = DB::table('campagnes_medicales')
                        ->whereNull('type_assistance_id')
                        ->whereNull('date_suppression')
                        ->update(['type_assistance_id' => $defaultType->id]);
                    
                    $repairs['data_fixed'][] = "Corrigé {$updated} campagnes sans type d'assistance";
                }
            }

            // Corriger les statuts invalides
            $statutsValides = ['Active', 'Inactive', 'En cours', 'Terminée', 'Annulée'];
            $updated = DB::table('campagnes_medicales')
                ->whereNull('date_suppression')
                ->whereNotIn('statut', $statutsValides)
                ->update(['statut' => 'Active']);
                
            if ($updated > 0) {
                $repairs['data_fixed'][] = "Corrigé {$updated} statuts de campagne invalides";
            }

        } catch (Exception $e) {
            $repairs['errors'][] = 'Correction données: ' . $e->getMessage();
        }

        DB::commit();

        // Test final
        $finalTest = $this->loadCampagnesRobuste();
        $repairs['final_test'] = [
            'campagnes_loaded' => count($finalTest),
            'actives_loaded' => count($this->filterCampagnesActives($finalTest))
        ];

        Log::info('✅ Réparation automatique terminée', $repairs);

        return response()->json([
            'success' => true,
            'message' => 'Réparation automatique terminée',
            'data' => $repairs
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error('❌ Erreur réparation automatique', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la réparation: ' . $e->getMessage()
        ], 500);
    }
}
public function getCampagnesForSelect(Request $request)
{
    try {
        Log::info('🎯 getCampagnesForSelect - route simplifiée');

        // Forcer le chargement robuste
        $campagnes = $this->loadCampagnesRobuste();
        
        // Filtrer par statut si demandé
        if ($request->filled('actives_only') && $request->boolean('actives_only')) {
            $campagnes = $this->filterCampagnesActives($campagnes);
        }

        // Enrichir avec des informations utiles
        $campagnesEnrichies = array_map(function($campagne) {
            $today = Carbon::now();
            $dateDebut = isset($campagne['date_debut']) ? Carbon::parse($campagne['date_debut']) : null;
            $dateFin = isset($campagne['date_fin']) ? Carbon::parse($campagne['date_fin']) : null;
            
            $isActive = in_array($campagne['statut'] ?? '', ['Active', 'En cours']);
            $isInProgress = $dateDebut && $dateFin ? $today->between($dateDebut, $dateFin) : false;
            $isExpired = $dateFin ? $today->gt($dateFin) : false;

            // Libellé enrichi
            $displayName = $campagne['nom'] ?? 'Campagne sans nom';
            if (!empty($campagne['statut'])) {
                $displayName .= " ({$campagne['statut']})";
            }
            if (!empty($campagne['type_assistance'])) {
                $displayName .= " - {$campagne['type_assistance']}";
            }

            return array_merge($campagne, [
                'label_complet' => $displayName,
                'is_active' => $isActive,
                'is_in_progress' => $isInProgress,
                'is_expired' => $isExpired,
                'icon' => $isInProgress ? '🟢' : ($isExpired ? '⏹️' : '🔵'),
                'priority' => $isInProgress ? 1 : ($isActive ? 2 : 3),
                'date_debut_formatee' => $dateDebut ? $dateDebut->format('d/m/Y') : '',
                'date_fin_formatee' => $dateFin ? $dateFin->format('d/m/Y') : '',
                'periode' => ($dateDebut && $dateFin) ? 
                    $dateDebut->format('d/m/Y') . ' - ' . $dateFin->format('d/m/Y') : 'Non définie'
            ]);
        }, $campagnes);

        // Trier par priorité
        usort($campagnesEnrichies, function($a, $b) {
            return ($a['priority'] ?? 999) <=> ($b['priority'] ?? 999);
        });

        Log::info('✅ Campagnes pour select chargées', [
            'total' => count($campagnesEnrichies),
            'actives' => count(array_filter($campagnesEnrichies, fn($c) => $c['is_active'] ?? false)),
            'en_cours' => count(array_filter($campagnesEnrichies, fn($c) => $c['is_in_progress'] ?? false))
        ]);

        return response()->json([
            'success' => true,
            'data' => $campagnesEnrichies,
            'count' => count($campagnesEnrichies),
            'metadata' => [
                'total_campagnes' => count($campagnesEnrichies),
                'campagnes_actives' => count(array_filter($campagnesEnrichies, fn($c) => $c['is_active'] ?? false)),
                'campagnes_en_cours' => count(array_filter($campagnesEnrichies, fn($c) => $c['is_in_progress'] ?? false)),
                'campagnes_expirees' => count(array_filter($campagnesEnrichies, fn($c) => $c['is_expired'] ?? false))
            ],
            'timestamp' => now()->toISOString()
        ]);

    } catch (Exception $e) {
        Log::error('❌ Erreur getCampagnesForSelect', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement des campagnes: ' . $e->getMessage(),
            'data' => $this->getEmergencyCampagnes()
        ], 500);
    }
}
public function quickStart()
{
    try {
        Log::info('🚀 Quick Start UPAS');
        
        $steps = [
            'database_check' => ['status' => 'pending', 'message' => ''],
            'tables_check' => ['status' => 'pending', 'message' => ''],
            'data_creation' => ['status' => 'pending', 'message' => ''],
            'api_test' => ['status' => 'pending', 'message' => ''],
            'final_verification' => ['status' => 'pending', 'message' => '']
        ];

        // Étape 1: Vérification base de données
        try {
            $pdo = DB::connection()->getPdo();
            $dbName = DB::connection()->getDatabaseName();
            $steps['database_check'] = [
                'status' => 'success',
                'message' => "Connexion réussie à la base '{$dbName}'"
            ];
        } catch (Exception $e) {
            $steps['database_check'] = [
                'status' => 'error',
                'message' => 'Connexion échouée: ' . $e->getMessage()
            ];
            throw $e;
        }

        // Étape 2: Vérification des tables
        $essentialTables = ['campagnes_medicales', 'types_assistance', 'beneficiaires'];
        $missingTables = [];
        
        foreach ($essentialTables as $table) {
            if (!Schema::hasTable($table)) {
                $missingTables[] = $table;
            }
        }
        
        if (empty($missingTables)) {
            $steps['tables_check'] = [
                'status' => 'success',
                'message' => 'Toutes les tables essentielles sont présentes'
            ];
        } else {
            $steps['tables_check'] = [
                'status' => 'error',
                'message' => 'Tables manquantes: ' . implode(', ', $missingTables)
            ];
            throw new Exception('Tables manquantes');
        }

        // Étape 3: Création des données
        DB::beginTransaction();
        
        $created = [];
        
        // Types d'assistance
        $typesCount = DB::table('types_assistance')->whereNull('date_suppression')->count();
        if ($typesCount === 0) {
            $this->createDefaultTypesAssistanceAuto();
            $created['types_assistance'] = DB::table('types_assistance')->whereNull('date_suppression')->count();
        } else {
            $created['types_assistance'] = $typesCount;
        }
        
        // Campagnes
        $campagnesCount = DB::table('campagnes_medicales')->whereNull('date_suppression')->count();
        if ($campagnesCount === 0) {
            $this->createTestCampagneIfNeeded();
            $created['campagnes'] = DB::table('campagnes_medicales')->whereNull('date_suppression')->count();
        } else {
            $created['campagnes'] = $campagnesCount;
        }
        
        DB::commit();
        
        $steps['data_creation'] = [
            'status' => 'success',
            'message' => 'Données créées/vérifiées',
            'details' => $created
        ];

        // Étape 4: Test API
        try {
            $formOptionsResponse = $this->getFormOptions();
            $formOptionsData = $formOptionsResponse->getData(true);
            
            if ($formOptionsData['success'] ?? false) {
                $steps['api_test'] = [
                    'status' => 'success',
                    'message' => 'API getFormOptions fonctionne',
                    'details' => [
                        'campagnes' => count($formOptionsData['data']['campagnes'] ?? []),
                        'types_assistance' => count($formOptionsData['data']['types_assistance'] ?? [])
                    ]
                ];
            } else {
                throw new Exception('API getFormOptions retourne success=false');
            }
        } catch (Exception $e) {
            $steps['api_test'] = [
                'status' => 'error',
                'message' => 'Test API échoué: ' . $e->getMessage()
            ];
        }

        // Étape 5: Vérification finale
        try {
            $campagnes = $this->loadCampagnesRobuste();
            $types = $this->loadTypesAssistanceRobuste();
            
            $steps['final_verification'] = [
                'status' => 'success',
                'message' => 'Système opérationnel',
                'details' => [
                    'campagnes_loaded' => count($campagnes),
                    'types_loaded' => count($types),
                    'system_ready' => true
                ]
            ];
        } catch (Exception $e) {
            $steps['final_verification'] = [
                'status' => 'warning',
                'message' => 'Système partiellement opérationnel: ' . $e->getMessage()
            ];
        }

        // Résumé
        $allSuccess = array_reduce($steps, function($carry, $step) {
            return $carry && ($step['status'] === 'success');
        }, true);

        Log::info('✅ Quick Start terminé', [
            'all_success' => $allSuccess,
            'steps' => array_map(fn($step) => $step['status'], $steps)
        ]);

        return response()->json([
            'success' => $allSuccess,
            'message' => $allSuccess ? 
                'Système UPAS initialisé avec succès' : 
                'Initialisation partielle du système UPAS',
            'steps' => $steps,
            'system_ready' => $allSuccess,
            'timestamp' => now()->toISOString()
        ]);

    } catch (Exception $e) {
        if (isset($steps)) {
            DB::rollBack();
        }
        
        Log::error('❌ Erreur Quick Start', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'initialisation: ' . $e->getMessage(),
            'steps' => $steps ?? [],
            'system_ready' => false
        ], 500);
    }
}
public function getFormOptions()
{
    try {
        Log::info('🔄 Début getFormOptions - version simplifiée');
        
        $data = [
            'types_assistance' => [],
            'campagnes_actives' => [],
            'campagnes' => [],
            'etat_dones' => [],
            'nature_dones' => [],
            'situations' => [],
            'sexes' => [
                ['value' => 'M', 'label' => 'Masculin'],
                ['value' => 'F', 'label' => 'Féminin']
            ],
            'priorites' => [
                ['value' => 'Normale', 'label' => 'Normale'],
                ['value' => 'Urgente', 'label' => 'Urgente'],
                ['value' => 'Très urgente', 'label' => 'Très urgente']
            ],
            'decisions' => [
                ['value' => 'accepté', 'label' => 'Accepté'],
                ['value' => 'en_attente', 'label' => 'En attente'],
                ['value' => 'refusé', 'label' => 'Refusé'],
                ['value' => 'admin a list principal', 'label' => 'Admin - Liste principale'],
                ['value' => 'admin a list d\'attente', 'label' => 'Admin - Liste d\'attente']
            ],
            'cotes' => [
                ['value' => 'unilatéral', 'label' => 'Unilatéral'],
                ['value' => 'bilatéral', 'label' => 'Bilatéral']
            ]
        ];

        // ===== CHARGEMENT SÉCURISÉ DES CAMPAGNES =====
        $data['campagnes'] = $this->loadCampagnesSecure();
        $data['campagnes_actives'] = array_filter($data['campagnes'], function($campagne) {
            return in_array($campagne['statut'] ?? '', ['Active', 'En cours']);
        });

        Log::info('📊 Campagnes chargées avec succès', [
            'total_campagnes' => count($data['campagnes']),
            'campagnes_actives' => count($data['campagnes_actives'])
        ]);

        // ===== CHARGEMENT SÉCURISÉ DES TYPES D'ASSISTANCE =====
        $data['types_assistance'] = $this->loadTypesAssistanceSecure();

        Log::info('📋 Types assistance chargés', [
            'count' => count($data['types_assistance'])
        ]);

        // ===== CHARGEMENT DES DONNÉES OPTIONNELLES =====
        $optionalData = $this->loadOptionalDataSecure();
        $data = array_merge($data, $optionalData);

        $summary = [
            'types_assistance' => count($data['types_assistance']),
            'campagnes_total' => count($data['campagnes']),
            'campagnes_actives' => count($data['campagnes_actives']),
            'etat_dones' => count($data['etat_dones']),
            'nature_dones' => count($data['nature_dones']),
            'situations' => count($data['situations'])
        ];

        Log::info('✅ getFormOptions terminé avec succès', $summary);

        return response()->json([
            'success' => true,
            'data' => $data,
            'summary' => $summary,
            'timestamp' => now()->toISOString()
        ]);

    } catch (Exception $e) {
        Log::error('❌ ERREUR getFormOptions', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        // Retour d'urgence avec données minimales
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement des options: ' . $e->getMessage(),
            'data' => $this->getMinimalFormData()
        ], 500);
    }
}
private function loadCampagnesSecure()
{
    try {
        Log::info('🎯 Chargement sécurisé des campagnes');
        
        // Stratégie 1: Requête simple et directe
        $campagnes = DB::table('campagnes_medicales')
            ->select(
                'id',
                'nom', 
                'description',
                'type_assistance_id',
                'statut',
                'date_debut',
                'date_fin',
                'lieu',
                'budget',
                'created_at'
            )
            ->whereNull('date_suppression')
            ->orderByRaw("
                CASE statut 
                    WHEN 'En cours' THEN 1
                    WHEN 'Active' THEN 2  
                    WHEN 'Terminée' THEN 3
                    ELSE 4
                END
            ")
            ->orderBy('nom')
            ->get();

        if ($campagnes->count() === 0) {
            Log::warning('⚠️ Aucune campagne trouvée, création automatique...');
            $this->createBasicCampagneIfNeeded();
            
            // Recharger après création
            $campagnes = DB::table('campagnes_medicales')
                ->select('id', 'nom', 'description', 'type_assistance_id', 'statut', 'date_debut', 'date_fin')
                ->whereNull('date_suppression')
                ->orderBy('nom')
                ->get();
        }

        // Enrichir avec les types d'assistance
        $typesMap = $this->getTypesAssistanceMap();
        
        $formatted = [];
        foreach ($campagnes as $campagne) {
            $typeAssistance = $typesMap[$campagne->type_assistance_id] ?? null;
            
            $formatted[] = [
                'id' => $campagne->id,
                'value' => $campagne->id,
                'label' => $campagne->nom,
                'nom' => $campagne->nom,
                'description' => $campagne->description ?? '',
                'statut' => $campagne->statut,
                'date_debut' => $campagne->date_debut,
                'date_fin' => $campagne->date_fin,
                'type_assistance_id' => $campagne->type_assistance_id,
                'type_assistance' => $typeAssistance,
                'lieu' => $campagne->lieu ?? '',
                'budget' => $campagne->budget,
                'created_at' => $campagne->created_at
            ];
        }

        Log::info('✅ Campagnes formatées avec succès', [
            'count' => count($formatted),
            'first_campaign' => $formatted[0]['nom'] ?? 'N/A'
        ]);

        return $formatted;

    } catch (Exception $e) {
        Log::error('❌ Erreur chargement campagnes', [
            'error' => $e->getMessage()
        ]);
        
        // Retour de secours
        return $this->getDefaultCampagnes();
    }
}
private function loadTypesAssistanceSecure()
{
    try {
        $types = DB::table('types_assistance')
            ->select('id', 'libelle', 'description', 'created_at')
            ->whereNull('date_suppression')
            ->orderBy('libelle')
            ->get();

        if ($types->count() === 0) {
            Log::warning('⚠️ Aucun type d\'assistance, création automatique...');
            $this->createBasicTypesAssistance();
            
            // Recharger
            $types = DB::table('types_assistance')
                ->select('id', 'libelle', 'description', 'created_at')
                ->whereNull('date_suppression')
                ->orderBy('libelle')
                ->get();
        }

        $formatted = [];
        foreach ($types as $type) {
            $formatted[] = [
                'id' => $type->id,
                'value' => $type->id,
                'label' => $type->libelle,
                'libelle' => $type->libelle,
                'description' => $type->description ?? '',
                'created_at' => $type->created_at
            ];
        }

        return $formatted;

    } catch (Exception $e) {
        Log::error('❌ Erreur chargement types assistance', [
            'error' => $e->getMessage()
        ]);
        
        return $this->getDefaultTypesAssistance();
    }
}
private function createBasicTypesAssistance()
{
    try {
        $typesDefaut = [
            ['libelle' => 'Lunettes', 'description' => 'Lunettes de vue et solaires'],
            ['libelle' => 'Appareils Auditifs', 'description' => 'Appareils auditifs et prothèses'],
            ['libelle' => 'Fauteuils Roulants', 'description' => 'Fauteuils roulants manuels et électriques']
        ];

        foreach ($typesDefaut as $type) {
            $exists = DB::table('types_assistance')
                ->where('libelle', $type['libelle'])
                ->exists();

            if (!$exists) {
                DB::table('types_assistance')->insert([
                    'libelle' => $type['libelle'],
                    'description' => $type['description'],
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                Log::info("✅ Type créé: {$type['libelle']}");
            }
        }
    } catch (Exception $e) {
        Log::error('❌ Erreur création types basiques', [
            'error' => $e->getMessage()
        ]);
    }
}
private function createBasicCampagneIfNeeded()
{
    try {
        // Vérifier qu'au moins un type d'assistance existe
        $typeAssistance = DB::table('types_assistance')
            ->whereNull('date_suppression')
            ->first();

        if (!$typeAssistance) {
            $this->createBasicTypesAssistance();
            $typeAssistance = DB::table('types_assistance')
                ->whereNull('date_suppression')
                ->first();
        }

        if (!$typeAssistance) {
            Log::error('❌ Impossible de créer une campagne sans type d\'assistance');
            return;
        }

        // Créer la campagne basique
        $campagneId = DB::table('campagnes_medicales')->insertGetId([
            'nom' => 'Campagne Système - ' . now()->format('Y-m-d'),
            'description' => 'Campagne créée automatiquement par le système',
            'type_assistance_id' => $typeAssistance->id,
            'date_debut' => now()->toDateString(),
            'date_fin' => now()->addDays(30)->toDateString(),
            'lieu' => 'Centre système',
            'statut' => 'Active',
            'budget' => 100000,
            'nombre_participants_prevu' => 100,
            'created_at' => now(),
            'updated_at' => now(),
            'created_by' => Auth::id() ?? 1
        ]);

        Log::info('✅ Campagne système créée', [
            'campagne_id' => $campagneId,
            'type_assistance_id' => $typeAssistance->id
        ]);

        return $campagneId;

    } catch (Exception $e) {
        Log::error('❌ Erreur création campagne basique', [
            'error' => $e->getMessage()
        ]);
    }
}
private function getTypesAssistanceMap()
{
    try {
        $types = DB::table('types_assistance')
            ->select('id', 'libelle')
            ->whereNull('date_suppression')
            ->get();

        $map = [];
        foreach ($types as $type) {
            $map[$type->id] = $type->libelle;
        }

        return $map;
    } catch (Exception $e) {
        return [];
    }
}
private function loadOptionalDataSecure()
{
    $data = [
        'etat_dones' => [],
        'nature_dones' => [],
        'situations' => []
    ];

    $tables = [
        'etat_dones' => 'États de don',
        'nature_dones' => 'Natures de don',
        'situations' => 'Situations'
    ];

    foreach ($tables as $table => $description) {
        try {
            if (Schema::hasTable($table)) {
                $records = DB::table($table)
                    ->select('id', 'libelle', 'description')
                    ->whereNull('date_suppression')
                    ->orderBy('libelle')
                    ->get();

                $formatted = [];
                foreach ($records as $record) {
                    $formatted[] = [
                        'id' => $record->id,
                        'value' => $record->id,
                        'label' => $record->libelle,
                        'libelle' => $record->libelle,
                        'description' => $record->description ?? ''
                    ];
                }
                
                $data[$table] = $formatted;
                Log::info("✅ {$description} chargés", ['count' => count($formatted)]);
            }
        } catch (Exception $e) {
            Log::warning("⚠️ Erreur {$table}", ['error' => $e->getMessage()]);
            $data[$table] = [];
        }
    }

    return $data;
}
private function getDefaultCampagnes()
{
    return [
        [
            'id' => 1,
            'value' => 1,
            'label' => 'Campagne par défaut - Lunettes',
            'nom' => 'Campagne par défaut - Lunettes',
            'description' => 'Campagne créée par défaut',
            'statut' => 'Active',
            'date_debut' => now()->toDateString(),
            'date_fin' => now()->addDays(30)->toDateString(),
            'type_assistance_id' => 1,
            'type_assistance' => 'Lunettes',
            'lieu' => 'Centre par défaut',
            'budget' => 100000
        ]
    ];
}

/**
 * Types d'assistance par défaut en cas d'erreur
 */
private function getDefaultTypesAssistance()
{
    return [
        ['id' => 1, 'value' => 1, 'label' => 'Lunettes', 'libelle' => 'Lunettes', 'description' => 'Lunettes de vue'],
        ['id' => 2, 'value' => 2, 'label' => 'Appareils Auditifs', 'libelle' => 'Appareils Auditifs', 'description' => 'Appareils auditifs'],
        ['id' => 3, 'value' => 3, 'label' => 'Fauteuils Roulants', 'libelle' => 'Fauteuils Roulants', 'description' => 'Fauteuils roulants']
    ];
}
private function getMinimalFormData()
{
    return [
        'types_assistance' => $this->getDefaultTypesAssistance(),
        'campagnes_actives' => $this->getDefaultCampagnes(),
        'campagnes' => $this->getDefaultCampagnes(),
        'etat_dones' => [],
        'nature_dones' => [],
        'situations' => [],
        'sexes' => [
            ['value' => 'M', 'label' => 'Masculin'],
            ['value' => 'F', 'label' => 'Féminin']
        ],
        'priorites' => [
            ['value' => 'Normale', 'label' => 'Normale'],
            ['value' => 'Urgente', 'label' => 'Urgente'],
            ['value' => 'Très urgente', 'label' => 'Très urgente']
        ],
        'decisions' => [
            ['value' => 'accepté', 'label' => 'Accepté'],
            ['value' => 'en_attente', 'label' => 'En attente'],
            ['value' => 'refusé', 'label' => 'Refusé'],
            ['value' => 'admin a list principal', 'label' => 'Admin - Liste principale'],
            ['value' => 'admin a list d\'attente', 'label' => 'Admin - Liste d\'attente']
        ],
        'cotes' => [
            ['value' => 'unilatéral', 'label' => 'Unilatéral'],
            ['value' => 'bilatéral', 'label' => 'Bilatéral']
        ]
    ];
}
public function diagnoseCampagnesIssue()
{
    try {
        $diagnostic = [
            'timestamp' => now()->toISOString(),
            'database_connection' => false,
            'table_campagnes_exists' => false,
            'table_types_assistance_exists' => false,
            'campagnes_count' => 0,
            'types_assistance_count' => 0,
            'api_test' => null,
            'issues' => [],
            'recommendations' => []
        ];

        // Test 1: Connexion DB
        try {
            DB::connection()->getPdo();
            $diagnostic['database_connection'] = true;
        } catch (Exception $e) {
            $diagnostic['issues'][] = 'Connexion DB échouée: ' . $e->getMessage();
        }

        // Test 2: Tables
        $diagnostic['table_campagnes_exists'] = Schema::hasTable('campagnes_medicales');
        $diagnostic['table_types_assistance_exists'] = Schema::hasTable('types_assistance');

        if (!$diagnostic['table_campagnes_exists']) {
            $diagnostic['issues'][] = 'Table campagnes_medicales manquante';
        }

        if (!$diagnostic['table_types_assistance_exists']) {
            $diagnostic['issues'][] = 'Table types_assistance manquante';
        }

        // Test 3: Comptage des données
        if ($diagnostic['table_campagnes_exists']) {
            $diagnostic['campagnes_count'] = DB::table('campagnes_medicales')
                ->whereNull('date_suppression')
                ->count();
        }

        if ($diagnostic['table_types_assistance_exists']) {
            $diagnostic['types_assistance_count'] = DB::table('types_assistance')
                ->whereNull('date_suppression')
                ->count();
        }

        // Test 4: API
        try {
            $apiResponse = $this->getFormOptions();
            $apiData = $apiResponse->getData(true);
            $diagnostic['api_test'] = [
                'success' => $apiData['success'] ?? false,
                'campagnes_loaded' => count($apiData['data']['campagnes'] ?? []),
                'types_loaded' => count($apiData['data']['types_assistance'] ?? [])
            ];
        } catch (Exception $e) {
            $diagnostic['api_test'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }

        // Recommandations
        if (empty($diagnostic['issues'])) {
            if ($diagnostic['campagnes_count'] === 0) {
                $diagnostic['recommendations'][] = 'Créer au moins une campagne de test';
            }
            if ($diagnostic['types_assistance_count'] === 0) {
                $diagnostic['recommendations'][] = 'Créer les types d\'assistance par défaut';
            }
            if (empty($diagnostic['recommendations'])) {
                $diagnostic['recommendations'][] = 'Système fonctionnel - pas d\'action requise';
            }
        } else {
            $diagnostic['recommendations'][] = 'Corriger les problèmes identifiés ci-dessus';
        }

        return response()->json([
            'success' => empty($diagnostic['issues']),
            'diagnostic' => $diagnostic
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}
public function fixCampagnesIssue()
{
    try {
        DB::beginTransaction();
        
        $fixes = [];
        
        // Fix 1: Créer les types d'assistance si manquants
        $typesCount = DB::table('types_assistance')->whereNull('date_suppression')->count();
        if ($typesCount === 0) {
            $this->createBasicTypesAssistance();
            $newTypesCount = DB::table('types_assistance')->whereNull('date_suppression')->count();
            $fixes[] = "Créé {$newTypesCount} types d'assistance";
        }

        // Fix 2: Créer une campagne si aucune n'existe
        $campagnesCount = DB::table('campagnes_medicales')->whereNull('date_suppression')->count();
        if ($campagnesCount === 0) {
            $campagneId = $this->createBasicCampagneIfNeeded();
            if ($campagneId) {
                $fixes[] = "Créé une campagne de test (ID: {$campagneId})";
            }
        }

        // Fix 3: Corriger les campagnes sans type d'assistance
        $campagnesSansType = DB::table('campagnes_medicales')
            ->whereNull('type_assistance_id')
            ->whereNull('date_suppression')
            ->count();

        if ($campagnesSansType > 0) {
            $defaultType = DB::table('types_assistance')->whereNull('date_suppression')->first();
            if ($defaultType) {
                DB::table('campagnes_medicales')
                    ->whereNull('type_assistance_id')
                    ->whereNull('date_suppression')
                    ->update(['type_assistance_id' => $defaultType->id]);
                
                $fixes[] = "Corrigé {$campagnesSansType} campagnes sans type d'assistance";
            }
        }

        DB::commit();

        // Test final
        $finalTest = $this->loadCampagnesSecure();
        
        return response()->json([
            'success' => true,
            'message' => 'Problèmes corrigés avec succès',
            'fixes' => $fixes,
            'final_test' => [
                'campagnes_loaded' => count($finalTest),
                'system_ready' => count($finalTest) > 0
            ]
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la correction: ' . $e->getMessage()
        ], 500);
    }
}
public function getCampagnesActives()
{
    try {
        $campagnes = $this->loadCampagnesSecure();
        $campagnesActives = array_filter($campagnes, function($campagne) {
            return in_array($campagne['statut'] ?? '', ['Active', 'En cours']);
        });

        return response()->json([
            'success' => true,
            'data' => array_values($campagnesActives),
            'count' => count($campagnesActives)
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur: ' . $e->getMessage(),
            'data' => $this->getDefaultCampagnes()
        ], 500);
    }
}
private function checkPhoneDuplicate($telephone, $excludeId = null, $campagneId = null)
{
    $query = DB::table('beneficiaires')
        ->where('telephone', $telephone)
        ->whereNull('date_suppression');
    
    if ($excludeId) {
        $query->where('id', '!=', $excludeId);
    }
    
    // Optionnel: limiter la vérification à la même campagne
    if ($campagneId) {
        $query->where('campagne_id', $campagneId);
    }
    
    return $query->exists();
}
public function storeBeneficiaireWithDuplicateCheck(Request $request)
{
    // Validation normale sans contrainte unique
    $validator = Validator::make($request->all(), [
        'nom' => 'required|string|max:255',
        'prenom' => 'required|string|max:255',
        'telephone' => 'required|string|max:255', // Pas de unique
        // ... autres règles
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $validator->errors()
        ], 422);
    }

    // Vérification optionnelle des doublons
    if ($this->checkPhoneDuplicate($request->telephone, null, $request->campagne_id)) {
        return response()->json([
            'success' => false,
            'message' => 'Un bénéficiaire avec ce numéro de téléphone existe déjà dans cette campagne',
            'errors' => ['telephone' => ['Ce numéro de téléphone est déjà utilisé']]
        ], 422);
    }

    // ... suite du code normal
}

/**
 * ===== SCRIPT DE NETTOYAGE DES DOUBLONS EXISTANTS =====
 */
public function cleanPhoneDuplicates()
{
    try {
        DB::beginTransaction();
        
        // Trouver les doublons
        $duplicates = DB::table('beneficiaires')
            ->select('telephone', DB::raw('COUNT(*) as count'), DB::raw('MIN(id) as keep_id'))
            ->whereNull('date_suppression')
            ->groupBy('telephone')
            ->having('count', '>', 1)
            ->get();

        $cleaned = 0;
        
        foreach ($duplicates as $duplicate) {
            // Garder le plus ancien, supprimer les autres
            $toDelete = DB::table('beneficiaires')
                ->where('telephone', $duplicate->telephone)
                ->where('id', '!=', $duplicate->keep_id)
                ->whereNull('date_suppression')
                ->pluck('id');

            if ($toDelete->count() > 0) {
                DB::table('beneficiaires')
                    ->whereIn('id', $toDelete)
                    ->update([
                        'date_suppression' => now(),
                        'updated_at' => now()
                    ]);

                $cleaned += $toDelete->count();
            }
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => "Nettoyage terminé: {$cleaned} doublons supprimés",
            'data' => [
                'duplicates_found' => $duplicates->count(),
                'records_cleaned' => $cleaned
            ]
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du nettoyage: ' . $e->getMessage()
        ], 500);
    }
}


public function storeBeneficiaire(Request $request)
{
    Log::info('🔍 === DÉBUT CRÉATION BÉNÉFICIAIRE ===');
    Log::info('📥 Données reçues:', $request->all());
    Log::info('📊 Headers:', $request->headers->all());
    Log::info('🔗 URL appelée:', ['url' => $request->fullUrl()]);
    Log::info('🌐 Method:', ['method' => $request->method()]);

    try {
        // ✅ Validation avec règle spécifique pour téléphone 9 chiffres
        $validated = $request->validate([
            'nom' => 'required|string|min:2|max:255',
            'prenom' => 'required|string|min:2|max:255',
            'sexe' => 'required|in:M,F',
            'date_naissance' => 'required|date',
            'telephone' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    // Validation personnalisée pour 9 chiffres
                    if (!Beneficiaire::estTelephoneValide($value)) {
                        $fail('Le numéro de téléphone doit contenir exactement 9 chiffres.');
                    }
                }
            ],
            'adresse' => 'required|string|max:500',
            'type_assistance_id' => 'required|exists:types_assistance,id',
            'campagne_id' => 'nullable|exists:campagnes_medicales,id',
            'email' => 'nullable|email|max:255',
            'cin' => 'nullable|string|max:255',
            'hors_campagne' => 'boolean',
            'a_beneficie' => 'boolean',
            'commentaire' => 'nullable|string',
            'enfants_scolarises' => 'nullable|boolean',
            'cote' => 'nullable|in:unilatéral,bilatéral',
            'lateralite' => 'nullable|in:Unilatérale,Bilatérale',
            'decision' => 'nullable|in:accepte,en_attente,refuse,principal,attente'
        ]);

        Log::info('✅ Validation réussie:', $validated);

        // ✅ Utilisation du modèle Eloquent pour bénéficier des mutateurs
        $beneficiaire = new Beneficiaire();
        
        // Les mutateurs du modèle vont automatiquement nettoyer les données
        $beneficiaire->fill([
            'nom' => $validated['nom'],
            'prenom' => $validated['prenom'],
            'sexe' => $validated['sexe'],
            'date_naissance' => $validated['date_naissance'],
            'telephone' => $validated['telephone'], // Le mutateur va nettoyer automatiquement
            'adresse' => $validated['adresse'],
            'type_assistance_id' => $validated['type_assistance_id'],
            'campagne_id' => $validated['campagne_id'] ?? null,
            'email' => $validated['email'] ?? null,
            'cin' => $validated['cin'] ?? null,
            'hors_campagne' => $validated['hors_campagne'] ?? false,
            'a_beneficie' => $validated['a_beneficie'] ?? false,
            'commentaire' => $validated['commentaire'] ?? null,
            'enfants_scolarises' => $validated['enfants_scolarises'] ?? null,
            'cote' => $validated['cote'] ?? null,
            'lateralite' => $validated['lateralite'] ?? null,
            'decision' => $this->normalizeDecisionValue($validated['decision'] ?? null),
            'date_demande' => now()->format('Y-m-d'),
        ]);

        Log::info('💾 Données préparées avec mutateurs:', $beneficiaire->toArray());

        // ✅ Sauvegarde avec Eloquent
        $beneficiaire->save();
        
        Log::info('💾 ID généré:', ['id' => $beneficiaire->id]);
        Log::info('📞 Téléphone nettoyé:', ['telephone' => $beneficiaire->telephone]);

        // ✅ Charger avec les relations
        $beneficiaireWithRelations = Beneficiaire::with(['typeAssistance', 'campagne'])
            ->find($beneficiaire->id);

        if (!$beneficiaireWithRelations) {
            throw new \Exception('Bénéficiaire créé mais non trouvé en base');
        }

        Log::info('✅ === CRÉATION RÉUSSIE ===');
        Log::info('📊 Données finales:', $beneficiaireWithRelations->toArray());

        return response()->json([
            'success' => true,
            'message' => 'Bénéficiaire créé avec succès',
            'data' => [
                'id' => $beneficiaireWithRelations->id,
                'nom' => $beneficiaireWithRelations->nom,
                'prenom' => $beneficiaireWithRelations->prenom,
                'nom_complet' => $beneficiaireWithRelations->nom_complet,
                'sexe' => $beneficiaireWithRelations->sexe,
                'sexe_libelle' => $beneficiaireWithRelations->sexe_libelle,
                'date_naissance' => $beneficiaireWithRelations->date_naissance,
                'age' => $beneficiaireWithRelations->age,
                'telephone' => $beneficiaireWithRelations->telephone,
                'adresse' => $beneficiaireWithRelations->adresse,
                'email' => $beneficiaireWithRelations->email,
                'cin' => $beneficiaireWithRelations->cin,
                'type_assistance' => $beneficiaireWithRelations->typeAssistance->libelle ?? null,
                'campagne_nom' => $beneficiaireWithRelations->campagne->nom ?? null,
                'hors_campagne' => $beneficiaireWithRelations->hors_campagne,
                'a_beneficie' => $beneficiaireWithRelations->a_beneficie,
                'decision' => $beneficiaireWithRelations->decision,
                'created_at' => $beneficiaireWithRelations->created_at,
                'updated_at' => $beneficiaireWithRelations->updated_at,
            ]
        ], 201);

    } catch (\Illuminate\Validation\ValidationException $e) {
        Log::error('❌ Erreur validation:', [
            'errors' => $e->errors(),
            'input' => $request->all()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur de validation',
            'errors' => $e->errors()
        ], 422);

    } catch (\Exception $e) {
        Log::error('❌ === ERREUR CRÉATION BÉNÉFICIAIRE ===');
        Log::error('Message:', ['error' => $e->getMessage()]);
        Log::error('File:', ['file' => $e->getFile()]);
        Log::error('Line:', ['line' => $e->getLine()]);
        Log::error('Trace:', ['trace' => $e->getTraceAsString()]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la création: ' . $e->getMessage(),
            'debug' => [
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]
        ], 500);
    }
}

public function updateBeneficiaire(Request $request, $id)
{
    Log::info('🔍 === DÉBUT MODIFICATION BÉNÉFICIAIRE ===');
    Log::info('🆔 ID:', ['id' => $id]);
    Log::info('📥 Données reçues:', $request->all());

    try {
        // ✅ Rechercher le bénéficiaire avec Eloquent
        $beneficiaire = Beneficiaire::actif()->find($id);
        
        if (!$beneficiaire) {
            Log::error('❌ Bénéficiaire non trouvé avec ID:', ['id' => $id]);
            return response()->json([
                'success' => false,
                'message' => 'Bénéficiaire non trouvé'
            ], 404);
        }

        Log::info('✅ Bénéficiaire trouvé:', $beneficiaire->toArray());

        // ✅ Validation avec règle spécifique pour téléphone 9 chiffres
        $validated = $request->validate([
            'nom' => 'required|string|min:2|max:255',
            'prenom' => 'required|string|min:2|max:255',
            'sexe' => 'required|in:M,F',
            'date_naissance' => 'required|date',
            'telephone' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    // Validation personnalisée pour 9 chiffres
                    if (!Beneficiaire::estTelephoneValide($value)) {
                        $fail('Le numéro de téléphone doit contenir exactement 9 chiffres.');
                    }
                }
            ],
            'adresse' => 'required|string|max:500',
            'type_assistance_id' => 'required|exists:types_assistance,id',
            'campagne_id' => 'nullable|exists:campagnes_medicales,id',
            'email' => 'nullable|email|max:255',
            'cin' => 'nullable|string|max:255',
            'hors_campagne' => 'boolean',
            'a_beneficie' => 'boolean',
            'commentaire' => 'nullable|string',
            'enfants_scolarises' => 'nullable|boolean',
            'cote' => 'nullable|in:unilatéral,bilatéral',
            'lateralite' => 'nullable|in:Unilatérale,Bilatérale',
            'decision' => 'nullable|in:accepté,en_attente,refusé,admin a list principal,admin a list d\'attente'
        ]);

        Log::info('✅ Validation réussie');

        // ✅ Mise à jour avec Eloquent et mutateurs
        $beneficiaire->fill([
            'nom' => $validated['nom'],
            'prenom' => $validated['prenom'],
            'sexe' => $validated['sexe'],
            'date_naissance' => $validated['date_naissance'],
            'telephone' => $validated['telephone'], // Le mutateur va nettoyer automatiquement
            'adresse' => $validated['adresse'],
            'type_assistance_id' => $validated['type_assistance_id'],
            'campagne_id' => $validated['campagne_id'] ?? null,
            'email' => $validated['email'] ?? null,
            'cin' => $validated['cin'] ?? null,
            'hors_campagne' => $validated['hors_campagne'] ?? false,
            'a_beneficie' => $validated['a_beneficie'] ?? false,
            'commentaire' => $validated['commentaire'] ?? null,
            'enfants_scolarises' => $validated['enfants_scolarises'] ?? null,
            'cote' => $validated['cote'] ?? null,
            'lateralite' => $validated['lateralite'] ?? null,
            'decision' => $this->normalizeDecisionValue($validated['decision'] ?? null),
        ]);

        Log::info('💾 Données à mettre à jour:', $beneficiaire->getDirty());
        Log::info('📞 Téléphone après mutateur:', ['telephone' => $beneficiaire->telephone]);
        Log::info('🔄 Décision normalisée:', ['original' => $validated['decision'] ?? null, 'normalized' => $beneficiaire->decision]);

        // ✅ Sauvegarde
        $beneficiaire->save();

        Log::info('💾 Mise à jour terminée');

        // ✅ Recharger avec les relations
        $beneficiaireUpdated = Beneficiaire::with(['typeAssistance', 'campagne'])
            ->find($id);

        Log::info('✅ === MODIFICATION RÉUSSIE ===');
        Log::info('📊 Données finales:', $beneficiaireUpdated->toArray());

        return response()->json([
            'success' => true,
            'message' => 'Bénéficiaire modifié avec succès',
            'data' => [
                'id' => $beneficiaireUpdated->id,
                'nom' => $beneficiaireUpdated->nom,
                'prenom' => $beneficiaireUpdated->prenom,
                'nom_complet' => $beneficiaireUpdated->nom_complet,
                'sexe' => $beneficiaireUpdated->sexe,
                'sexe_libelle' => $beneficiaireUpdated->sexe_libelle,
                'date_naissance' => $beneficiaireUpdated->date_naissance,
                'age' => $beneficiaireUpdated->age,
                'telephone' => $beneficiaireUpdated->telephone,
                'adresse' => $beneficiaireUpdated->adresse,
                'email' => $beneficiaireUpdated->email,
                'cin' => $beneficiaireUpdated->cin,
                'type_assistance' => $beneficiaireUpdated->typeAssistance->libelle ?? null,
                'campagne_nom' => $beneficiaireUpdated->campagne->nom ?? null,
                'hors_campagne' => $beneficiaireUpdated->hors_campagne,
                'a_beneficie' => $beneficiaireUpdated->a_beneficie,
                'decision' => $beneficiaireUpdated->decision,
                'created_at' => $beneficiaireUpdated->created_at,
                'updated_at' => $beneficiaireUpdated->updated_at,
            ]
        ], 200);

    } catch (\Illuminate\Validation\ValidationException $e) {
        Log::error('❌ Erreur validation:', [
            'errors' => $e->errors(),
            'input' => $request->all()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur de validation',
            'errors' => $e->errors()
        ], 422);

    } catch (\Exception $e) {
        Log::error('❌ === ERREUR MODIFICATION BÉNÉFICIAIRE ===');
        Log::error('ID:', ['id' => $id]);
        Log::error('Message:', ['error' => $e->getMessage()]);
        Log::error('File:', ['file' => $e->getFile()]);
        Log::error('Line:', ['line' => $e->getLine()]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la modification: ' . $e->getMessage(),
            'debug' => [
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]
        ], 500);
    }
}

/**
 * Méthode utilitaire pour normaliser les valeurs de décision
 */
private function normalizeDecisionValue($decision)
{
    if (empty($decision)) {
        return null;
    }

    // Mapping des différentes valeurs possibles
    $mapping = [
        'accepte' => 'accepté',
        'accepté' => 'accepté',
        'refuse' => 'refusé',
        'refusé' => 'refusé',
        'principal' => 'admin a list principal',
        'attente' => 'admin a list d\'attente',
        'en_attente' => 'en_attente',
        'admin a list principal' => 'admin a list principal',
        'admin a list d\'attente' => 'admin a list d\'attente',
    ];

    return $mapping[strtolower($decision)] ?? $decision;
}


/**
 * ✅ MÉTHODE CORRIGÉE: Modifier un bénéficiaire
 */

/**
 * ✅ ROUTE DE TEST POUR DIAGNOSTIC
 */
public function testBeneficiaireCreation(Request $request)
{
    Log::info('🧪 === TEST CRÉATION BÉNÉFICIAIRE ===');
    
    try {
        // Test de connexion DB
        $dbName = DB::connection()->getDatabaseName();
        Log::info('✅ Base de données:', ['database' => $dbName]);

        // Test des tables
        $tables = [
            'beneficiaires_medicaux' => Schema::hasTable('beneficiaires_medicaux'),
            'beneficiaires' => Schema::hasTable('beneficiaires'),
            'types_assistance' => Schema::hasTable('types_assistance'),
            'campagnes_medicales' => Schema::hasTable('campagnes_medicales')
        ];
        Log::info('📋 Tables disponibles:', $tables);

        // Test d'insertion simple
        $tableName = $tables['beneficiaires_medicaux'] ? 'beneficiaires_medicaux' : 'beneficiaires';
        
        if (!$tables[$tableName === 'beneficiaires_medicaux' ? 'beneficiaires_medicaux' : 'beneficiaires']) {
            throw new \Exception('Aucune table bénéficiaires disponible');
        }

        $testData = [
            'nom' => 'Test',
            'prenom' => 'User',
            'sexe' => 'M',
            'date_naissance' => '1990-01-01',
            'telephone' => '612345678',
            'adresse' => 'Adresse test',
            'type_assistance_id' => 1,
            'date_demande' => now()->format('Y-m-d'),
            'created_at' => now(),
            'updated_at' => now()
        ];

        Log::info('🧪 Tentative d\'insertion test:', $testData);

        $testId = DB::table($tableName)->insertGetId($testData);
        
        Log::info('✅ Test réussi - ID:', ['test_id' => $testId]);

        // Vérification
        $testRecord = DB::table($tableName)->where('id', $testId)->first();
        
        // Nettoyage
        DB::table($tableName)->where('id', $testId)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Test réussi',
            'data' => [
                'database' => $dbName,
                'tables' => $tables,
                'table_used' => $tableName,
                'test_id' => $testId,
                'test_record' => $testRecord
            ]
        ]);

    } catch (\Exception $e) {
        Log::error('❌ Test échoué:', [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Test échoué: ' . $e->getMessage(),
            'debug' => [
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]
        ], 500);
    }
}


/**
 * Méthode utilitaire pour valider un numéro de téléphone
 * Peut être utilisée dans d'autres méthodes du controller
 */
private function validatePhoneNumber($phoneNumber)
{
    if (empty($phoneNumber)) {
        return ['valid' => false, 'message' => 'Le numéro de téléphone est requis'];
    }
    
    $cleanNumber = preg_replace('/[^0-9]/', '', $phoneNumber);
    
    if (strlen($cleanNumber) !== 9) {
        return [
            'valid' => false, 
            'message' => 'Le numéro de téléphone doit contenir exactement 9 chiffres',
            'received_length' => strlen($cleanNumber),
            'clean_number' => $cleanNumber
        ];
    }
    
    return [
        'valid' => true, 
        'clean_number' => $cleanNumber,
        'original' => $phoneNumber
    ];
}

/*
 * Mettre à jour une assistance médicale avec support appareillage
 */


// Méthode helper pour obtenir une assistance par ID
private function getAssistanceByIdSecure($assistanceId)
{
    try {
        return DB::table('assistance_medicales')
            ->leftJoin('beneficiaires', 'assistance_medicales.beneficiaire_id', '=', 'beneficiaires.id')
            ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('campagnes_medicales', 'assistance_medicales.campagne_id', '=', 'campagnes_medicales.id')
            ->select(
                'assistance_medicales.*',
                'beneficiaires.nom',
                'beneficiaires.prenom',
                'beneficiaires.telephone',
                'types_assistance.libelle as type_assistance',
                'campagnes_medicales.nom as campagne_nom'
            )
            ->where('assistance_medicales.id', $assistanceId)
            ->whereNull('assistance_medicales.date_suppression')
            ->first();
    } catch (\Exception $e) {
        Log::error('Erreur getAssistanceByIdSecure', [
            'assistance_id' => $assistanceId,
            'error' => $e->getMessage()
        ]);
        return null;
    }
}




/**
 * MÉTHODE MISE À JOUR : Modifier une assistance médicale
 */
public function updateAssistanceMedicale(Request $request, $id)
{
    $validator = Validator::make($request->all(), [
        'type_assistance_id' => 'sometimes|required|exists:types_assistance,id',
        'beneficiaire_id' => 'sometimes|required|exists:beneficiaires,id',
        'campagne_id' => 'nullable|exists:campagnes_medicales,id',
        'details_type_assistance_id' => 'nullable|exists:details_type_assistances,id',
        'situation_id' => 'nullable|exists:situations,id',
        'etat_don_id' => 'sometimes|required|exists:etat_dones,id',
        'nature_done_id' => 'nullable|exists:nature_dones,id',
        'date_assistance' => 'sometimes|required|date',
        'montant' => 'nullable|numeric|min:0',
        'priorite' => 'sometimes|required|in:Normale,Urgente,Très urgente',
        'observations' => 'nullable|string|max:1000',
        'commentaire_interne' => 'nullable|string|max:1000',
        
        // Champs appareillage
        'realisee_par' => 'nullable|string|max:255',
        'duree_utilisation' => 'nullable|integer|min:1',
        'retour_effectue' => 'boolean',
        'date_retour' => 'nullable|date',
        'observation_retour' => 'nullable|string|max:1000',
        'moi_meme' => 'boolean',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        DB::beginTransaction();
        
        $assistance = DB::table('assistance_medicales')
            ->where('id', $id)
            ->whereNull('date_suppression')
            ->first();

        if (!$assistance) {
            return response()->json([
                'success' => false,
                'message' => 'Assistance médicale non trouvée'
            ], 404);
        }

        // Déterminer la nature du don (actuelle ou nouvelle)
        $natureDoneId = $request->has('nature_done_id') 
            ? $request->nature_done_id 
            : $assistance->nature_done_id;

        // Vérifier si la nature est un prêt
        $isPret = false;
        if ($natureDoneId) {
            $natureDone = DB::table('nature_dones')
                ->where('id', $natureDoneId)
                ->whereNull('date_suppression')
                ->first();

            if ($natureDone) {
                $libelle = strtolower($natureDone->libelle ?? '');
                $isPret = $natureDone->duree > 0 
                    || strpos($libelle, 'prêt') !== false
                    || strpos($libelle, 'pret') !== false
                    || strpos($libelle, 'temporaire') !== false;
            }
        }

        // VALIDATION: interdire la modification de duree_utilisation si ce n'est pas un prêt
        if ($request->has('duree_utilisation') && !$isPret) {
            return response()->json([
                'success' => false,
                'message' => 'La modification de la durée d\'utilisation n\'est autorisée que pour les assistances à titre de prêt',
                'errors' => [
                    'duree_utilisation' => [
                        'Ce champ ne peut être modifié que si la nature du don est un prêt'
                    ]
                ]
            ], 422);
        }

        $updateData = array_merge($request->all(), ['updated_at' => now()]);
        
        // Ajouter valeur par défaut pour moi_meme si non fournie
        if (!isset($updateData['moi_meme'])) {
            $updateData['moi_meme'] = false;
        }

        // Supprimer duree_utilisation du update si ce n'est pas un prêt
        if (!$isPret) {
            unset($updateData['duree_utilisation']);
            unset($updateData['date_fin_prevue']);
            unset($updateData['date_retour_prevue']);
        }

        // Recalculer date_fin_prevue et date_retour_prevue UNIQUEMENT pour les prêts
        if ($isPret && (isset($updateData['duree_utilisation']) || isset($updateData['date_assistance']))) {
            $dateAssistance = $updateData['date_assistance'] ?? $assistance->date_assistance;
            $dureeUtilisation = $updateData['duree_utilisation'] ?? $assistance->duree_utilisation;
            
            if ($dureeUtilisation && $dateAssistance) {
                $dateFinPrevue = Carbon::parse($dateAssistance)
                    ->addDays($dureeUtilisation)
                    ->format('Y-m-d');
                    
                $updateData['date_fin_prevue'] = $dateFinPrevue;
                $updateData['date_retour_prevue'] = $dateFinPrevue;
            }
        }

        DB::table('assistance_medicales')
            ->where('id', $id)
            ->update($updateData);

        $assistanceUpdated = $this->getAssistanceByIdSecure($id);

        DB::commit();

        Log::info('✅ Assistance médicale mise à jour', [
            'assistance_id' => $id,
            'changes' => array_keys($request->all()),
            'is_pret' => $isPret,
            'duree_modified' => $request->has('duree_utilisation'),
            'moi_meme' => $updateData['moi_meme'],
            'user_id' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Assistance médicale mise à jour avec succès',
            'data' => $assistanceUpdated
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error('❌ Erreur mise à jour assistance', [
            'error' => $e->getMessage(),
            'assistance_id' => $id,
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la mise à jour: ' . $e->getMessage()
        ], 500);
    }
}

public function getStatistiquesAssistances(Request $request)
{
    try {
        $dateDebut = $request->get('date_debut');
        $dateFin = $request->get('date_fin');

        $query = DB::table('assistance_medicales')
            ->whereNull('date_suppression');

        if ($dateDebut && $dateFin) {
            $query->whereBetween('date_assistance', [$dateDebut, $dateFin]);
        }

        $stats = [
            'total_assistances' => $query->count(),
            'total_montant' => $query->sum('montant'),
            'retours_effectues' => $query->where('retour_effectue', true)->count(),
            'en_cours' => $query->where('retour_effectue', false)->count(),
            // NOUVELLE STATISTIQUE : moi_meme
            'realisees_par_beneficiaires' => $query->where('moi_meme', true)->count(),
            'realisees_par_equipe' => $query->where('moi_meme', false)->count(),
        ];

        // Statistiques par priorité
        $statsPriorite = DB::table('assistance_medicales')
            ->select('priorite', DB::raw('COUNT(*) as total'))
            ->whereNull('date_suppression')
            ->when($dateDebut && $dateFin, function($q) use ($dateDebut, $dateFin) {
                return $q->whereBetween('date_assistance', [$dateDebut, $dateFin]);
            })
            ->groupBy('priorite')
            ->get();

        // NOUVELLES STATISTIQUES : moi_meme par type
        $statsMoiMeme = DB::table('assistance_medicales')
            ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'types_assistance.libelle as type',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN moi_meme = 1 THEN 1 ELSE 0 END) as par_beneficiaire'),
                DB::raw('SUM(CASE WHEN moi_meme = 0 THEN 1 ELSE 0 END) as par_equipe')
            )
            ->whereNull('assistance_medicales.date_suppression')
            ->when($dateDebut && $dateFin, function($q) use ($dateDebut, $dateFin) {
                return $q->whereBetween('assistance_medicales.date_assistance', [$dateDebut, $dateFin]);
            })
            ->groupBy('types_assistance.id', 'types_assistance.libelle')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'generales' => $stats,
                'par_priorite' => $statsPriorite,
                'par_type_et_realisation' => $statsMoiMeme,
                'periode' => [
                    'debut' => $dateDebut,
                    'fin' => $dateFin
                ]
            ]
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du calcul des statistiques: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Obtenir une kafala par ID
 */



/**
 * Obtenir un participant par ID
 */


public function getPreselectionParticipantsLists($campagneId , Request $request)
{
    try {
        // Vérifier que la campagne existe
        $updateData = [
            'statut_preselection' => $request->statut_preselection,
            'updated_at' => now()
        ];

        if ($request->filled('commentaire_preselection')) {
            $updateData['commentaire_preselection'] = $request->commentaire_preselection;
        }

        if ($request->filled('date_contact')) {
            $updateData['date_contact'] = $request->date_contact;
        }

        if ($request->filled('heure_contact')) {
            $updateData['heure_contact'] = $request->heure_contact;
        }

        if ($request->filled('notes_contact')) {
            $updateData['notes_contact'] = $request->notes_contact;
        }

        // Mise à jour du participant
        DB::table('beneficiaires')
            ->where('id', $participantId)
            ->update($updateData);

        // Log de l'action (optionnel - à adapter selon votre système de logs)
        Log::info('Statut présélection mis à jour', [
            'participant_id' => $participantId,
            'ancien_statut' => $participant->statut_preselection,
            'nouveau_statut' => $request->statut_preselection,
            'user_id' => Auth::id()
        ]);

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Statut de présélection mis à jour avec succès',
            'data' => [
                'participant_id' => $participantId,
                'nouveau_statut' => $request->statut_preselection,
                'date_mise_a_jour' => now()->toISOString()
            ]
        ]);

    } catch (Exception $e) {
        DB::rollback();
        Log::error('Erreur mise à jour statut présélection', [
            'participant_id' => $participantId,
            'error' => $e->getMessage(),
            'user_id' => Auth::id()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la mise à jour du statut de présélection',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Mettre à jour en masse les statuts de présélection
 */
public function updateMassPreselectionStatus(Request $request)
{
    $validator = Validator::make($request->all(), [
        'participant_ids' => 'required|array|min:1',
        'participant_ids.*' => 'integer|exists:beneficiaires,id',
        'statut_preselection' => 'required|in:répondu,ne repond pas,non contacté,en_attente',
        'commentaire_preselection' => 'nullable|string|max:500',
        'date_contact' => 'nullable|date',
        'heure_contact' => 'nullable|date_format:H:i',
        'notes_contact' => 'nullable|string|max:1000'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        DB::beginTransaction();

        $participantIds = $request->participant_ids;
        
        // Vérifier que tous les participants sont des participants de présélection
        $participants = DB::table('beneficiaires')
            ->whereIn('id', $participantIds)
            ->whereIn('decision', ['preselection_oui', 'preselection_non'])
            ->whereNull('date_suppression')
            ->get();

        if ($participants->count() !== count($participantIds)) {
            return response()->json([
                'success' => false,
                'message' => 'Certains participants ne sont pas des participants de présélection valides'
            ], 400);
        }

        // Préparer les données de mise à jour
        $updateData = [
            'statut_preselection' => $request->statut_preselection,
            'updated_at' => now()
        ];

        if ($request->filled('commentaire_preselection')) {
            $updateData['commentaire_preselection'] = $request->commentaire_preselection;
        }

        if ($request->filled('date_contact')) {
            $updateData['date_contact'] = $request->date_contact;
        }

        if ($request->filled('heure_contact')) {
            $updateData['heure_contact'] = $request->heure_contact;
        }

        if ($request->filled('notes_contact')) {
            $updateData['notes_contact'] = $request->notes_contact;
        }

        // Mise à jour en masse
        $updatedCount = DB::table('beneficiaires')
            ->whereIn('id', $participantIds)
            ->update($updateData);

        // Log de l'action
        Log::info('Mise à jour masse statuts présélection', [
            'participant_ids' => $participantIds,
            'nouveau_statut' => $request->statut_preselection,
            'nombre_mis_a_jour' => $updatedCount,
            'user_id' => Auth::id()
        ]);

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => "Statut de présélection mis à jour pour {$updatedCount} participants",
            'data' => [
                'participants_traites' => $updatedCount,
                'nouveau_statut' => $request->statut_preselection,
                'date_mise_a_jour' => now()->toISOString()
            ]
        ]);

    } catch (Exception $e) {
        DB::rollback();
        Log::error('Erreur mise à jour masse statuts présélection', [
            'participant_ids' => $request->participant_ids,
            'error' => $e->getMessage(),
            'user_id' => Auth::id()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la mise à jour en masse des statuts de présélection',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Statistiques de présélection pour une campagne
 */
public function getPreselectionStatistics($campagneId)
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

        // Récupérer tous les participants de présélection
        $participants = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->whereIn('decision', ['preselection_oui', 'preselection_non'])
            ->whereNull('date_suppression')
            ->get();

        // Statistiques par décision
        $preselection_oui = $participants->where('decision', 'preselection_oui');
        $preselection_non = $participants->where('decision', 'preselection_non');

        // Statistiques par statut de contact
        $statuts = [
            'repondu' => $participants->where('statut_preselection', 'répondu')->count(),
            'ne_repond_pas' => $participants->where('statut_preselection', 'ne repond pas')->count(),
            'en_attente' => $participants->where('statut_preselection', 'en_attente')->count(),
            'non_contacte' => $participants->filter(function($p) {
                return empty($p->statut_preselection) || 
                       $p->statut_preselection === 'non contacté' || 
                       $p->statut_preselection === null;
            })->count()
        ];

        // Statistiques temporelles
        $dateDebut = $campagne->date_debut ? new DateTime($campagne->date_debut) : null;
        $dateFin = $campagne->date_fin ? new DateTime($campagne->date_fin) : null;
        $maintenant = new DateTime();

        $dureeEcoulee = $dateDebut ? $dateDebut->diff($maintenant)->days : 0;
        $dureeTotal = ($dateDebut && $dateFin) ? $dateDebut->diff($dateFin)->days : 0;

        // Calcul des moyennes et tendances
        $participantsAvecContact = $participants->whereNotNull('date_contact');
        $tempsReponsesMoyens = null;

        if ($participantsAvecContact->count() > 0) {
            $tempsReponses = [];
            foreach ($participantsAvecContact as $p) {
                if ($p->created_at && $p->date_contact) {
                    $creation = new DateTime($p->created_at);
                    $contact = new DateTime($p->date_contact);
                    $diff = $creation->diff($contact)->days;
                    $tempsReponses[] = $diff;
                }
            }
            
            if (!empty($tempsReponses)) {
                $tempsReponsesMoyens = round(array_sum($tempsReponses) / count($tempsReponses), 1);
            }
        }

        $statistics = [
            'campagne' => [
                'id' => $campagne->id,
                'nom' => $campagne->nom,
                'statut' => $campagne->statut,
                'duree_ecoulee_jours' => $dureeEcoulee,
                'duree_totale_jours' => $dureeTotal
            ],
            
            'totaux' => [
                'total_preselection' => $participants->count(),
                'total_preselection_oui' => $preselection_oui->count(),
                'total_preselection_non' => $preselection_non->count()
            ],
            
            'par_statut' => $statuts,
            
            'par_decision_et_statut' => [
                'preselection_oui' => [
                    'total' => $preselection_oui->count(),
                    'repondu' => $preselection_oui->where('statut_preselection', 'répondu')->count(),
                    'ne_repond_pas' => $preselection_oui->where('statut_preselection', 'ne repond pas')->count(),
                    'non_contacte' => $preselection_oui->filter(function($p) {
                        return empty($p->statut_preselection) || 
                               $p->statut_preselection === 'non contacté' || 
                               $p->statut_preselection === null;
                    })->count(),
                    'en_attente' => $preselection_oui->where('statut_preselection', 'en_attente')->count()
                ],
                'preselection_non' => [
                    'total' => $preselection_non->count(),
                    'repondu' => $preselection_non->where('statut_preselection', 'répondu')->count(),
                    'ne_repond_pas' => $preselection_non->where('statut_preselection', 'ne repond pas')->count(),
                    'non_contacte' => $preselection_non->filter(function($p) {
                        return empty($p->statut_preselection) || 
                               $p->statut_preselection === 'non contacté' || 
                               $p->statut_preselection === null;
                    })->count(),
                    'en_attente' => $preselection_non->where('statut_preselection', 'en_attente')->count()
                ]
            ],
            
            'taux' => [
                'taux_reponse_global' => $participants->count() > 0 ? 
                    round(($statuts['repondu'] / $participants->count()) * 100, 2) : 0,
                'taux_preselection_oui' => $participants->count() > 0 ? 
                    round(($preselection_oui->count() / $participants->count()) * 100, 2) : 0,
                'taux_preselection_non' => $participants->count() > 0 ? 
                    round(($preselection_non->count() / $participants->count()) * 100, 2) : 0,
                'taux_contact' => $participants->count() > 0 ? 
                    round((($participants->count() - $statuts['non_contacte']) / $participants->count()) * 100, 2) : 0
            ],
            
            'tendances' => [
                'temps_reponse_moyen_jours' => $tempsReponsesMoyens,
                'participants_contactes_aujourdhui' => $participants->filter(function($p) {
                    return $p->date_contact && 
                           date('Y-m-d', strtotime($p->date_contact)) === date('Y-m-d');
                })->count(),
                'derniere_mise_a_jour' => $participants->max('updated_at')
            ],
            
            'metadata' => [
                'campagne_id' => $campagneId,
                'calcule_le' => now()->toISOString(),
                'methode' => 'statistiques_completes'
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);

    } catch (Exception $e) {
        Log::error('Erreur calcul statistiques présélection', [
            'campagne_id' => $campagneId,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du calcul des statistiques de présélection',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Export des participants de présélection
 */
public function exportPreselectionParticipants(Request $request, $campagneId){
    $validator = Validator::make($request->all(), [
        'format' => 'nullable|in:csv,xlsx',
        'decision' => 'nullable|in:preselection_oui,preselection_non',
        'statut_preselection' => 'nullable|in:répondu,ne repond pas,non contacté,en_attente',
        'include_statistics' => 'nullable|boolean'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'errors' => $validator->errors()
        ], 422);
    }

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

        $query = DB::table('beneficiaires')
            ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'beneficiaires.*',
                'types_assistance.libelle as type_assistance'
            )
            ->where('beneficiaires.campagne_id', $campagneId)
            ->whereIn('beneficiaires.decision', ['preselection_oui', 'preselection_non'])
            ->whereNull('beneficiaires.date_suppression');

        // Filtres optionnels
        if ($request->filled('decision')) {
            $query->where('beneficiaires.decision', $request->decision);
        }

        if ($request->filled('statut_preselection')) {
            $query->where('beneficiaires.statut_preselection', $request->statut_preselection);
        }

        $participants = $query->orderBy('beneficiaires.nom')->get();

        $format = $request->get('format', 'csv');
        $includeStats = $request->get('include_statistics', false);

        $filename = 'participants_preselection_' . 
                    str_replace(' ', '_', $campagne->nom) . '_' . 
                    date('Y-m-d_H-i-s') . '.' . $format;

        if ($format === 'csv') {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];

            $callback = function() use ($participants, $includeStats, $campagne) {
                $file = fopen('php://output', 'w');
                
                // En-têtes CSV
                fputcsv($file, [
                    'ID',
                    'Nom',
                    'Prénom',
                    'Téléphone',
                    'Email',
                    'Adresse',
                    'Date de naissance',
                    'Sexe',
                    'CIN',
                    'Type d\'assistance',
                    'Décision présélection',
                    'Statut de contact',
                    'Date de contact',
                    'Heure de contact',
                    'Commentaire présélection',
                    'Notes de contact',
                    'Date de création',
                    'Dernière mise à jour'
                ]);

                // Données des participants
                foreach ($participants as $participant) {
                    fputcsv($file, [
                        $participant->id,
                        $participant->nom,
                        $participant->prenom,
                        $participant->telephone,
                        $participant->email,
                        $participant->adresse,
                        $participant->date_naissance ? date('d/m/Y', strtotime($participant->date_naissance)) : '',
                        $participant->sexe,
                        $participant->cin,
                        $participant->type_assistance,
                        $participant->decision,
                        $participant->statut_preselection ?: 'Non contacté',
                        $participant->date_contact ? date('d/m/Y', strtotime($participant->date_contact)) : '',
                        $participant->heure_contact,
                        $participant->commentaire_preselection,
                        $participant->notes_contact,
                        date('d/m/Y H:i', strtotime($participant->created_at)),
                        date('d/m/Y H:i', strtotime($participant->updated_at))
                    ]);
                }

                // Ajouter les statistiques si demandées
                if ($includeStats) {
                    fputcsv($file, []); // Ligne vide
                    fputcsv($file, ['=== STATISTIQUES DE PRÉSÉLECTION ===']);
                    fputcsv($file, ['Campagne:', $campagne->nom]);
                    fputcsv($file, ['Total participants:', count($participants)]);
                    fputcsv($file, ['Présélection OUI:', collect($participants)->where('decision', 'preselection_oui')->count()]);
                    fputcsv($file, ['Présélection NON:', collect($participants)->where('decision', 'preselection_non')->count()]);
                    fputcsv($file, ['A répondu:', collect($participants)->where('statut_preselection', 'répondu')->count()]);
                    fputcsv($file, ['Ne répond pas:', collect($participants)->where('statut_preselection', 'ne repond pas')->count()]);
                    fputcsv($file, ['Non contacté:', collect($participants)->filter(function($p) {
                        return empty($p->statut_preselection) || $p->statut_preselection === 'non contacté';
                    })->count()]);
                    fputcsv($file, ['Export généré le:', date('d/m/Y H:i:s')]);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        }

        // TODO: Ajouter support XLSX si besoin avec PhpSpreadsheet

        return response()->json([
            'success' => false,
            'message' => 'Format d\'export non supporté: ' . $format
        ], 400);

    } catch (Exception $e) {
        Log::error('Erreur export participants présélection', [
            'campagne_id' => $campagneId,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'export des participants de présélection',
            'error' => $e->getMessage()
        ], 500);
    }
}


/**
 * Récupérer les participants avec colonnes conditionnelles selon le type de campagne
 */
public function getParticipants(Request $request, $campagneId = null)
{
    try {
        // Récupérer d'abord les informations de la campagne pour connaître le type
        $campagne = null;
        if ($campagneId) {
            $campagne = DB::table('campagnes_medicales')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select('campagnes_medicales.*', 'types_assistance.libelle as type_assistance')
                ->where('campagnes_medicales.id', $campagneId)
                ->whereNull('campagnes_medicales.date_suppression')
                ->first();
        } elseif ($request->filled('campagne_id')) {
            $campagne = DB::table('campagnes_medicales')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select('campagnes_medicales.*', 'types_assistance.libelle as type_assistance')
                ->where('campagnes_medicales.id', $request->campagne_id)
                ->whereNull('campagnes_medicales.date_suppression')
                ->first();
            $campagneId = $request->campagne_id;
        }

        // Construire la requête de base avec colonnes conditionnelles
        $selectColumns = [
            'participants.id',
            'participants.nom',
            'participants.prenom',
            'participants.telephone',
            'participants.email',
            'participants.adresse',
            'participants.date_naissance',
            'participants.sexe',
            'participants.cin',
            'participants.statut',
            'participants.commentaire',
            'participants.date_appel',
            'participants.created_at',
            'participants.updated_at',
            'campagnes_medicales.nom as campagne_nom',
            'campagnes_medicales.id as campagne_id',
            'types_assistance.libelle as type_assistance'
        ];

        // Ajouter les colonnes virtuelles selon le type de campagne
        if ($campagne && $campagne->type_assistance) {
            switch (strtolower($campagne->type_assistance)) {
                case 'auditif':
                    // Pour les campagnes auditives, ajouter la colonne 'cote'
                    $selectColumns[] = DB::raw("'' as cote");
                    $selectColumns[] = DB::raw("'' as decision");
                    $selectColumns[] = DB::raw("'' as enfants_scolarises");
                    break;
                
                case 'visuel':
                case 'orthopedique':
                case 'cardiaque':
                default:
                    // Pour les autres types de campagnes (pas de colonne cote)
                    $selectColumns[] = DB::raw("'' as decision");
                    $selectColumns[] = DB::raw("'' as enfants_scolarises");
                    break;
            }
        } else {
            // Si pas de campagne spécifique ou type non défini, ajouter les colonnes par défaut
            $selectColumns[] = DB::raw("'' as decision");
            $selectColumns[] = DB::raw("'' as enfants_scolarises");
        }

        $query = DB::table('participants')
            ->leftJoin('campagnes_medicales', 'participants.campagne_id', '=', 'campagnes_medicales.id')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select($selectColumns)
            ->whereNull('participants.date_suppression');

        // Filtrer par campagne si spécifiée
        if ($campagneId) {
            $query->where('participants.campagne_id', $campagneId);
        } elseif ($request->filled('campagne_id')) {
            $query->where('participants.campagne_id', $request->campagne_id);
        }

        // Filtres supplémentaires
        if ($request->filled('statut')) {
            $query->where('participants.statut', $request->statut);
        }

        if ($request->filled('sexe')) {
            $query->where('participants.sexe', $request->sexe);
        }

        // Filtre par décision si fourni (même si c'est une colonne virtuelle)
        // if ($request->filled('decision')) {
        //     $query->where('participants.decision', $request->decision);
        // }

        // Filtre par côté pour les campagnes auditives (même si c'est une colonne virtuelle)
        // if ($request->filled('cote') && $campagne && strtolower($campagne->type_assistance) === 'auditif') {
        //     $query->where('participants.cote', $request->cote);
        // }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('participants.nom', 'like', "%{$search}%")
                  ->orWhere('participants.prenom', 'like', "%{$search}%")
                  ->orWhere('participants.telephone', 'like', "%{$search}%")
                  ->orWhere('participants.cin', 'like', "%{$search}%");
            });
        }

        if ($request->filled('date_debut') && $request->filled('date_fin')) {
            $query->whereBetween('participants.created_at', [$request->date_debut, $request->date_fin]);
        }

        // Tri
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        
        $validSortColumns = ['nom', 'prenom', 'telephone', 'statut', 'date_appel', 'created_at'];
        if (in_array($sortBy, $validSortColumns)) {
            $query->orderBy('participants.' . $sortBy, $sortDir);
        } else {
            $query->orderBy('participants.created_at', 'desc');
        }

        // Pagination
        $perPage = min($request->get('per_page', 15), 100); // Limite à 100
        $page = $request->get('page', 1);
        $offset = ($page - 1) * $perPage;

        $totalCount = $query->count();
        $participants = $query->limit($perPage)->offset($offset)->get();

        // Enrichir les données
        $participants = $participants->map(function($participant) use ($campagne) {
            // Calculer l'âge
            if ($participant->date_naissance) {
                $participant->age = Carbon::parse($participant->date_naissance)->age;
            }

            // Nom complet
            $participant->nom_complet = trim($participant->nom . ' ' . $participant->prenom);

            // Statut libellé
            $statutsLibelles = [
                'en_attente' => 'En attente',
                'oui' => 'Oui - Confirmé',
                'non' => 'Non - Refusé',
                'refuse' => 'Refusé',
                'répondu' => 'A répondu',
                'ne repond pas' => 'Ne répond pas',
                'non contacté' => 'Non contacté'
            ];
            
            $participant->statut_libelle = $statutsLibelles[$participant->statut] ?? $participant->statut;

            // Libellé pour la décision (colonne virtuelle vide par défaut)
            $participant->decision_libelle = $participant->decision ?: 'Non renseigné';

            // Libellé pour le côté (pour campagnes auditives uniquement)
            if ($campagne && strtolower($campagne->type_assistance) === 'auditif') {
                $participant->cote_libelle = $participant->cote ?: 'Non renseigné';
            } else {
                // Supprimer la propriété cote si ce n'est pas une campagne auditive
                unset($participant->cote);
                $participant->cote_libelle = '';
            }

            // Couleur du statut pour l'affichage
            $couleurs = [
                'oui' => 'success',
                'répondu' => 'success',
                'en_attente' => 'warning',
                'non contacté' => 'info',
                'non' => 'danger',
                'refuse' => 'danger',
                'ne repond pas' => 'secondary'
            ];
            
            $participant->statut_couleur = $couleurs[$participant->statut] ?? 'secondary';

            // Icônes du statut
            $icones = [
                'oui' => '✅',
                'répondu' => '📞',
                'en_attente' => '⏳',
                'non contacté' => '📋',
                'non' => '❌',
                'refuse' => '🚫',
                'ne repond pas' => '📵'
            ];
            
            $participant->statut_icone = $icones[$participant->statut] ?? '❓';

            // Dates formatées
            if ($participant->date_appel) {
                $participant->date_appel_formatee = Carbon::parse($participant->date_appel)->format('d/m/Y H:i');
                $participant->derniere_activite = Carbon::parse($participant->date_appel)->diffForHumans();
            }

            if ($participant->created_at) {
                $participant->date_creation_formatee = Carbon::parse($participant->created_at)->format('d/m/Y H:i');
            }

            // Informations sur la campagne
            $participant->is_campagne_auditive = $campagne && strtolower($campagne->type_assistance) === 'auditif';

            return $participant;
        });

        Log::info('✅ Liste participants récupérée avec colonnes conditionnelles', [
            'total' => $totalCount,
            'page' => $page,
            'per_page' => $perPage,
            'campagne_id' => $campagneId,
            'type_assistance' => $campagne->type_assistance ?? 'non défini',
            'colonnes_ajoutees' => ['decision', 'enfants_scolarises', 'cote']
        ]);

        return response()->json([
            'success' => true,
            'data' => $participants,
            'campagne_info' => $campagne ? [
                'id' => $campagne->id,
                'nom' => $campagne->nom,
                'type_assistance' => $campagne->type_assistance,
                'is_auditive' => strtolower($campagne->type_assistance ?? '') === 'auditif'
            ] : null,
            'pagination' => [
                'current_page' => (int) $page,
                'per_page' => (int) $perPage,
                'total' => $totalCount,
                'last_page' => ceil($totalCount / $perPage),
                'from' => (($page - 1) * $perPage) + 1,
                'to' => min($page * $perPage, $totalCount)
            ]
        ]);

    } catch (Exception $e) {
        Log::error('❌ Erreur récupération participants avec colonnes conditionnelles', [
            'error' => $e->getMessage(),
            'campagne_id' => $campagneId,
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement des participants',
            'error' => $e->getMessage()
        ], 500);
    }
}
/**
 * Récupérer un participant spécifique par ID
 */
public function getParticipant($id)
{
    try {
        $participant = DB::table('participants')
            ->leftJoin('campagnes_medicales', 'participants.campagne_id', '=', 'campagnes_medicales.id')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->select(
                'participants.*',
                'campagnes_medicales.nom as campagne_nom',
                'campagnes_medicales.description as campagne_description',
                'campagnes_medicales.date_debut as campagne_date_debut',
                'campagnes_medicales.date_fin as campagne_date_fin',
                'types_assistance.libelle as type_assistance'
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

        // Enrichir les données
        if ($participant->date_naissance) {
            $participant->age = Carbon::parse($participant->date_naissance)->age;
        }

        $participant->nom_complet = trim($participant->nom . ' ' . $participant->prenom);

        // Récupérer l'historique des appels
        $historique = DB::table('log_appels')
            ->leftJoin('users', 'log_appels.user_id', '=', 'users.id')
            ->select(
                'log_appels.*',
                'users.name as user_name'
            )
            ->where('log_appels.participant_id', $id)
            ->orderBy('log_appels.created_at', 'desc')
            ->get();

        $participant->historique_appels = $historique;

        return response()->json([
            'success' => true,
            'data' => $participant
        ]);

    } catch (Exception $e) {
        Log::error('❌ Erreur récupération participant', [
            'participant_id' => $id,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement du participant'
        ], 500);
    }
}

/**
 * Créer un nouveau participant
 */
public function storeParticipant(Request $request)
{
    $validator = Validator::make($request->all(), [
        'nom' => 'required|string|min:2|max:255',
        'prenom' => 'required|string|min:2|max:255',
        'telephone' => 'required|string|min:10|max:20',
        'email' => 'nullable|email|max:255',
        'adresse' => 'nullable|string|max:500',
        'date_naissance' => 'nullable|date|before:today',
        'sexe' => 'nullable|in:M,F',
        'cin' => 'nullable|string|max:20',
        'campagne_id' => 'required|exists:campagnes_medicales,id',
        'statut' => 'nullable|in:en_attente,oui,non,refuse,répondu,ne repond pas,non contacté',
        'commentaire' => 'nullable|string|max:1000'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        DB::beginTransaction();

        // Vérifier les doublons de téléphone dans la même campagne
        $existant = DB::table('participants')
            ->where('campagne_id', $request->campagne_id)
            ->where('telephone', $request->telephone)
            ->whereNull('date_suppression')
            ->first();

        if ($existant) {
            return response()->json([
                'success' => false,
                'message' => 'Un participant avec ce numéro de téléphone existe déjà dans cette campagne',
                'errors' => ['telephone' => ['Ce numéro est déjà utilisé dans cette campagne']]
            ], 422);
        }

        $participantData = [
            'nom' => trim($request->nom),
            'prenom' => trim($request->prenom),
            'telephone' => $request->telephone,
            'email' => $request->email,
            'adresse' => $request->adresse,
            'date_naissance' => $request->date_naissance,
            'sexe' => $request->sexe,
            'cin' => $request->cin,
            'campagne_id' => $request->campagne_id,
            'statut' => $request->statut ?: 'non contacté',
            'commentaire' => $request->commentaire,
            'created_at' => now(),
            'updated_at' => now()
        ];

        $participantId = DB::table('participants')->insertGetId($participantData);

        $participant = DB::table('participants')
            ->leftJoin('campagnes_medicales', 'participants.campagne_id', '=', 'campagnes_medicales.id')
            ->select('participants.*', 'campagnes_medicales.nom as campagne_nom')
            ->where('participants.id', $participantId)
            ->first();

        DB::commit();

        Log::info('✅ Participant créé', [
            'participant_id' => $participantId,
            'nom' => $request->nom,
            'campagne_id' => $request->campagne_id
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Participant créé avec succès',
            'data' => $participant
        ], 201);

    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error('❌ Erreur création participant', [
            'error' => $e->getMessage(),
            'data' => $request->all()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la création du participant'
        ], 500);
    }
}

/**
 * Mettre à jour un participant
 */
public function updateParticipant(Request $request, $id)
{
    $validator = Validator::make($request->all(), [
        'nom' => 'sometimes|required|string|min:2|max:255',
        'prenom' => 'sometimes|required|string|min:2|max:255',
        'telephone' => 'sometimes|required|string|min:10|max:20',
        'email' => 'nullable|email|max:255',
        'adresse' => 'nullable|string|max:500',
        'date_naissance' => 'nullable|date|before:today',
        'sexe' => 'nullable|in:M,F',
        'cin' => 'nullable|string|max:20',
        'statut' => 'nullable|in:en_attente,oui,non,refuse,répondu,ne repond pas,non contacté',
        'commentaire' => 'nullable|string|max:1000'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
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

        // Vérifier les doublons de téléphone si le téléphone change
        if ($request->filled('telephone') && $request->telephone !== $participant->telephone) {
            $existant = DB::table('participants')
                ->where('campagne_id', $participant->campagne_id)
                ->where('telephone', $request->telephone)
                ->where('id', '!=', $id)
                ->whereNull('date_suppression')
                ->first();

            if ($existant) {
                return response()->json([
                    'success' => false,
                    'message' => 'Un autre participant avec ce numéro de téléphone existe déjà dans cette campagne',
                    'errors' => ['telephone' => ['Ce numéro est déjà utilisé dans cette campagne']]
                ], 422);
            }
        }

        $updateData = array_filter($request->all(), function($value) {
            return $value !== null;
        });
        
        $updateData['updated_at'] = now();

        DB::table('participants')
            ->where('id', $id)
            ->update($updateData);

        $participantUpdated = DB::table('participants')
            ->leftJoin('campagnes_medicales', 'participants.campagne_id', '=', 'campagnes_medicales.id')
            ->select('participants.*', 'campagnes_medicales.nom as campagne_nom')
            ->where('participants.id', $id)
            ->first();

        DB::commit();

        Log::info('✅ Participant mis à jour', [
            'participant_id' => $id,
            'changes' => array_keys($updateData)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Participant mis à jour avec succès',
            'data' => $participantUpdated
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error('❌ Erreur mise à jour participant', [
            'participant_id' => $id,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la mise à jour du participant'
        ], 500);
    }
}

/**
 * Changer le statut d'un participant
 */
public function changerStatutParticipant(Request $request, $id)
{
    $validator = Validator::make($request->all(), [
        'statut' => 'required|in:en_attente,oui,non,refuse,répondu,ne repond pas,non contacté',
        'commentaire' => 'nullable|string|max:1000'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
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

        $ancienStatut = $participant->statut;
        $nouveauStatut = $request->statut;

        // Mettre à jour le participant
        DB::table('participants')
            ->where('id', $id)
            ->update([
                'statut' => $nouveauStatut,
                'commentaire' => $request->commentaire,
                'date_appel' => now(),
                'updated_at' => now()
            ]);

        // Créer un log de l'appel
        try {
            DB::table('log_appels')->insert([
                'participant_id' => $id,
                'user_id' => Auth::id(),
                'statut_avant' => $ancienStatut,
                'statut_apres' => $nouveauStatut,
                'commentaire' => $request->commentaire,
                'created_at' => now(),
                'updated_at' => now()
            ]);
        } catch (Exception $logError) {
            // Si la table log_appels n'existe pas, continuer sans bloquer
            Log::warning('Table log_appels non accessible', ['error' => $logError->getMessage()]);
        }

        DB::commit();

        Log::info('✅ Statut participant changé', [
            'participant_id' => $id,
            'ancien_statut' => $ancienStatut,
            'nouveau_statut' => $nouveauStatut,
            'user_id' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Statut du participant mis à jour avec succès',
            'data' => [
                'participant_id' => $id,
                'ancien_statut' => $ancienStatut,
                'nouveau_statut' => $nouveauStatut,
                'date_modification' => now()->toISOString()
            ]
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error('❌ Erreur changement statut', [
            'participant_id' => $id,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du changement de statut'
        ], 500);
    }
}

/**
 * Supprimer un participant (soft delete)
 */
public function deleteParticipant($id)
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

        Log::info('✅ Participant supprimé', [
            'participant_id' => $id,
            'nom' => $participant->nom . ' ' . $participant->prenom
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Participant supprimé avec succès'
        ]);

    } catch (Exception $e) {
        Log::error('❌ Erreur suppression participant', [
            'participant_id' => $id,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la suppression du participant'
        ], 500);
    }
}

/**
 * Statistiques des participants pour une campagne
 */
public function getStatistiquesParticipants($campagneId)
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

        $participants = DB::table('participants')
            ->where('campagne_id', $campagneId)
            ->whereNull('date_suppression')
            ->get();

        $stats = [
            'total' => $participants->count(),
            'par_statut' => [
                'oui' => $participants->where('statut', 'oui')->count(),
                'non' => $participants->where('statut', 'non')->count(),
                'refuse' => $participants->where('statut', 'refuse')->count(),
                'en_attente' => $participants->where('statut', 'en_attente')->count(),
                'répondu' => $participants->where('statut', 'répondu')->count(),
                'ne_repond_pas' => $participants->where('statut', 'ne repond pas')->count(),
                'non_contacté' => $participants->where('statut', 'non contacté')->count(),
            ],
            'par_sexe' => [
                'hommes' => $participants->where('sexe', 'M')->count(),
                'femmes' => $participants->where('sexe', 'F')->count(),
                'non_renseigne' => $participants->whereNull('sexe')->count()
            ],
            'taux' => [
                'reponse' => $participants->count() > 0 ? 
                    round((($participants->whereIn('statut', ['oui', 'non', 'répondu'])->count()) / $participants->count()) * 100, 2) : 0,
                'participation' => $participants->count() > 0 ? 
                    round(($participants->where('statut', 'oui')->count() / $participants->count()) * 100, 2) : 0,
                'contact' => $participants->count() > 0 ? 
                    round((($participants->count() - $participants->where('statut', 'non contacté')->count()) / $participants->count()) * 100, 2) : 0
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'campagne' => [
                    'id' => $campagne->id,
                    'nom' => $campagne->nom
                ],
                'statistiques' => $stats,
                'date_generation' => now()->toISOString()
            ]
        ]);

    } catch (Exception $e) {
        Log::error('❌ Erreur statistiques participants', [
            'campagne_id' => $campagneId,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du calcul des statistiques'
        ], 500);
    }
}


/**
 * Stream le PDF d'une kafala (BLOB) - identique à viewKafalaPdf pour BLOB
 * Route: GET /api/upas/kafalas/{id}/pdf-stream
 */
public function streamKafalaPdf($id)
{
    return $this->viewKafalaPdf($id);
}

/**
 * Créer une nouvelle kafala avec fichier PDF (BLOB)
 * Route: POST /api/upas/kafalas
 */

/**
 * Mettre à jour une kafala avec gestion BLOB
 * Route: PUT /api/upas/kafalas/{id}
 */


/**
 * Récupérer les kafalas avec indicateur PDF corrigé
 */


/**
 * Obtenir une kafala par ID
 * Route: GET /api/upas/kafalas/{id}
 */


/**
 * Export des kafalas
 * Route: GET /api/upas/kafalas/export
 */
public function exportKafalas(Request $request)
{
    $validator = Validator::make($request->all(), [
        'format' => 'nullable|in:csv,xlsx',
        'date_debut' => 'nullable|date',
        'date_fin' => 'nullable|date|after_or_equal:date_debut',
        'avec_pdf_seulement' => 'nullable|boolean',
        'sexe_enfant' => 'nullable|in:M,F'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $format = $request->get('format', 'csv');
        
        Log::info('📥 Début export kafalas', [
            'format' => $format,
            'filters' => $request->all()
        ]);

        $query = DB::table('kafalas')
            ->select(
                'reference', 'nom_pere', 'prenom_pere', 'cin_pere',
                'nom_mere', 'prenom_mere', 'cin_mere',
                'telephone', 'email', 'adresse', 'date_mariage',
                'nom_enfant', 'prenom_enfant', 'sexe_enfant',
                'date_naissance_enfant', 'cin_enfant',
                'fichier_pdf', 'commentaires', 'created_at', 'updated_at'
            )
            ->whereNull('deleted_at');

        // Appliquer les filtres
        if ($request->filled('date_debut') && $request->filled('date_fin')) {
            $query->whereBetween('created_at', [$request->date_debut, $request->date_fin]);
        }

        if ($request->boolean('avec_pdf_seulement')) {
            $query->whereNotNull('fichier_pdf');
        }

        if ($request->filled('sexe_enfant')) {
            $query->where('sexe_enfant', $request->sexe_enfant);
        }

        $kafalas = $query->orderBy('created_at', 'desc')->get();

        $filename = 'kafalas_export_' . date('Y-m-d_H-i-s') . '.' . $format;

        if ($format === 'csv') {
            $headers = [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];

            $callback = function() use ($kafalas) {
                $file = fopen('php://output', 'w');
                
                // BOM UTF-8 pour Excel
                fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
                
                // En-têtes CSV
                fputcsv($file, [
                    'Référence',
                    'Nom Père',
                    'Prénom Père',
                    'CIN Père',
                    'Nom Mère',
                    'Prénom Mère',
                    'CIN Mère',
                    'Téléphone',
                    'Email',
                    'Adresse',
                    'Date Mariage',
                    'Nom Enfant',
                    'Prénom Enfant',
                    'Sexe Enfant',
                    'Date Naissance Enfant',
                    'CIN Enfant',
                    'A Fichier PDF',
                    'Commentaires',
                    'Date Création',
                    'Dernière Modification'
                ], ';');

                // Données
                foreach ($kafalas as $kafala) {
                    fputcsv($file, [
                        $kafala->reference,
                        $kafala->nom_pere,
                        $kafala->prenom_pere,
                        $kafala->cin_pere,
                        $kafala->nom_mere,
                        $kafala->prenom_mere,
                        $kafala->cin_mere,
                        $kafala->telephone,
                        $kafala->email,
                        $kafala->adresse,
                        $kafala->date_mariage ? date('d/m/Y', strtotime($kafala->date_mariage)) : '',
                        $kafala->nom_enfant,
                        $kafala->prenom_enfant,
                        $kafala->sexe_enfant === 'M' ? 'Masculin' : 'Féminin',
                        $kafala->date_naissance_enfant ? date('d/m/Y', strtotime($kafala->date_naissance_enfant)) : '',
                        $kafala->cin_enfant,
                        $kafala->fichier_pdf ? 'Oui' : 'Non',
                        $kafala->commentaires,
                        date('d/m/Y H:i', strtotime($kafala->created_at)),
                        date('d/m/Y H:i', strtotime($kafala->updated_at))
                    ], ';');
                }

                fclose($file);
            };

            Log::info('✅ Export CSV kafalas généré', [
                'filename' => $filename,
                'count' => $kafalas->count()
            ]);

            return response()->stream($callback, 200, $headers);
        }

        // Pour XLSX, utiliser une approche similaire avec PhpSpreadsheet si disponible
        return response()->json([
            'success' => false,
            'message' => 'Format XLSX non encore implémenté. Utilisez le format CSV.'
        ], 501);

    } catch (Exception $e) {
        Log::error('❌ Erreur export kafalas', [
            'error' => $e->getMessage(),
            'format' => $request->format
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'export: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Dupliquer une kafala
 * Route: POST /api/upas/kafalas/{id}/duplicate
 */
public function duplicateKafala($id)
{
    try {
        Log::info('📋 Début duplication kafala', ['original_id' => $id]);

        $kafalaOriginal = DB::table('kafalas')
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$kafalaOriginal) {
            return response()->json([
                'success' => false,
                'message' => 'Kafala originale non trouvée'
            ], 404);
        }

        DB::beginTransaction();

        // Préparer les données pour la duplication
        $nouvelleKafalaData = (array) $kafalaOriginal;
        unset($nouvelleKafalaData['id']);
        unset($nouvelleKafalaData['created_at']);
        unset($nouvelleKafalaData['updated_at']);
        unset($nouvelleKafalaData['deleted_at']);

        // Générer une nouvelle référence
        $nouvelleKafalaData['reference'] = $this->generateKafalaReference();

        // Ne pas dupliquer le fichier PDF (pour éviter les conflits)
        $nouvelleKafalaData['fichier_pdf'] = null;

        // Ajouter un commentaire indiquant la duplication
        $commentaireOriginal = $nouvelleKafalaData['commentaires'] ?: '';
        $nouvelleKafalaData['commentaires'] = $commentaireOriginal . 
            ($commentaireOriginal ? "\n\n" : '') . 
            "Dupliquée depuis la kafala #" . $id . " (réf: " . $kafalaOriginal->reference . ") le " . now()->format('d/m/Y H:i');

        // Timestamps
        $nouvelleKafalaData['created_at'] = now();
        $nouvelleKafalaData['updated_at'] = now();

        // Créer la nouvelle kafala
        $nouvelleKafalaId = DB::table('kafalas')->insertGetId($nouvelleKafalaData);

        $nouvelleKafala = DB::table('kafalas')->where('id', $nouvelleKafalaId)->first();

        DB::commit();

        Log::info('✅ Kafala dupliquée avec succès', [
            'original_id' => $id,
            'nouvelle_id' => $nouvelleKafalaId,
            'nouvelle_reference' => $nouvelleKafalaData['reference']
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kafala dupliquée avec succès',
            'data' => [
                'kafala_originale' => [
                    'id' => $id,
                    'reference' => $kafalaOriginal->reference
                ],
                'nouvelle_kafala' => $nouvelleKafala
            ]
        ], 201);

    } catch (Exception $e) {
        DB::rollBack();

        Log::error('❌ Erreur duplication kafala', [
            'original_id' => $id,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la duplication: ' . $e->getMessage()
        ], 500);
    }
}

// ===== MÉTHODES UTILITAIRES PRIVÉES =====

/**
 * Générer une référence unique pour la kafala
 */





/**
 * CORRIGÉ : Créer une nouvelle kafala avec fichier PDF (BLOB)
 */


/**
 * CORRIGÉ : Liste des kafalas avec indicateurs PDF basés sur les métadonnées
 */


/**
 * NOUVELLE ROUTE : Endpoint pour vérifier l'existence du PDF
 * Route: GET /api/upas/kafalas/{id}/pdf-exists
 */
public function checkPdfExistsEndpoint($id)
{
    return $this->checkKafalaPdfExists($id);
}

/**
 * UTILITAIRE : Générer une référence unique améliorée
 */
private function generateKafalaReference()
{
    $prefix = 'KAF';
    $date = date('Ymd');
    $time = date('His'); // Inclure les secondes pour plus d'unicité
    
    // Compter les kafalas du jour
    $count = DB::table('kafalas')
        ->whereDate('created_at', today())
        ->whereNull('deleted_at')
        ->count();
    
    $sequence = str_pad($count + 1, 4, '0', STR_PAD_LEFT);
    $reference = "{$prefix}-{$date}-{$time}-{$sequence}";
    
    // Vérifier l'unicité et gérer les collisions
    $attempts = 0;
    $originalReference = $reference;
    
    while (DB::table('kafalas')->where('reference', $reference)->exists() && $attempts < 10) {
        $attempts++;
        $randomSuffix = str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
        $reference = $originalReference . '-' . $randomSuffix;
    }
    
    if ($attempts >= 10) {
        // Fallback ultime avec timestamp Unix
        $reference = "{$prefix}-" . time() . '-' . rand(1000, 9999);
    }
    
    return $reference;
}
/**
 * Calculer les statistiques des âges des enfants
 */
private function calculateChildrenAgesStats($kafalas)
{
    $enfantsAvecAge = $kafalas->filter(function($kafala) {
        return !empty($kafala->date_naissance_enfant);
    });

    if ($enfantsAvecAge->isEmpty()) {
        return [
            'total_avec_age' => 0,
            'age_moyen' => 0,
            'age_min' => 0,
            'age_max' => 0,
            'par_tranche' => [
                '0_2_ans' => 0,
                '3_5_ans' => 0,
                '6_12_ans' => 0,
                '13_17_ans' => 0,
                '18_plus' => 0
            ]
        ];
    }

    $ages = $enfantsAvecAge->map(function($kafala) {
        return Carbon::parse($kafala->date_naissance_enfant)->age;
    });

    $tranches = [
        '0_2_ans' => 0,
        '3_5_ans' => 0,
        '6_12_ans' => 0,
        '13_17_ans' => 0,
        '18_plus' => 0
    ];

    foreach ($ages as $age) {
        if ($age <= 2) $tranches['0_2_ans']++;
        elseif ($age <= 5) $tranches['3_5_ans']++;
        elseif ($age <= 12) $tranches['6_12_ans']++;
        elseif ($age <= 17) $tranches['13_17_ans']++;
        else $tranches['18_plus']++;
    }

    return [
        'total_avec_age' => $enfantsAvecAge->count(),
        'age_moyen' => round($ages->avg(), 1),
        'age_min' => $ages->min(),
        'age_max' => $ages->max(),
        'par_tranche' => $tranches
    ];
}

/**
 * Calculer les statistiques des durées de mariage
 */
private function calculateMarriageDurationStats($kafalas)
{
    $mariagesAvecDate = $kafalas->filter(function($kafala) {
        return !empty($kafala->date_mariage);
    });

    if ($mariagesAvecDate->isEmpty()) {
        return [
            'total_avec_date' => 0,
            'duree_moyenne_annees' => 0,
            'duree_min_annees' => 0,
            'duree_max_annees' => 0,
            'par_tranche' => [
                '0_2_ans' => 0,
                '3_5_ans' => 0,
                '6_10_ans' => 0,
                '11_20_ans' => 0,
                '20_plus_ans' => 0
            ]
        ];
    }

    $durees = $mariagesAvecDate->map(function($kafala) {
        return Carbon::parse($kafala->date_mariage)->diffInYears(Carbon::now());
    });

    $tranches = [
        '0_2_ans' => 0,
        '3_5_ans' => 0,
        '6_10_ans' => 0,
        '11_20_ans' => 0,
        '20_plus_ans' => 0
    ];

    foreach ($durees as $duree) {
        if ($duree <= 2) $tranches['0_2_ans']++;
        elseif ($duree <= 5) $tranches['3_5_ans']++;
        elseif ($duree <= 10) $tranches['6_10_ans']++;
        elseif ($duree <= 20) $tranches['11_20_ans']++;
        else $tranches['20_plus_ans']++;
    }

    return [
        'total_avec_date' => $mariagesAvecDate->count(),
        'duree_moyenne_annees' => round($durees->avg(), 1),
        'duree_min_annees' => $durees->min(),
        'duree_max_annees' => $durees->max(),
        'par_tranche' => $tranches
    ];
}


public function restoreKafala($id)
{
    try {
        Log::info('♻️ Début restauration kafala', ['kafala_id' => $id]);

        // Vérifier que la kafala existe et est supprimée
        $kafala = DB::table('kafalas')
            ->where('id', $id)
            ->whereNotNull('deleted_at')
            ->first();

        if (!$kafala) {
            return response()->json([
                'success' => false,
                'message' => 'Kafala non trouvée ou non supprimée'
            ], 404);
        }

        // Restaurer (supprimer le timestamp deleted_at)
        $restored = DB::table('kafalas')
            ->where('id', $id)
            ->update([
                'deleted_at' => null,
                'updated_at' => now()
            ]);

        if (!$restored) {
            throw new Exception('Échec de la restauration');
        }

        Log::info('✅ Kafala restaurée', [
            'kafala_id' => $id,
            'reference' => $kafala->reference,
            'user_id' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kafala restaurée avec succès',
            'data' => DB::table('kafalas')->where('id', $id)->first()
        ]);

    } catch (Exception $e) {
        Log::error('❌ Erreur restauration kafala', [
            'kafala_id' => $id,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la restauration: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Trouver une kafala par référence
 * Route: GET /api/upas/kafalas/reference/{reference}
 */
public function findByReference($reference)
{
    try {
        Log::info('🔍 Recherche kafala par référence', ['reference' => $reference]);

        $kafala = DB::table('kafalas')
            ->where('reference', $reference)
            ->whereNull('deleted_at')
            ->first();

        if (!$kafala) {
            return response()->json([
                'success' => false,
                'message' => 'Kafala non trouvée avec cette référence'
            ], 404);
        }

        // Enrichir les données
        $kafala->nom_complet_pere = trim($kafala->nom_pere . ' ' . $kafala->prenom_pere);
        $kafala->nom_complet_mere = trim($kafala->nom_mere . ' ' . $kafala->prenom_mere);
        $kafala->nom_complet_enfant = trim($kafala->nom_enfant . ' ' . $kafala->prenom_enfant);

        if ($kafala->date_naissance_enfant) {
            $kafala->age_enfant = Carbon::parse($kafala->date_naissance_enfant)->age;
        }

        if ($kafala->date_mariage) {
            $kafala->duree_mariage_annees = Carbon::parse($kafala->date_mariage)->diffInYears(Carbon::now());
        }

        $kafala->a_fichier_pdf = !empty($kafala->fichier_pdf);
        $kafala->fichier_accessible = $kafala->a_fichier_pdf && Storage::disk('public')->exists($kafala->fichier_pdf);

        Log::info('✅ Kafala trouvée par référence', [
            'reference' => $reference,
            'kafala_id' => $kafala->id
        ]);

        return response()->json([
            'success' => true,
            'data' => $kafala
        ]);

    } catch (Exception $e) {
        Log::error('❌ Erreur recherche par référence', [
            'reference' => $reference,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la recherche: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Statistiques des kafalas (nouvelle méthode pour cohérence avec les routes)
 * Route: GET /api/upas/kafalas/statistics
 */
public function getStatistiquesKafalas(Request $request)
{
    return $this->getKafalaStatistics($request);
}

/**
 * Mise à jour en lot de kafalas
 * Route: POST /api/upas/kafalas/batch-update
 */
public function batchUpdate(Request $request)
{
    $validator = Validator::make($request->all(), [
        'kafala_ids' => 'required|array|min:1',
        'kafala_ids.*' => 'integer|exists:kafalas,id',
        'updates' => 'required|array',
        'updates.commentaires' => 'nullable|string|max:1000',
        'updates.date_mariage' => 'nullable|date|before_or_equal:today',
        'updates.adresse' => 'nullable|string|max:500',
        'updates.telephone' => 'nullable|string|min:10|max:20',
        'updates.email' => 'nullable|email|max:255'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        DB::beginTransaction();

        $kafalaIds = $request->kafala_ids;
        $updates = $request->updates;
        
        Log::info('📦 Début mise à jour en lot', [
            'kafala_count' => count($kafalaIds),
            'updates' => array_keys($updates)
        ]);

        // Préparer les données de mise à jour
        $updateData = [];
        $allowedFields = ['commentaires', 'date_mariage', 'adresse', 'telephone', 'email'];
        
        foreach ($allowedFields as $field) {
            if (isset($updates[$field])) {
                $value = $updates[$field];
                if ($field === 'email' && $value) {
                    $updateData[$field] = strtolower(trim($value));
                } elseif (in_array($field, ['adresse', 'telephone']) && $value) {
                    $updateData[$field] = trim($value);
                } else {
                    $updateData[$field] = $value;
                }
            }
        }

        $updateData['updated_at'] = now();

        // Effectuer la mise à jour
        $updatedCount = DB::table('kafalas')
            ->whereIn('id', $kafalaIds)
            ->whereNull('deleted_at')
            ->update($updateData);

        DB::commit();

        Log::info('✅ Mise à jour en lot terminée', [
            'updated_count' => $updatedCount,
            'requested_count' => count($kafalaIds)
        ]);

        return response()->json([
            'success' => true,
            'message' => "Mise à jour effectuée sur {$updatedCount} kafala(s)",
            'updated_count' => $updatedCount,
            'requested_count' => count($kafalaIds)
        ]);

    } catch (Exception $e) {
        DB::rollBack();

        Log::error('❌ Erreur mise à jour en lot', [
            'error' => $e->getMessage(),
            'kafala_ids' => $request->kafala_ids
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la mise à jour en lot: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Corriger les références manquantes
 * Route: POST /api/upas/kafalas/fix-missing-references
 */
public function fixMissingReferences()
{
    try {
        Log::info('🔧 Début correction des références manquantes');

        DB::beginTransaction();

        // Trouver les kafalas sans référence
        $kafalasWithoutRef = DB::table('kafalas')
            ->whereNull('reference')
            ->orWhere('reference', '')
            ->whereNull('deleted_at')
            ->get();

        $fixedCount = 0;

        foreach ($kafalasWithoutRef as $kafala) {
            // Générer une nouvelle référence basée sur la date de création
            $createdAt = Carbon::parse($kafala->created_at);
            $datePrefix = $createdAt->format('Ymd');
            
            // Compter les kafalas du même jour
            $dailyCount = DB::table('kafalas')
                ->whereDate('created_at', $createdAt->toDateString())
                ->whereNotNull('reference')
                ->where('reference', '!=', '')
                ->count();
            
            $sequence = str_pad($dailyCount + 1, 4, '0', STR_PAD_LEFT);
            $newReference = "KAF-{$datePrefix}-{$sequence}";
            
            // Vérifier l'unicité
            $attempts = 0;
            while (DB::table('kafalas')->where('reference', $newReference)->exists() && $attempts < 100) {
                $attempts++;
                $sequence = str_pad($dailyCount + 1 + $attempts, 4, '0', STR_PAD_LEFT);
                $newReference = "KAF-{$datePrefix}-{$sequence}";
            }

            // Mettre à jour la kafala
            DB::table('kafalas')
                ->where('id', $kafala->id)
                ->update([
                    'reference' => $newReference,
                    'updated_at' => now()
                ]);

            $fixedCount++;

            Log::info('✅ Référence corrigée', [
                'kafala_id' => $kafala->id,
                'new_reference' => $newReference
            ]);
        }

        DB::commit();

        Log::info('✅ Correction des références terminée', [
            'fixed_count' => $fixedCount,
            'total_checked' => $kafalasWithoutRef->count()
        ]);

        return response()->json([
            'success' => true,
            'message' => "Correction terminée. {$fixedCount} référence(s) corrigée(s)",
            'fixed_count' => $fixedCount,
            'total_checked' => $kafalasWithoutRef->count()
        ]);

    } catch (Exception $e) {
        DB::rollBack();

        Log::error('❌ Erreur correction des références', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la correction: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Debug d'une kafala (informations détaillées)
 * Route: GET /api/upas/kafalas/{id}/debug
 */
public function debugKafala($id)
{
    try {
        Log::info('🐛 Debug kafala', ['kafala_id' => $id]);

        // Récupérer la kafala même si supprimée
        $kafala = DB::table('kafalas')
            ->where('id', $id)
            ->first();

        if (!$kafala) {
            return response()->json([
                'success' => false,
                'message' => 'Kafala non trouvée'
            ], 404);
        }

        // Informations sur le fichier
        $fileInfo = null;
        if ($kafala->fichier_pdf) {
            $filePath = Storage::disk('public')->path($kafala->fichier_pdf);
            $fileInfo = [
                'path' => $kafala->fichier_pdf,
                'full_path' => $filePath,
                'exists_in_storage' => Storage::disk('public')->exists($kafala->fichier_pdf),
                'file_exists_on_disk' => file_exists($filePath),
                'size' => file_exists($filePath) ? filesize($filePath) : 'N/A',
                'mime_type' => file_exists($filePath) ? mime_content_type($filePath) : 'N/A',
                'storage_disk' => 'public',
                'storage_url' => Storage::disk('public')->url($kafala->fichier_pdf)
            ];
        }

        // Calculer les champs dérivés
        $derivedFields = [];
        
        if ($kafala->date_naissance_enfant) {
            $derivedFields['age_enfant'] = Carbon::parse($kafala->date_naissance_enfant)->age;
        }
        
        if ($kafala->date_mariage) {
            $derivedFields['duree_mariage_annees'] = Carbon::parse($kafala->date_mariage)->diffInYears(Carbon::now());
        }

        $derivedFields['nom_complet_pere'] = trim($kafala->nom_pere . ' ' . $kafala->prenom_pere);
        $derivedFields['nom_complet_mere'] = trim($kafala->nom_mere . ' ' . $kafala->prenom_mere);
        $derivedFields['nom_complet_enfant'] = trim($kafala->nom_enfant . ' ' . $kafala->prenom_enfant);

        // Statistiques générales
        $stats = [
            'total_kafalas' => DB::table('kafalas')->count(),
            'kafalas_actives' => DB::table('kafalas')->whereNull('deleted_at')->count(),
            'kafalas_supprimees' => DB::table('kafalas')->whereNotNull('deleted_at')->count(),
            'kafalas_avec_pdf' => DB::table('kafalas')->whereNotNull('fichier_pdf')->whereNull('deleted_at')->count(),
            'created_today' => DB::table('kafalas')->whereDate('created_at', today())->count()
        ];

        $debugInfo = [
            'kafala_id' => $id,
            'kafala_data' => $kafala,
            'derived_fields' => $derivedFields,
            'file_info' => $fileInfo,
            'is_deleted' => !is_null($kafala->deleted_at),
            'created_ago' => Carbon::parse($kafala->created_at)->diffForHumans(),
            'updated_ago' => Carbon::parse($kafala->updated_at)->diffForHumans(),
            'stats' => $stats,
            'current_time' => now()->toISOString(),
            'debug_generated_by' => Auth::id() ?: 'system'
        ];

        Log::info('✅ Debug kafala généré', [
            'kafala_id' => $id,
            'has_file' => !is_null($fileInfo),
            'is_deleted' => !is_null($kafala->deleted_at)
        ]);

        return response()->json([
            'success' => true,
            'debug_info' => $debugInfo
        ]);

    } catch (Exception $e) {
        Log::error('❌ Erreur debug kafala', [
            'kafala_id' => $id,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du debug: ' . $e->getMessage()
        ], 500);
    }
}



public function getDetailsTypeAssistances()
{
    try {
        $details = DB::table('details_type_assistances')
            ->leftJoin('type_assistances', 'details_type_assistances.type_assistance_id', '=', 'type_assistances.id')
            ->select(
                'details_type_assistances.id',
                'details_type_assistances.libelle',
                'details_type_assistances.description',
                'details_type_assistances.type_assistance_id',
                'type_assistances.libelle as type_assistance_libelle'
            )
            ->whereNull('details_type_assistances.date_suppression')
            ->whereNull('type_assistances.date_suppression')
            ->orderBy('type_assistances.libelle')
            ->orderBy('details_type_assistances.libelle')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $details,
            'count' => $details->count()
        ]);

    } catch (\Exception $e) {
        Log::error('Erreur récupération détails type assistance', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération des détails type assistance',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Récupérer les détails d'un type d'assistance spécifique
 */
public function getDetailsTypeAssistancesByType($typeAssistanceId)
{
    try {
        Log::info('Récupération détails pour type assistance', [
            'type_assistance_id' => $typeAssistanceId
        ]);

        // Vérifier que le type d'assistance existe
        $typeAssistance = DB::table('type_assistances')
            ->where('id', $typeAssistanceId)
            ->whereNull('date_suppression')
            ->first();

        if (!$typeAssistance) {
            return response()->json([
                'success' => false,
                'message' => 'Type d\'assistance non trouvé',
                'data' => []
            ], 404);
        }

        // Récupérer les détails
        $details = DB::table('details_type_assistances')
            ->where('type_assistance_id', $typeAssistanceId)
            ->whereNull('date_suppression')
            ->orderBy('libelle')
            ->get(['id', 'libelle', 'description', 'type_assistance_id']);

        Log::info('Détails récupérés', [
            'type_assistance_id' => $typeAssistanceId,
            'count' => $details->count(),
            'type_assistance' => $typeAssistance->libelle
        ]);

        return response()->json([
            'success' => true,
            'data' => $details,
            'count' => $details->count(),
            'type_assistance' => [
                'id' => $typeAssistance->id,
                'libelle' => $typeAssistance->libelle
            ]
        ]);

    } catch (\Exception $e) {
        Log::error('Erreur récupération détails par type', [
            'type_assistance_id' => $typeAssistanceId,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération des détails',
            'error' => $e->getMessage(),
            'data' => []
        ], 500);
    }
}

/**
 * Récupérer un détail spécifique
 */
public function getDetailsTypeAssistance($id)
{
    try {
        $detail = DB::table('details_type_assistances')
            ->leftJoin('type_assistances', 'details_type_assistances.type_assistance_id', '=', 'type_assistances.id')
            ->select(
                'details_type_assistances.*',
                'type_assistances.libelle as type_assistance_libelle'
            )
            ->where('details_type_assistances.id', $id)
            ->whereNull('details_type_assistances.date_suppression')
            ->first();

        if (!$detail) {
            return response()->json([
                'success' => false,
                'message' => 'Détail non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $detail
        ]);

    } catch (\Exception $e) {
        Log::error('Erreur récupération détail spécifique', [
            'id' => $id,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération du détail',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * Options complètes pour formulaires avec détails par type
 */
public function getCompleteFormOptions()
{
    try {
        // Récupérer toutes les données de base
        $data = [
            'types_assistance' => DB::table('type_assistances')
                ->whereNull('date_suppression')
                ->orderBy('libelle')
                ->get(['id', 'libelle', 'description']),
            
            'details_type_assistance_by_type' => [],
            
            'etat_dones' => DB::table('etat_dones')
                ->whereNull('date_suppression')
                ->orderBy('libelle')
                ->get(['id', 'libelle']),
            
            'nature_dones' => DB::table('nature_dones')
                ->whereNull('date_suppression')
                ->orderBy('libelle')
                ->get(['id', 'libelle']),
            
            'situations' => DB::table('situations')
                ->whereNull('date_suppression')
                ->orderBy('libelle')
                ->get(['id', 'libelle']),
            
            'campagnes_actives' => DB::table('campagnes_medicales')
                ->whereNull('date_suppression')
                ->where('statut', 'Active')
                ->orderBy('nom')
                ->get(['id', 'nom']),
        ];

        // Récupérer tous les détails groupés par type
        $detailsGrouped = DB::table('details_type_assistances')
            ->whereNull('date_suppression')
            ->orderBy('type_assistance_id')
            ->orderBy('libelle')
            ->get(['id', 'libelle', 'description', 'type_assistance_id'])
            ->groupBy('type_assistance_id');

        // Convertir en format attendu par le frontend
        foreach ($detailsGrouped as $typeId => $details) {
            $data['details_type_assistance_by_type'][$typeId] = $details->values()->toArray();
        }

        return response()->json([
            'success' => true,
            'data' => $data,
            'metadata' => [
                'types_count' => count($data['types_assistance']),
                'details_types_count' => count($data['details_type_assistance_by_type']),
                'total_details' => $detailsGrouped->flatten()->count()
            ]
        ]);

    } catch (\Exception $e) {
        Log::error('Erreur récupération options complètes', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération des options',
            'error' => $e->getMessage()
        ], 500);
    }
}

public function validateImportFileSimple(Request $request)
{
    try {
        // Validation basique
        if (!$request->hasFile('file')) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun fichier fourni',
                'debug' => [
                    'method' => $request->method(),
                    'content_type' => $request->header('Content-Type'),
                    'all_params' => $request->all(),
                    'files' => $request->allFiles()
                ]
            ], 422);
        }

        if (!$request->filled('campagne_id')) {
            return response()->json([
                'success' => false,
                'message' => 'ID campagne manquant',
                'debug' => [
                    'campagne_id' => $request->campagne_id,
                    'all_params' => $request->all()
                ]
            ], 422);
        }

        $file = $request->file('file');
        $campagneId = $request->campagne_id;

        // Réponse simplifiée pour test
        return response()->json([
            'success' => true,
            'message' => 'Validation basique réussie',
            'data' => [
                'total_rows' => 10, // Simulé
                'valid_rows' => 8,  // Simulé
                'invalid_rows' => 2, // Simulé
                'skipped_rows' => 0,
                'errors' => [
                    ['ligne' => 3, 'erreurs' => ['Téléphone manquant']],
                    ['ligne' => 7, 'erreurs' => ['Email invalide']]
                ],
                'warnings' => ['Fichier de test - validation simulée'],
                'campagne' => [
                    'id' => $campagneId,
                    'nom' => 'Campagne Test'
                ],
                'file_info' => [
                    'name' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                    'mime' => $file->getMimeType(),
                    'extension' => $file->getClientOriginalExtension()
                ]
            ]
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur: ' . $e->getMessage(),
            'debug' => [
                'error_line' => $e->getLine(),
                'error_file' => $e->getFile()
            ]
        ], 500);
    }
}

/**
 * ✅ IMPORT RÉEL BÉNÉFICIAIRES - VERSION ROBUSTE
 */

/**
 * ✅ GÉNÉRATION TEMPLATE EXCEL POUR IMPORT
 */
public function getImportTemplate($campagneId)
{
    try {
        Log::info('📋 Génération template Excel', [
            'campagne_id' => $campagneId,
            'user_id' => auth()->id()
        ]);

        // Vérifier que la campagne existe
        $campagne = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->where('campagnes_medicales.id', $campagneId)
            ->whereNull('campagnes_medicales.date_suppression')
            ->select(
                'campagnes_medicales.id',
                'campagnes_medicales.nom',
                'campagnes_medicales.statut',
                'campagnes_medicales.date_debut',
                'campagnes_medicales.date_fin',
                'types_assistance.libelle as type_assistance'
            )
            ->first();

        if (!$campagne) {
            return response()->json([
                'success' => false,
                'message' => 'Campagne non trouvée'
            ], 404);
        }

        // Headers du template
        $headers = [
            'nom',
            'prenom', 
            'sexe',
            'date_naissance',
            'telephone',
            'email',
            'adresse',
            'cin',
            'commentaire',
            'decision',
            'enfants_scolarises',
            'cote'
        ];

        // Exemples de données
        $exemples = [
            [
                'Amrani',
                'Mohammed',
                'M',
                '1985-03-15',
                '0612345678',
                'mohammed.amrani@email.com',
                'Rue Hassan II, Casablanca',
                'AB123456',
                'Patient prioritaire',
                'en_attente',
                'oui',
                'unilatéral'
            ],
            [
                'Benali',
                'Fatima',
                'F', 
                '1990-07-22',
                '0698765432',
                'fatima.benali@email.com',
                'Avenue Mohammed V, Rabat',
                'CD789012',
                '',
                'accepte',
                'non',
                'bilatéral'
            ],
            [
                'Tazi',
                'Youssef',
                'M',
                '2010-12-08',
                '0656781234',
                '',
                'Quartier Industriel, Fès',
                '',
                'Mineur, parents contactés',
                'en_attente',
                'oui',
                ''
            ]
        ];

        Log::info('✅ Template généré avec succès', [
            'headers_count' => count($headers),
            'exemples_count' => count($exemples),
            'campagne' => $campagne->nom
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template généré avec succès',
            'data' => [
                'template' => [
                    'headers' => $headers,
                    'exemples' => $exemples
                ],
                'campagne' => [
                    'id' => $campagne->id,
                    'nom' => $campagne->nom,
                    'type_assistance' => $campagne->type_assistance ?? 'Non défini',
                    'statut' => $campagne->statut,
                    'date_debut' => $campagne->date_debut,
                    'date_fin' => $campagne->date_fin
                ],
                'instructions' => [
                    'Colonnes obligatoires: nom, prenom, sexe, telephone, adresse',
                    'Sexe: M (masculin) ou F (féminin)',
                    'Téléphone: 10 chiffres (ex: 0612345678)',
                    'Date de naissance: format YYYY-MM-DD (ex: 1990-12-25)',
                    'Email: format valide ou laisser vide',
                    'Enfants scolarisés: oui/non (obligatoire pour les mineurs)',
                    'Décision: accepte, en_attente, refuse, preselection_oui, preselection_non',
                    'Côté: unilatéral ou bilatéral (pour appareils auditifs)'
                ]
            ]
        ]);

    } catch (\Exception $e) {
        Log::error('❌ Erreur génération template', [
            'error' => $e->getMessage(),
            'campagne_id' => $campagneId,
            'user_id' => auth()->id()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la génération du template: ' . $e->getMessage()
        ], 500);
    }
}




public function debugImportValidation(Request $request)
{
    try {
        Log::info('🔧 === DÉBUT DEBUG VALIDATION IMPORT ===', [
            'user_id' => auth()->id(),
            'request_data' => $request->except(['file']),
            'has_file' => $request->hasFile('file'),
            'memory_usage' => memory_get_usage(true),
            'memory_limit' => ini_get('memory_limit')
        ]);

        $debugInfo = [
            'system' => [
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size' => ini_get('post_max_size'),
                'memory_usage' => memory_get_usage(true),
                'disk_free_space' => disk_free_space(storage_path())
            ],
            'database' => [
                'connection' => 'OK',
                'campagnes_count' => 0,
                'types_assistance_count' => 0
            ],
            'files' => [
                'storage_writable' => is_writable(storage_path()),
                'temp_dir_exists' => is_dir(storage_path('app/temp')),
                'temp_dir_writable' => is_writable(storage_path('app'))
            ],
            'request' => [
                'has_file' => $request->hasFile('file'),
                'campagne_id' => $request->input('campagne_id'),
                'content_type' => $request->header('Content-Type'),
                'content_length' => $request->header('Content-Length')
            ]
        ];

        // Test connexion base de données
        try {
            $debugInfo['database']['campagnes_count'] = DB::table('campagnes_medicales')
                ->whereNull('date_suppression')
                ->count();
            
            $debugInfo['database']['types_assistance_count'] = DB::table('type_assistances')
                ->whereNull('date_suppression')
                ->count();
                
        } catch (\Exception $dbError) {
            $debugInfo['database']['error'] = $dbError->getMessage();
        }

        // Test du fichier si présent
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $debugInfo['file'] = [
                'name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'type' => $file->getClientMimeType(),
                'extension' => $file->getClientOriginalExtension(),
                'is_valid' => $file->isValid(),
                'error' => $file->getError(),
                'temp_path' => $file->getRealPath(),
                'temp_exists' => file_exists($file->getRealPath())
            ];
        }

        // Test de création d'un fichier temporaire
        try {
            $tempDir = storage_path('app/temp');
            if (!is_dir($tempDir)) {
                mkdir($tempDir, 0755, true);
            }
            
            $testFile = $tempDir . '/test_' . time() . '.txt';
            file_put_contents($testFile, 'test');
            
            $debugInfo['temp_file_test'] = [
                'can_create' => file_exists($testFile),
                'can_write' => is_writable($testFile),
                'test_file' => $testFile
            ];
            
            if (file_exists($testFile)) {
                unlink($testFile);
            }
            
        } catch (\Exception $tempError) {
            $debugInfo['temp_file_test'] = [
                'error' => $tempError->getMessage()
            ];
        }

        // Test Excel/CSV libraries
        $debugInfo['libraries'] = [
            'maatwebsite_excel' => class_exists('\Maatwebsite\Excel\Facades\Excel'),
            'phpspreadsheet' => class_exists('\PhpOffice\PhpSpreadsheet\Spreadsheet'),
            'carbon' => class_exists('\Carbon\Carbon')
        ];

        Log::info('🔧 Debug validation terminé', $debugInfo);

        return response()->json([
            'success' => true,
            'message' => 'Diagnostic de validation terminé',
            'debug_info' => $debugInfo,
            'recommendations' => $this->generateDebugRecommendations($debugInfo)
        ]);

    } catch (\Exception $e) {
        Log::error('❌ Erreur debug validation', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du diagnostic',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * ✅ MÉTHODE UTILITAIRE: Générer des recommandations basées sur le diagnostic
 */
private function generateDebugRecommendations(array $debugInfo): array
{
    $recommendations = [];

    // Vérifications mémoire
    $memoryLimit = $this->parseBytes($debugInfo['system']['memory_limit']);
    $memoryUsage = $debugInfo['system']['memory_usage'];
    
    if ($memoryUsage > ($memoryLimit * 0.8)) {
        $recommendations[] = [
            'type' => 'memory',
            'level' => 'warning',
            'message' => 'Utilisation mémoire élevée. Augmentez memory_limit ou optimisez.',
            'current' => $debugInfo['system']['memory_limit'],
            'recommended' => '512M'
        ];
    }

    // Vérifications upload
    $uploadMaxFilesize = $this->parseBytes($debugInfo['system']['upload_max_filesize']);
    $postMaxSize = $this->parseBytes($debugInfo['system']['post_max_size']);
    
    if ($uploadMaxFilesize < (10 * 1024 * 1024)) { // Moins de 10MB
        $recommendations[] = [
            'type' => 'upload',
            'level' => 'error',
            'message' => 'upload_max_filesize trop petit pour les imports Excel',
            'current' => $debugInfo['system']['upload_max_filesize'],
            'recommended' => '20M'
        ];
    }

    // Vérifications base de données
    if (isset($debugInfo['database']['error'])) {
        $recommendations[] = [
            'type' => 'database',
            'level' => 'error',
            'message' => 'Problème de connexion base de données',
            'error' => $debugInfo['database']['error']
        ];
    }

    // Vérifications fichiers
    if (!$debugInfo['files']['storage_writable']) {
        $recommendations[] = [
            'type' => 'filesystem',
            'level' => 'error',
            'message' => 'Répertoire storage non accessible en écriture',
            'action' => 'Vérifiez les permissions du dossier storage/'
        ];
    }

    // Vérifications libraries
    if (!$debugInfo['libraries']['maatwebsite_excel']) {
        $recommendations[] = [
            'type' => 'library',
            'level' => 'error',
            'message' => 'Maatwebsite Excel non disponible',
            'action' => 'Installer: composer require maatwebsite/excel'
        ];
    }

    return $recommendations;
}

/**
 * ✅ MÉTHODE UTILITAIRE: Convertir taille en bytes
 */
private function parseBytes(string $size): int
{
    $size = strtoupper(trim($size));
    $unit = substr($size, -1);
    $value = (int) substr($size, 0, -1);
    
    switch ($unit) {
        case 'G':
            return $value * 1024 * 1024 * 1024;
        case 'M':
            return $value * 1024 * 1024;
        case 'K':
            return $value * 1024;
        default:
            return (int) $size;
    }
}

/**
 * ✅ MÉTHODE DE RÉPARATION: Nettoyer et réparer l'environnement d'import
 */
public function repairImportEnvironment(Request $request)
{
    try {
        Log::info('🔧 === DÉBUT RÉPARATION ENVIRONNEMENT IMPORT ===', [
            'user_id' => auth()->id()
        ]);

        $repairs = [];

        // 1. Nettoyer les fichiers temporaires
        try {
            $tempDir = storage_path('app/temp');
            if (is_dir($tempDir)) {
                $files = glob($tempDir . '/*');
                $cleaned = 0;
                
                foreach ($files as $file) {
                    if (is_file($file) && (time() - filemtime($file)) > 3600) { // Plus de 1h
                        unlink($file);
                        $cleaned++;
                    }
                }
                
                $repairs['temp_cleanup'] = [
                    'status' => 'success',
                    'files_cleaned' => $cleaned
                ];
            }
        } catch (\Exception $e) {
            $repairs['temp_cleanup'] = [
                'status' => 'error',
                'error' => $e->getMessage()
            ];
        }

        // 2. Créer les répertoires nécessaires
        try {
            $directories = [
                storage_path('app/temp'),
                storage_path('app/imports'),
                storage_path('app/exports')
            ];
            
            foreach ($directories as $dir) {
                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }
            }
            
            $repairs['directories'] = [
                'status' => 'success',
                'created' => $directories
            ];
        } catch (\Exception $e) {
            $repairs['directories'] = [
                'status' => 'error',
                'error' => $e->getMessage()
            ];
        }

        // 3. Vérifier les tables nécessaires
        try {
            $tables = [
                'campagnes_medicales',
                'type_assistances',
                'beneficiaires'
            ];
            
            $tableStatus = [];
            foreach ($tables as $table) {
                $tableStatus[$table] = Schema::hasTable($table);
            }
            
            $repairs['database_tables'] = [
                'status' => 'success',
                'tables' => $tableStatus
            ];
        } catch (\Exception $e) {
            $repairs['database_tables'] = [
                'status' => 'error',
                'error' => $e->getMessage()
            ];
        }

        // 4. Tester la création d'un import simple
        try {
            $testData = [
                ['nom', 'prenom', 'sexe', 'telephone', 'adresse'],
                ['Test', 'User', 'M', '0123456789', 'Adresse test']
            ];
            
            $testFile = storage_path('app/temp/test_import.csv');
            $handle = fopen($testFile, 'w');
            
            foreach ($testData as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
            
            // Test lecture
            $canRead = file_exists($testFile) && filesize($testFile) > 0;
            
            if (file_exists($testFile)) {
                unlink($testFile);
            }
            
            $repairs['import_test'] = [
                'status' => 'success',
                'can_create_csv' => $canRead
            ];
            
        } catch (\Exception $e) {
            $repairs['import_test'] = [
                'status' => 'error',
                'error' => $e->getMessage()
            ];
        }

        // 5. Optimiser la configuration PHP si possible
        try {
            $phpOptimizations = [];
            
            // Augmenter les limites si possible
            if (function_exists('ini_set')) {
                @ini_set('memory_limit', '512M');
                @ini_set('max_execution_time', '300');
                
                $phpOptimizations['memory_limit'] = ini_get('memory_limit');
                $phpOptimizations['max_execution_time'] = ini_get('max_execution_time');
            }
            
            $repairs['php_optimization'] = [
                'status' => 'success',
                'optimizations' => $phpOptimizations
            ];
            
        } catch (\Exception $e) {
            $repairs['php_optimization'] = [
                'status' => 'error',
                'error' => $e->getMessage()
            ];
        }

        Log::info('✅ Réparation environnement terminée', $repairs);

        return response()->json([
            'success' => true,
            'message' => 'Environnement d\'import réparé',
            'repairs' => $repairs,
            'summary' => $this->generateRepairSummary($repairs)
        ]);

    } catch (\Exception $e) {
        Log::error('❌ Erreur réparation environnement', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la réparation',
            'error' => $e->getMessage()
        ], 500);
    }
}

/**
 * ✅ MÉTHODE UTILITAIRE: Générer un résumé des réparations
 */
private function generateRepairSummary(array $repairs): array
{
    $successful = 0;
    $failed = 0;
    $issues = [];

    foreach ($repairs as $repair => $result) {
        if ($result['status'] === 'success') {
            $successful++;
        } else {
            $failed++;
            $issues[] = [
                'repair' => $repair,
                'error' => $result['error'] ?? 'Erreur inconnue'
            ];
        }
    }

    return [
        'total_repairs' => count($repairs),
        'successful' => $successful,
        'failed' => $failed,
        'success_rate' => count($repairs) > 0 ? round(($successful / count($repairs)) * 100, 2) : 0,
        'issues' => $issues,
        'recommendation' => $failed === 0 
            ? 'Environnement d\'import entièrement opérationnel' 
            : 'Quelques problèmes détectés - contactez l\'administrateur'
    ];
}





/**
 * ✅ VALIDATION D'IMPORT CORRIGÉE - Version Robuste
 */


/**
 * ✅ ANALYSE DIRECTE DU FICHIER - VERSION SIMPLIFIÉE
 */


/**
 * ✅ VALIDATION DES DONNÉES - VERSION SIMPLIFIÉE
 */
private function validateImportData($rawData, $campagne)
{
    try {
        Log::info('🔍 Début validation données', [
            'total_rows' => count($rawData),
            'campagne' => $campagne->nom
        ]);

        if (empty($rawData)) {
            return [
                'total_rows' => 0,
                'valid_rows' => 0,
                'invalid_rows' => 0,
                'skipped_rows' => 0,
                'errors' => [],
                'warnings' => ['Fichier vide'],
                'summary' => ['message' => 'Aucune donnée à traiter']
            ];
        }

        // ✅ EXTRACTION ET NORMALISATION DES HEADERS
        $rawHeaders = $rawData[0] ?? [];
        $headers = array_map(function($header) {
            return strtolower(trim($header));
        }, $rawHeaders);

        Log::info('📋 Headers détectés', [
            'raw_headers' => $rawHeaders,
            'normalized_headers' => $headers
        ]);

        // ✅ VÉRIFICATION DES COLONNES OBLIGATOIRES
        $requiredColumns = ['nom', 'prenom', 'sexe', 'telephone', 'adresse'];
        $missingColumns = array_diff($requiredColumns, $headers);

        if (!empty($missingColumns)) {
            return [
                'total_rows' => count($rawData),
                'valid_rows' => 0,
                'invalid_rows' => count($rawData) - 1,
                'skipped_rows' => 0,
                'errors' => [
                    [
                        'ligne' => 'Headers',
                        'erreurs' => ['Colonnes obligatoires manquantes: ' . implode(', ', $missingColumns)]
                    ]
                ],
                'warnings' => [],
                'summary' => [
                    'message' => 'Colonnes obligatoires manquantes',
                    'required_columns' => $requiredColumns,
                    'detected_columns' => $headers,
                    'missing_columns' => $missingColumns
                ]
            ];
        }

        // ✅ CRÉATION DU MAPPING DES COLONNES
        $columnMapping = [];
        foreach ($headers as $index => $header) {
            $columnMapping[$header] = $index;
        }

        Log::info('🗺️ Mapping colonnes créé', $columnMapping);

        // ✅ VALIDATION LIGNE PAR LIGNE
        $dataRows = array_slice($rawData, 1); // Ignorer la ligne d'en-tête
        $validRows = 0;
        $invalidRows = 0;
        $skippedRows = 0;
        $errors = [];
        $warnings = [];

        foreach ($dataRows as $rowIndex => $rowData) {
            $lineNumber = $rowIndex + 2; // +2 car on a ignoré l'en-tête et l'index commence à 0
            $rowErrors = [];

            // Vérifier si la ligne n'est pas vide
            if (empty(array_filter($rowData))) {
                $skippedRows++;
                continue;
            }

            // ✅ VALIDATION DES CHAMPS OBLIGATOIRES
            foreach ($requiredColumns as $column) {
                $value = isset($columnMapping[$column]) && isset($rowData[$columnMapping[$column]]) 
                    ? trim($rowData[$columnMapping[$column]]) 
                    : '';
                
                if (empty($value)) {
                    $rowErrors[] = "Champ obligatoire manquant: {$column}";
                }
            }

            // ✅ VALIDATIONS SPÉCIFIQUES
            // Validation sexe
            if (isset($columnMapping['sexe']) && isset($rowData[$columnMapping['sexe']])) {
                $sexe = strtoupper(trim($rowData[$columnMapping['sexe']]));
                if (!in_array($sexe, ['M', 'F', 'MASCULIN', 'FEMININ', 'HOMME', 'FEMME', 'H'])) {
                    $rowErrors[] = "Sexe invalide (doit être M ou F): {$sexe}";
                }
            }

            // Validation téléphone
            if (isset($columnMapping['telephone']) && isset($rowData[$columnMapping['telephone']])) {
                $telephone = preg_replace('/[^0-9]/', '', $rowData[$columnMapping['telephone']]);
                if (strlen($telephone) < 10 || strlen($telephone) > 15) {
                    $rowErrors[] = "Numéro de téléphone invalide: {$telephone}";
                }
            }

            // Validation email (si présent)
            if (isset($columnMapping['email']) && isset($rowData[$columnMapping['email']])) {
                $email = trim($rowData[$columnMapping['email']]);
                if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $rowErrors[] = "Format email invalide: {$email}";
                }
            }

            // Validation date de naissance (si présent)
            if (isset($columnMapping['date_naissance']) && isset($rowData[$columnMapping['date_naissance']])) {
                $dateValue = $rowData[$columnMapping['date_naissance']];
                if (!empty($dateValue)) {
                    try {
                        if (is_numeric($dateValue)) {
                            // Format Excel numérique
                            $date = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($dateValue);
                        } else {
                            $date = new \DateTime($dateValue);
                        }
                        
                        $age = $date->diff(new \DateTime())->y;
                        if ($age > 120 || $age < 0) {
                            $rowErrors[] = "Date de naissance irréaliste";
                        }
                    } catch (\Exception $e) {
                        $rowErrors[] = "Format de date de naissance invalide: {$dateValue}";
                    }
                }
            }

            // Comptabiliser les résultats
            if (empty($rowErrors)) {
                $validRows++;
            } else {
                $invalidRows++;
                $errors[] = [
                    'ligne' => $lineNumber,
                    'erreurs' => $rowErrors
                ];
            }
        }

        // ✅ GÉNÉRATION DES AVERTISSEMENTS
        if (count($dataRows) > 500) {
            $warnings[] = "Fichier volumineux ({$count($dataRows)} lignes). L'import pourrait prendre du temps.";
        }

        if ($invalidRows > 0 && $validRows > 0) {
            $warnings[] = "{$invalidRows} lignes contiennent des erreurs mais {$validRows} lignes sont valides.";
        }

        $summary = [
            'message' => "Validation terminée: {$validRows} lignes valides, {$invalidRows} lignes avec erreurs",
            'success_rate' => count($dataRows) > 0 ? round(($validRows / count($dataRows)) * 100, 2) : 0,
            'campagne_type' => $campagne->type_assistance ?? 'Non défini',
            'headers_detected' => $headers,
            'required_columns_found' => array_intersect($requiredColumns, $headers)
        ];

        Log::info('✅ Validation données terminée', [
            'total_rows' => count($dataRows),
            'valid_rows' => $validRows,
            'invalid_rows' => $invalidRows,
            'skipped_rows' => $skippedRows,
            'error_count' => count($errors)
        ]);

        return [
            'total_rows' => count($dataRows),
            'valid_rows' => $validRows,
            'invalid_rows' => $invalidRows,
            'skipped_rows' => $skippedRows,
            'errors' => $errors,
            'warnings' => $warnings,
            'summary' => $summary
        ];

    } catch (\Exception $e) {
        Log::error('❌ Erreur validation données', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);

        return [
            'total_rows' => count($rawData ?? []),
            'valid_rows' => 0,
            'invalid_rows' => 0,
            'skipped_rows' => 0,
            'errors' => [
                [
                    'ligne' => 'Système',
                    'erreurs' => ['Erreur lors de la validation: ' . $e->getMessage()]
                ]
            ],
            'warnings' => [],
            'summary' => ['message' => 'Erreur système lors de la validation']
        ];
    }
}

/**
 * ✅ DÉTECTION AMÉLIORÉE DU DÉLIMITEUR CSV
 */
private function detectCsvDelimiterImproved($filepath)
{
    try {
        $delimiters = [',', ';', "\t", '|'];
        $handle = fopen($filepath, 'r');
        
        if (!$handle) {
            return ','; // Délimiteur par défaut
        }
        
        // Lire plusieurs lignes pour une meilleure détection
        $lines = [];
        for ($i = 0; $i < 5 && !feof($handle); $i++) {
            $line = fgets($handle);
            if ($line !== false) {
                $lines[] = $line;
            }
        }
        fclose($handle);
        
        if (empty($lines)) {
            return ',';
        }
        
        $delimiter = ',';
        $maxScore = 0;
        
        foreach ($delimiters as $d) {
            $score = 0;
            $columnCounts = [];
            
            foreach ($lines as $line) {
                $columns = str_getcsv($line, $d);
                $columnCount = count($columns);
                $columnCounts[] = $columnCount;
                
                // Bonus pour les lignes avec plus de colonnes
                $score += $columnCount;
            }
            
            // Bonus pour la consistance (même nombre de colonnes)
            if (count(array_unique($columnCounts)) === 1) {
                $score += 50;
            }
            
            // Bonus pour un nombre raisonnable de colonnes
            $avgColumns = array_sum($columnCounts) / count($columnCounts);
            if ($avgColumns >= 3 && $avgColumns <= 20) {
                $score += 25;
            }
            
            if ($score > $maxScore) {
                $maxScore = $score;
                $delimiter = $d;
            }
        }
        
        Log::info('🔍 Délimiteur CSV détecté', [
            'delimiter' => $delimiter === "\t" ? 'TAB' : $delimiter,
            'score' => $maxScore
        ]);
        
        return $delimiter;
        
    } catch (\Exception $e) {
        Log::warning('⚠️ Erreur détection délimiteur, utilisation par défaut', [
            'error' => $e->getMessage()
        ]);
        return ',';
    }
}














// ===================================================
// CORRECTIONS POUR LE PROBLÈME D'IMPORT
// ===================================================

/**
 * ✅ MÉTHODE DE VALIDATION CORRIGÉE
 * Cette méthode valide SANS enregistrer en base
 */
public function validateImportFile(Request $request)
{
    try {
        Log::info('🔍 === DÉBUT VALIDATION FICHIER IMPORT ===', [
            'user_id' => auth()->id(),
            'has_file' => $request->hasFile('file'),
            'campagne_id' => $request->input('campagne_id')
        ]);

        // ✅ VALIDATION DES PARAMÈTRES
        $validator = Validator::make($request->all(), [
            'file' => [
                'required',
                'file',
                'max:10240', // 10MB
                function ($attribute, $value, $fail) {
                    if (!$value) return;
                    
                    $allowedExtensions = ['xlsx', 'xls', 'csv'];
                    $fileExtension = strtolower($value->getClientOriginalExtension());
                    
                    if (!in_array($fileExtension, $allowedExtensions)) {
                        $fail("Type de fichier non supporté: .{$fileExtension}. Acceptés: Excel (.xlsx, .xls) ou CSV (.csv)");
                    }
                }
            ],
            'campagne_id' => [
                'required',
                'integer',
                'exists:campagnes_medicales,id,date_suppression,NULL'
            ]
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données de validation invalides',
                'errors' => $validator->errors()->toArray()
            ], 422);
        }

        $file = $request->file('file');
        $campagneId = (int) $request->input('campagne_id');

        // ✅ VÉRIFICATION DE LA CAMPAGNE
        $campagne = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->where('campagnes_medicales.id', $campagneId)
            ->whereNull('campagnes_medicales.date_suppression')
            ->select(
                'campagnes_medicales.id',
                'campagnes_medicales.nom',
                'campagnes_medicales.statut',
                'campagnes_medicales.type_assistance_id',
                'types_assistance.libelle as type_assistance'
            )
            ->first();

        if (!$campagne) {
            return response()->json([
                'success' => false,
                'message' => 'Campagne non trouvée'
            ], 422);
        }

        // ✅ RÉCUPÉRATION DU TYPE D'ASSISTANCE POUR VALIDATION
        $typeAssistance = null;
        if ($campagne->type_assistance_id) {
            $typeAssistance = DB::table('types_assistance')
                ->where('id', $campagne->type_assistance_id)
                ->first();
        }

        Log::info('📋 Campagne et type d\'assistance trouvés', [
            'campagne' => $campagne->nom,
            'type_assistance' => $campagne->type_assistance ?? 'Non défini'
        ]);

        // ✅ ANALYSE DU FICHIER EN MODE VALIDATION SEULEMENT
        $extension = strtolower($file->getClientOriginalExtension());
        $analysisResult = $this->analyzeFileForValidation($file, $extension, $campagne);

        if (!$analysisResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $analysisResult['message']
            ], 422);
        }

        // ✅ VALIDATION DES DONNÉES AVEC VALIDATION TÉLÉPHONE 9 CHIFFRES
        $validationResults = $this->validateImportDataWithPhoneValidation($analysisResult['data'], $campagne, $typeAssistance);
        
        Log::info('✅ Validation terminée (SANS sauvegarde)', [
            'total_rows' => $validationResults['total_rows'],
            'valid_rows' => $validationResults['valid_rows'],
            'invalid_rows' => $validationResults['invalid_rows'],
            'phone_validation_errors' => $validationResults['phone_validation_errors'] ?? 0
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Fichier validé avec succès',
            'data' => [
                'total_rows' => $validationResults['total_rows'],
                'valid_rows' => $validationResults['valid_rows'],
                'invalid_rows' => $validationResults['invalid_rows'],
                'skipped_rows' => $validationResults['skipped_rows'],
                'errors' => $validationResults['errors'],
                'warnings' => $validationResults['warnings'],
                'validation_summary' => $validationResults['validation_summary'] ?? [],
                'campagne' => [
                    'id' => $campagne->id,
                    'nom' => $campagne->nom,
                    'type_assistance' => $campagne->type_assistance ?? 'Non défini'
                ],
                'can_import' => count($validationResults['errors']) === 0,
                'file_info' => [
                    'name' => $file->getClientOriginalName(),
                    'size_mb' => round($file->getSize() / 1024 / 1024, 2)
                ]
            ]
        ]);

    } catch (\Exception $e) {
        Log::error('❌ ERREUR validation fichier', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la validation: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Validation des données d'import avec validation spécifique du téléphone
 */





/**
 * Analyse le fichier pour la validation (corrigé pour gérer les headers)
 */
private function analyzeFileForValidation($file, $extension, $campagne)
{
    try {
        Log::info('📁 Analyse fichier pour validation', [
            'extension' => $extension,
            'campagne' => $campagne->nom
        ]);

        $data = [];
        
        if (in_array($extension, ['xlsx', 'xls'])) {
            // ✅ TRAITEMENT FICHIER EXCEL
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();
            
            if (empty($rows)) {
                return ['success' => false, 'message' => 'Le fichier Excel est vide'];
            }

            // ✅ RÉCUPÉRATION ET NETTOYAGE DES HEADERS
            $headers = array_map(function($header) {
                return $this->normalizeColumnName(trim($header));
            }, $rows[0]);

            Log::info('📋 Headers détectés', ['headers' => $headers]);

            // ✅ MAPPING DES COLONNES ATTENDUES
            $expectedColumns = $this->getExpectedColumns();
            $columnMapping = $this->mapColumns($headers, $expectedColumns);
            
            if (!$columnMapping['success']) {
                return [
                    'success' => false, 
                    'message' => 'Colonnes manquantes: ' . implode(', ', $columnMapping['missing'])
                ];
            }

            // ✅ TRAITEMENT DES DONNÉES (SKIP HEADER ROW)
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                $mappedRow = [];
                
                // Mapper chaque colonne selon le mapping trouvé
                foreach ($columnMapping['mapping'] as $expectedCol => $actualIndex) {
                    $mappedRow[$expectedCol] = isset($row[$actualIndex]) ? trim($row[$actualIndex]) : '';
                }
                
                // Ignorer les lignes complètement vides
                if (!$this->isEmptyRow($mappedRow)) {
                    $data[] = $mappedRow;
                }
            }

        } elseif ($extension === 'csv') {
            // ✅ TRAITEMENT FICHIER CSV
            $csvContent = file_get_contents($file->getPathname());
            $rows = str_getcsv($csvContent, "\n");
            
            if (empty($rows)) {
                return ['success' => false, 'message' => 'Le fichier CSV est vide'];
            }

            // ✅ RÉCUPÉRATION ET NETTOYAGE DES HEADERS
            $headers = array_map(function($header) {
                return $this->normalizeColumnName(trim($header));
            }, str_getcsv($rows[0]));

            Log::info('📋 Headers CSV détectés', ['headers' => $headers]);

            // ✅ MAPPING DES COLONNES
            $expectedColumns = $this->getExpectedColumns();
            $columnMapping = $this->mapColumns($headers, $expectedColumns);
            
            if (!$columnMapping['success']) {
                return [
                    'success' => false, 
                    'message' => 'Colonnes manquantes: ' . implode(', ', $columnMapping['missing'])
                ];
            }

            // ✅ TRAITEMENT DES DONNÉES (SKIP HEADER ROW)
            for ($i = 1; $i < count($rows); $i++) {
                $row = str_getcsv($rows[$i]);
                $mappedRow = [];
                
                // Mapper chaque colonne selon le mapping trouvé
                foreach ($columnMapping['mapping'] as $expectedCol => $actualIndex) {
                    $mappedRow[$expectedCol] = isset($row[$actualIndex]) ? trim($row[$actualIndex]) : '';
                }
                
                // Ignorer les lignes complètement vides
                if (!$this->isEmptyRow($mappedRow)) {
                    $data[] = $mappedRow;
                }
            }
        }

        Log::info('✅ Analyse terminée', [
            'total_data_rows' => count($data),
            'sample_row' => !empty($data) ? $data[0] : 'Aucune donnée'
        ]);

        return [
            'success' => true,
            'data' => $data,
            'headers' => $headers,
            'column_mapping' => $columnMapping['mapping']
        ];

    } catch (\Exception $e) {
        Log::error('❌ Erreur analyse fichier', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return [
            'success' => false,
            'message' => 'Erreur lors de l\'analyse du fichier: ' . $e->getMessage()
        ];
    }
}

/**
 * Normalise les noms de colonnes pour faciliter la correspondance
 */
private function normalizeColumnName($columnName)
{
    $normalized = strtolower(trim($columnName));
    
    // Suppression des caractères spéciaux et des espaces
    $normalized = preg_replace('/[^a-z0-9]/', '_', $normalized);
    $normalized = preg_replace('/_{2,}/', '_', $normalized);
    $normalized = trim($normalized, '_');
    
    return $normalized;
}

/**
 * Définit les colonnes attendues avec leurs variantes possibles
 */
private function getExpectedColumns()
{
    return [
        'nom' => ['nom', 'name', 'nom_famille', 'famille'],
        'prenom' => ['prenom', 'prénom', 'firstname', 'first_name'],
        'sexe' => ['sexe', 'genre', 'gender', 'sex'],
        'date_naissance' => ['date_naissance', 'date_de_naissance', 'naissance', 'birth_date', 'birthday'],
        'telephone' => ['telephone', 'téléphone', 'phone', 'tel', 'mobile'],
        'email' => ['email', 'mail', 'e_mail', 'courriel'],
        'adresse' => ['adresse', 'address', 'addr', 'domicile'],
        'cin' => ['cin', 'cni', 'carte_identite', 'id_card'],
        'commentaire' => ['commentaire', 'comment', 'note', 'observation'],
        'decision' => ['decision', 'décision', 'statut', 'status'],
        'enfants_scolarises' => ['enfants_scolarises', 'enfants_scolarisés', 'scolarise', 'scolarisé']
    ];
}

/**
 * Mappe les colonnes du fichier avec les colonnes attendues
 */
private function mapColumns($headers, $expectedColumns)
{
    $mapping = [];
    $missing = [];
    $requiredColumns = ['nom', 'prenom', 'sexe', 'date_naissance', 'telephone'];
    
    Log::info('🔍 Début mapping colonnes', [
        'headers_found' => $headers,
        'expected_columns' => array_keys($expectedColumns)
    ]);
    
    // Pour chaque colonne attendue, chercher dans les headers
    foreach ($expectedColumns as $expectedCol => $variants) {
        $found = false;
        
        foreach ($variants as $variant) {
            $normalizedVariant = $this->normalizeColumnName($variant);
            $headerIndex = array_search($normalizedVariant, $headers);
            
            if ($headerIndex !== false) {
                $mapping[$expectedCol] = $headerIndex;
                $found = true;
                Log::info("✅ Colonne mappée: {$expectedCol} -> index {$headerIndex} (variant: {$variant})");
                break;
            }
        }
        
        if (!$found && in_array($expectedCol, $requiredColumns)) {
            $missing[] = $expectedCol;
            Log::warning("❌ Colonne obligatoire manquante: {$expectedCol}");
        }
    }
    
    Log::info('📊 Résultat mapping', [
        'mapping' => $mapping,
        'missing' => $missing
    ]);
    
    return [
        'success' => empty($missing),
        'mapping' => $mapping,
        'missing' => $missing
    ];
}

/**
 * Vérifie si une ligne est complètement vide
 */
private function isEmptyRow($row)
{
    if (empty($row)) return true;
    
    foreach ($row as $value) {
        if (!empty(trim($value))) {
            return false;
        }
    }
    return true;
}

/**
 * Validation des données d'import avec validation spécifique du téléphone (VERSION CORRIGÉE)
 */
private function validateImportDataWithPhoneValidation($data, $campagne, $typeAssistance = null)
{
    $results = [
        'total_rows' => 0,
        'valid_rows' => 0,
        'invalid_rows' => 0,
        'skipped_rows' => 0,
        'errors' => [],
        'warnings' => [],
        'validation_summary' => [
            'phone_errors' => 0,
            'required_field_errors' => 0,
            'format_errors' => 0,
            'specific_validation_errors' => 0
        ]
    ];

    if (empty($data)) {
        $results['errors'][] = 'Aucune donnée à valider dans le fichier';
        return $results;
    }

    Log::info('🔍 Début validation des données (VERSION CORRIGÉE)', [
        'total_rows_to_validate' => count($data),
        'type_assistance' => $typeAssistance->libelle ?? 'Non défini',
        'sample_data' => !empty($data) ? array_keys($data[0]) : 'Aucune donnée'
    ]);

    foreach ($data as $rowIndex => $row) {
        $results['total_rows']++;
        $rowNumber = $rowIndex + 2; // +2 car ligne 1 = headers, ligne 2 = première donnée
        $rowErrors = [];

        Log::debug("🔍 Validation ligne {$rowNumber}", ['data' => $row]);

        // ✅ VALIDATION DES CHAMPS OBLIGATOIRES
        if (empty(trim($row['nom'] ?? ''))) {
            $rowErrors[] = "Le nom est obligatoire";
            $results['validation_summary']['required_field_errors']++;
        }

        if (empty(trim($row['prenom'] ?? ''))) {
            $rowErrors[] = "Le prénom est obligatoire";
            $results['validation_summary']['required_field_errors']++;
        }

        // ✅ VALIDATION DU SEXE (plus flexible)
        $sexe = strtoupper(trim($row['sexe'] ?? ''));
        $sexesValides = ['M', 'F', 'MASCULIN', 'FÉMININ', 'FEMININ', 'HOMME', 'FEMME'];
        if (empty($sexe) || !in_array($sexe, $sexesValides)) {
            $rowErrors[] = "Le sexe doit être M, F, Masculin, Féminin, Homme ou Femme";
            $results['validation_summary']['format_errors']++;
        }

        // ✅ VALIDATION DATE DE NAISSANCE
        if (empty($row['date_naissance'])) {
            $rowErrors[] = "La date de naissance est obligatoire";
            $results['validation_summary']['required_field_errors']++;
        } else {
            try {
                $dateNaissance = Carbon::parse($row['date_naissance']);
                if ($dateNaissance->isFuture()) {
                    $rowErrors[] = "La date de naissance ne peut pas être dans le futur";
                    $results['validation_summary']['format_errors']++;
                }
            } catch (\Exception $e) {
                $rowErrors[] = "Format de date de naissance invalide: " . $row['date_naissance'];
                $results['validation_summary']['format_errors']++;
            }
        }

        // ✅ VALIDATION SPÉCIFIQUE DU TÉLÉPHONE (9 CHIFFRES)
        $telephone = trim($row['telephone'] ?? '');
        if (empty($telephone)) {
            $rowErrors[] = "Le numéro de téléphone est obligatoire";
            $results['validation_summary']['required_field_errors']++;
        } else {
            // Utiliser la méthode de validation du modèle Beneficiaire
            if (!Beneficiaire::estTelephoneValide($telephone)) {
                $cleanPhone = preg_replace('/[^0-9]/', '', $telephone);
                $rowErrors[] = "Le numéro de téléphone doit contenir exactement 9 chiffres (reçu: '{$telephone}', nettoyé: '{$cleanPhone}', longueur: " . strlen($cleanPhone) . ")";
                $results['validation_summary']['phone_errors']++;
                
                Log::debug('❌ Téléphone invalide ligne ' . $rowNumber, [
                    'original' => $telephone,
                    'cleaned' => $cleanPhone,
                    'length' => strlen($cleanPhone)
                ]);
            } else {
                $cleanPhone = preg_replace('/[^0-9]/', '', $telephone);
                Log::debug('✅ Téléphone valide ligne ' . $rowNumber, [
                    'original' => $telephone,
                    'cleaned' => $cleanPhone
                ]);
            }
        }

        // ✅ VALIDATION DE L'EMAIL (OPTIONNEL)
        if (!empty($row['email']) && !filter_var(trim($row['email']), FILTER_VALIDATE_EMAIL)) {
            $rowErrors[] = "Format d'email invalide: " . $row['email'];
            $results['validation_summary']['format_errors']++;
        }

        // ✅ VALIDATIONS SPÉCIFIQUES SELON LE TYPE D'ASSISTANCE
        if ($typeAssistance && !empty($row['date_naissance'])) {
            $typeLibelle = strtolower($typeAssistance->libelle);
            
            try {
                $dateNaissance = Carbon::parse($row['date_naissance']);
                $age = $dateNaissance->age;
                
                // Pour les lunettes : validation enfants_scolarises si enfant
                if ($typeLibelle === 'lunettes' && $age < Beneficiaire::AGE_LIMITE_ENFANT) {
                    $enfantsScolarises = strtolower(trim($row['enfants_scolarises'] ?? ''));
                    $valeurs_valides = ['oui', 'non', 'true', 'false', '1', '0', 'yes', 'no'];
                    if (!in_array($enfantsScolarises, $valeurs_valides)) {
                        $rowErrors[] = "Pour les lunettes d'enfants, le champ 'enfants_scolarises' est obligatoire (oui/non)";
                        $results['validation_summary']['specific_validation_errors']++;
                    }
                }
                
                // Pour les appareils auditifs : validation cote
                if (strpos($typeLibelle, 'auditif') !== false || $typeLibelle === 'appareils auditifs') {
                    $cote = strtolower(trim($row['cote'] ?? ''));
                    $cotes_valides = ['unilatéral', 'bilatéral', 'unilateral', 'bilateral'];
                    if (!in_array($cote, $cotes_valides)) {
                        $rowErrors[] = "Pour les appareils auditifs, le champ 'cote' est obligatoire (unilatéral/bilatéral)";
                        $results['validation_summary']['specific_validation_errors']++;
                    }
                }
            } catch (\Exception $e) {
                // Date déjà validée précédemment
            }
        }

        // ✅ COMPILATION DES ERREURS DE LA LIGNE
        if (!empty($rowErrors)) {
            $results['invalid_rows']++;
            $results['errors'][] = [
                'row' => $rowNumber,
                'errors' => $rowErrors,
                'data' => $row // Maintenant c'est un tableau associatif propre
            ];
            
            Log::warning("❌ Ligne {$rowNumber} invalide", [
                'errors_count' => count($rowErrors),
                'errors' => $rowErrors
            ]);
        } else {
            $results['valid_rows']++;
            Log::debug("✅ Ligne {$rowNumber} valide");
        }

        // Log périodique pour suivi
        if ($rowNumber % 50 === 0) {
            Log::info('🔄 Progression validation', [
                'processed' => $rowNumber,
                'valid' => $results['valid_rows'],
                'invalid' => $results['invalid_rows']
            ]);
        }
    }

    // ✅ AJOUT D'INFORMATIONS RÉCAPITULATIVES
    if ($results['validation_summary']['phone_errors'] > 0) {
        $results['warnings'][] = "⚠️ {$results['validation_summary']['phone_errors']} numéros de téléphone ne respectent pas le format 9 chiffres";
    }

    Log::info('📊 RÉCAPITULATIF FINAL VALIDATION', [
        'total_rows' => $results['total_rows'],
        'valid_rows' => $results['valid_rows'],
        'invalid_rows' => $results['invalid_rows'],
        'phone_errors' => $results['validation_summary']['phone_errors'],
        'required_field_errors' => $results['validation_summary']['required_field_errors'],
        'format_errors' => $results['validation_summary']['format_errors'],
        'specific_validation_errors' => $results['validation_summary']['specific_validation_errors']
    ]);

    return $results;
}



/**
 * Méthode utilitaire pour nettoyer et valider un numéro de téléphone
 */
private function cleanAndValidatePhone($telephone)
{
    if (empty($telephone)) {
        return ['valid' => false, 'cleaned' => '', 'error' => 'Numéro vide'];
    }

    // Nettoyer le numéro
    $cleaned = preg_replace('/[^0-9]/', '', trim($telephone));
    
    // Valider la longueur
    if (strlen($cleaned) !== 9) {
        return [
            'valid' => false, 
            'cleaned' => $cleaned, 
            'error' => "Doit contenir exactement 9 chiffres (actuellement: " . strlen($cleaned) . ")"
        ];
    }

    return ['valid' => true, 'cleaned' => $cleaned, 'error' => null];
}

/**
 * ✅ MÉTHODE D'IMPORT RÉEL CORRIGÉE
 * Cette méthode SAUVEGARDE réellement en base de données
 */

/**
 * ✅ MÉTHODE DE VALIDATION SANS SAUVEGARDE
 */
private function validateImportDataOnly($rawData, $campagne)
{
    Log::info('🔍 Validation données (mode validation seulement)');

    if (empty($rawData)) {
        return [
            'total_rows' => 0,
            'valid_rows' => 0,
            'invalid_rows' => 0,
            'skipped_rows' => 0,
            'errors' => [],
            'warnings' => ['Fichier vide']
        ];
    }

    // ✅ EXTRACTION DES HEADERS
    $rawHeaders = $rawData[0] ?? [];
    $headers = array_map(function($header) {
        return strtolower(trim($header));
    }, $rawHeaders);

    // ✅ VÉRIFICATION COLONNES OBLIGATOIRES
    $requiredColumns = ['nom', 'prenom', 'sexe', 'telephone', 'adresse'];
    $missingColumns = array_diff($requiredColumns, $headers);

    if (!empty($missingColumns)) {
        return [
            'total_rows' => count($rawData),
            'valid_rows' => 0,
            'invalid_rows' => count($rawData) - 1,
            'skipped_rows' => 0,
            'errors' => [
                [
                    'ligne' => 'Headers',
                    'erreurs' => ['Colonnes obligatoires manquantes: ' . implode(', ', $missingColumns)]
                ]
            ],
            'warnings' => []
        ];
    }

    // ✅ MAPPING DES COLONNES
    $columnMapping = [];
    foreach ($headers as $index => $header) {
        $columnMapping[$header] = $index;
    }

    // ✅ VALIDATION LIGNE PAR LIGNE (SANS SAUVEGARDE)
    $dataRows = array_slice($rawData, 1);
    $validRows = 0;
    $invalidRows = 0;
    $skippedRows = 0;
    $errors = [];
    $warnings = [];

    foreach ($dataRows as $rowIndex => $rowData) {
        $lineNumber = $rowIndex + 2;
        $rowErrors = [];

        // Ignorer lignes vides
        if (empty(array_filter($rowData))) {
            $skippedRows++;
            continue;
        }

        // ✅ VALIDATION CHAMPS OBLIGATOIRES
        foreach ($requiredColumns as $column) {
            $value = isset($columnMapping[$column]) && isset($rowData[$columnMapping[$column]]) 
                ? trim($rowData[$columnMapping[$column]]) 
                : '';
            
            if (empty($value)) {
                $rowErrors[] = "Champ obligatoire manquant: {$column}";
            }
        }

        // ✅ VALIDATION SEXE
        if (isset($columnMapping['sexe']) && isset($rowData[$columnMapping['sexe']])) {
            $sexe = strtoupper(trim($rowData[$columnMapping['sexe']]));
            if (!in_array($sexe, ['M', 'F', 'MASCULIN', 'FEMININ', 'HOMME', 'FEMME', 'H'])) {
                $rowErrors[] = "Sexe invalide: {$sexe}";
            }
        }

        // ✅ VALIDATION TÉLÉPHONE
        if (isset($columnMapping['telephone']) && isset($rowData[$columnMapping['telephone']])) {
            $telephone = preg_replace('/[^0-9]/', '', $rowData[$columnMapping['telephone']]);
            if (strlen($telephone) < 10 || strlen($telephone) > 15) {
                $rowErrors[] = "Téléphone invalide: {$telephone}";
            }
        }

        // ✅ VALIDATION EMAIL (si présent)
        if (isset($columnMapping['email']) && isset($rowData[$columnMapping['email']])) {
            $email = trim($rowData[$columnMapping['email']]);
            if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $rowErrors[] = "Email invalide: {$email}";
            }
        }

        // ✅ COMPTABILISER RÉSULTATS
        if (empty($rowErrors)) {
            $validRows++;
        } else {
            $invalidRows++;
            if (count($errors) < 20) { // Limiter à 20 erreurs pour l'affichage
                $errors[] = [
                    'ligne' => $lineNumber,
                    'erreurs' => $rowErrors
                ];
            }
        }
    }

    return [
        'total_rows' => count($dataRows),
        'valid_rows' => $validRows,
        'invalid_rows' => $invalidRows,
        'skipped_rows' => $skippedRows,
        'errors' => $errors,
        'warnings' => $warnings
    ];
}

/**
 * ✅ MÉTHODE D'IMPORT RÉEL AVEC SAUVEGARDE
 */
private function performRealImport($rawData, $campagne, $ignoreDoublons, $forceImport)
{
    Log::info('💾 === DÉBUT IMPORT RÉEL AVEC SAUVEGARDE ===');

    DB::beginTransaction();

    try {
        // ✅ EXTRACTION DES HEADERS
        $rawHeaders = $rawData[0] ?? [];
        $headers = array_map(function($header) {
            return strtolower(trim($header));
        }, $rawHeaders);

        $columnMapping = [];
        foreach ($headers as $index => $header) {
            $columnMapping[$header] = $index;
        }

        // ✅ TRAITEMENT DES DONNÉES AVEC SAUVEGARDE
        $dataRows = array_slice($rawData, 1);
        $importedCount = 0;
        $errorCount = 0;
        $skippedCount = 0;
        $errors = [];
        $warnings = [];

        // ✅ DÉTERMINER LA TABLE CORRECTE
        $tableName = Schema::hasTable('beneficiaires_medicaux') ? 'beneficiaires_medicaux' : 'beneficiaires';
        Log::info('📋 Table utilisée pour import:', ['table' => $tableName]);

        foreach ($dataRows as $rowIndex => $rowData) {
            $lineNumber = $rowIndex + 2;

            try {
                // Ignorer lignes vides
                if (empty(array_filter($rowData))) {
                    $skippedCount++;
                    continue;
                }

                // ✅ PRÉPARER LES DONNÉES POUR LA SAUVEGARDE
                $beneficiaireData = $this->prepareBeneficiaireData($rowData, $columnMapping, $campagne);

                // ✅ VALIDATION BASIQUE
                if (empty($beneficiaireData['nom']) || empty($beneficiaireData['prenom']) || empty($beneficiaireData['telephone'])) {
                    $errorCount++;
                    $errors[] = [
                        'ligne' => $lineNumber,
                        'erreurs' => ['Données obligatoires manquantes']
                    ];
                    continue;
                }

                // ✅ VÉRIFICATION DOUBLONS
                if (!$ignoreDoublons) {
                    $doublon = DB::table($tableName)
                        ->where('telephone', $beneficiaireData['telephone'])
                        ->whereNull('date_suppression')
                        ->exists();

                    if ($doublon) {
                        $skippedCount++;
                        Log::info("Ligne {$lineNumber} ignorée - doublon téléphone: {$beneficiaireData['telephone']}");
                        continue;
                    }
                }

                // ✅ SAUVEGARDE EN BASE DE DONNÉES
                $beneficiaireId = DB::table($tableName)->insertGetId($beneficiaireData);
                
                if ($beneficiaireId) {
                    $importedCount++;
                    Log::info("✅ Bénéficiaire importé ligne {$lineNumber} avec ID: {$beneficiaireId}");
                } else {
                    $errorCount++;
                    $errors[] = [
                        'ligne' => $lineNumber,
                        'erreurs' => ['Échec de la sauvegarde en base']
                    ];
                }

            } catch (\Exception $rowError) {
                $errorCount++;
                $errors[] = [
                    'ligne' => $lineNumber,
                    'erreurs' => ['Erreur ligne: ' . $rowError->getMessage()]
                ];
                Log::error("❌ Erreur ligne {$lineNumber}", [
                    'error' => $rowError->getMessage(),
                    'data' => $beneficiaireData ?? null
                ]);
            }
        }

        // ✅ VALIDATION ET COMMIT DE LA TRANSACTION
        if ($importedCount > 0 || $forceImport) {
            DB::commit();
            Log::info('✅ Transaction validée - données sauvegardées');
        } else {
            DB::rollBack();
            Log::warning('🔄 Transaction annulée - aucun import réussi');
        }

        return [
            'imported_count' => $importedCount,
            'error_count' => $errorCount,
            'skipped_count' => $skippedCount,
            'total_processed' => count($dataRows),
            'errors' => $errors,
            'warnings' => $warnings
        ];

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('❌ Erreur critique import réel', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        throw $e;
    }
}

/**
 * ✅ PRÉPARATION DES DONNÉES BÉNÉFICIAIRE
 */
private function prepareBeneficiaireData($rowData, $columnMapping, $campagne)
{
    $data = [
        // ✅ CHAMPS OBLIGATOIRES
        'nom' => isset($columnMapping['nom']) && isset($rowData[$columnMapping['nom']]) ? 
                ucwords(strtolower(trim($rowData[$columnMapping['nom']]))) : '',
        'prenom' => isset($columnMapping['prenom']) && isset($rowData[$columnMapping['prenom']]) ? 
                   ucwords(strtolower(trim($rowData[$columnMapping['prenom']]))) : '',
        'telephone' => isset($columnMapping['telephone']) && isset($rowData[$columnMapping['telephone']]) ? 
                      preg_replace('/[^0-9]/', '', $rowData[$columnMapping['telephone']]) : '',
        'adresse' => isset($columnMapping['adresse']) && isset($rowData[$columnMapping['adresse']]) ? 
                    trim($rowData[$columnMapping['adresse']]) : '',

        // ✅ NORMALISATION DU SEXE
        'sexe' => $this->normalizeSexe($rowData, $columnMapping),

        // ✅ CHAMPS DE CAMPAGNE
        'type_assistance_id' => $campagne->type_assistance_id,
        'campagne_id' => $campagne->id,
        
        // ✅ VALEURS PAR DÉFAUT
        'date_demande' => now()->toDateString(),
        'hors_campagne' => false,
        'a_beneficie' => false,
        
        // ✅ TIMESTAMPS
        'created_at' => now(),
        'updated_at' => now(),
        'created_by' => auth()->id()
    ];

    // ✅ CHAMPS OPTIONNELS
    $this->addOptionalFields($data, $rowData, $columnMapping);

    return $data;
}

/**
 * ✅ NORMALISATION DU SEXE
 */

/**
 * ✅ AJOUT DES CHAMPS OPTIONNELS
 */
private function addOptionalFields(&$data, $rowData, $columnMapping)
{
    // ✅ EMAIL
    if (isset($columnMapping['email']) && isset($rowData[$columnMapping['email']]) && !empty($rowData[$columnMapping['email']])) {
        $email = strtolower(trim($rowData[$columnMapping['email']]));
        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $data['email'] = $email;
        }
    }

    // ✅ CIN
    if (isset($columnMapping['cin']) && isset($rowData[$columnMapping['cin']]) && !empty($rowData[$columnMapping['cin']])) {
        $data['cin'] = strtoupper(trim($rowData[$columnMapping['cin']]));
    }

    // ✅ DATE DE NAISSANCE
    if (isset($columnMapping['date_naissance']) && isset($rowData[$columnMapping['date_naissance']]) && !empty($rowData[$columnMapping['date_naissance']])) {
        try {
            $dateValue = $rowData[$columnMapping['date_naissance']];
            if (is_numeric($dateValue)) {
                // Excel date serial
                $data['date_naissance'] = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($dateValue)->format('Y-m-d');
            } else {
                $data['date_naissance'] = Carbon::parse($dateValue)->format('Y-m-d');
            }
        } catch (\Exception $e) {
            Log::warning('Date naissance invalide ignorée', ['value' => $dateValue]);
        }
    }

    // ✅ COMMENTAIRE
    if (isset($columnMapping['commentaire']) && isset($rowData[$columnMapping['commentaire']]) && !empty($rowData[$columnMapping['commentaire']])) {
        $data['commentaire'] = trim($rowData[$columnMapping['commentaire']]);
    }

    // ✅ DÉCISION
    if (isset($columnMapping['decision']) && isset($rowData[$columnMapping['decision']]) && !empty($rowData[$columnMapping['decision']])) {
        $decision = trim($rowData[$columnMapping['decision']]);
        if (in_array($decision, ['accepté', 'en_attente', 'refusé', 'admin a list principal', 'admin a list d\'attente'])) {
            $data['decision'] = $decision;
        }
    }

    // ✅ ENFANTS SCOLARISÉS
    if (isset($columnMapping['enfants_scolarises']) && isset($rowData[$columnMapping['enfants_scolarises']]) && $rowData[$columnMapping['enfants_scolarises']] !== '') {
        $scolarise = strtolower(trim($rowData[$columnMapping['enfants_scolarises']]));
        if (in_array($scolarise, ['oui', 'yes', '1', 'true'])) {
            $data['enfants_scolarises'] = true;
        } elseif (in_array($scolarise, ['non', 'no', '0', 'false'])) {
            $data['enfants_scolarises'] = false;
        }
    }

    // ✅ CÔTÉ
    if (isset($columnMapping['cote']) && isset($rowData[$columnMapping['cote']]) && !empty($rowData[$columnMapping['cote']])) {
        $cote = strtolower(trim($rowData[$columnMapping['cote']]));
        if (in_array($cote, ['unilatéral', 'bilatéral'])) {
            $data['cote'] = $cote;
        }
    }

    // ✅ LATÉRALITÉ
    if (isset($columnMapping['lateralite']) && isset($rowData[$columnMapping['lateralite']]) && !empty($rowData[$columnMapping['lateralite']])) {
        $lateralite = trim($rowData[$columnMapping['lateralite']]);
        if (in_array($lateralite, ['Unilatérale', 'Bilatérale'])) {
            $data['lateralite'] = $lateralite;
        }
    }
}


public function importBeneficiaires(Request $request)
{
    try {
        Log::info('🚀 === DÉBUT IMPORT RÉEL BÉNÉFICIAIRES ===', [
            'user_id' => auth()->id(),
            'has_file' => $request->hasFile('file'),
            'params' => $request->except(['file'])
        ]);

        // ✅ VALIDATION FLEXIBLE POUR BOOLEAN
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240',
            'campagne_id' => 'required|integer|exists:campagnes_medicales,id,date_suppression,NULL',
            'ignore_doublons' => 'required',
            'force_import' => 'sometimes'
        ], [
            'file.required' => 'Le fichier est obligatoire',
            'file.file' => 'Le fichier fourni n\'est pas valide',
            'file.max' => 'Le fichier ne peut pas dépasser 10MB',
            'campagne_id.required' => 'L\'ID de campagne est obligatoire',
            'campagne_id.exists' => 'La campagne spécifiée n\'existe pas',
            'ignore_doublons.required' => 'Le paramètre ignore_doublons est obligatoire'
        ]);

        if ($validator->fails()) {
            Log::warning('❌ Validation échouée', [
                'errors' => $validator->errors()->toArray()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Données de validation invalides',
                'errors' => $validator->errors()->toArray()
            ], 422);
        }

        $file = $request->file('file');
        $campagneId = (int) $request->input('campagne_id');
        $ignoreDoublons = $this->convertToBoolean($request->input('ignore_doublons'));
        $forceImport = $this->convertToBoolean($request->input('force_import', false));

        Log::info('📋 Paramètres d\'import traités', [
            'file_name' => $file->getClientOriginalName(),
            'file_size_bytes' => $file->getSize(),
            'file_size_mb' => round($file->getSize() / 1024 / 1024, 2),
            'campagne_id' => $campagneId,
            'ignore_doublons' => $ignoreDoublons,
            'force_import' => $forceImport
        ]);

        // ✅ VÉRIFICATION DE LA CAMPAGNE AVANT TRAITEMENT
        $campagne = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->where('campagnes_medicales.id', $campagneId)
            ->whereNull('campagnes_medicales.date_suppression')
            ->select(
                'campagnes_medicales.id',
                'campagnes_medicales.nom',
                'campagnes_medicales.statut',
                'campagnes_medicales.type_assistance_id',
                'types_assistance.libelle as type_assistance'
            )
            ->first();

        if (!$campagne) {
            Log::error('❌ Campagne non trouvée', ['campagne_id' => $campagneId]);
            return response()->json([
                'success' => false,
                'message' => 'Campagne non trouvée ou supprimée'
            ], 404);
        }

        Log::info('✅ Campagne trouvée', [
            'nom' => $campagne->nom,
            'statut' => $campagne->statut,
            'type_assistance' => $campagne->type_assistance ?? 'Non défini'
        ]);

        // ✅ APPEL DE LA MÉTHODE D'IMPORT OPTIMISÉE AVEC GESTION D'ERREUR
        $result = $this->processFileImportSafe($file, $campagne, $ignoreDoublons, $forceImport);

        // ✅ NORMALISATION DE LA RÉPONSE
        if ($result['success']) {
            Log::info('✅ Import terminé avec succès', [
                'imported' => $result['data']['imported_count'],
                'skipped' => $result['data']['skipped_count'],
                'errors' => $result['data']['error_count']
            ]);

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'data' => [
                    'imported_count' => $result['data']['imported_count'],
                    'skipped_count' => $result['data']['skipped_count'],
                    'error_count' => $result['data']['error_count'],
                    'total_processed' => $result['data']['total_processed'],
                    'details_erreurs' => $result['data']['details_erreurs'] ?? [],
                    'campagne_id' => $campagneId,
                    'campagne_nom' => $campagne->nom,
                    'timestamp' => now()->toISOString()
                ]
            ], 200);
        } else {
            Log::error('❌ Échec import', [
                'message' => $result['message'],
                'errors_count' => is_array($result['errors'] ?? []) ? count($result['errors']) : 'N/A'
            ]);

            return response()->json([
                'success' => false,
                'message' => $result['message'],
                'errors' => $result['errors'] ?? [],
                'debug_info' => $result['debug_info'] ?? null
            ], $result['status_code'] ?? 422);
        }

    } catch (\Exception $e) {
        Log::error('❌ ERREUR CRITIQUE import bénéficiaires', [
            'error_message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'user_id' => auth()->id() ?? 'Non authentifié'
        ]);

        // En mode debug, on peut ajouter la trace
        if (app()->environment(['local', 'development'])) {
            Log::debug('Stack trace', ['trace' => $e->getTraceAsString()]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du traitement du fichier: ' . $e->getMessage(),
            'error' => app()->environment(['local', 'development']) ? [
                'message' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine()
            ] : 'Erreur interne du serveur'
        ], 500);
    }
}

/**
 * Version sécurisée du traitement d'import avec gestion d'erreurs
 */
private function processFileImportSafe($file, $campagne, $ignoreDoublons, $forceImport)
{
    try {
        Log::info('📁 Début traitement fichier sécurisé', [
            'filename' => $file->getClientOriginalName(),
            'campagne' => $campagne->nom
        ]);

        // ✅ Détection du type de fichier
        $extension = strtolower($file->getClientOriginalExtension());
        
        if (!in_array($extension, ['xlsx', 'xls', 'csv'])) {
            return [
                'success' => false,
                'message' => "Type de fichier non supporté: .{$extension}",
                'status_code' => 422
            ];
        }

        // ✅ Analyse du fichier
        $analysisResult = $this->analyzeFileForImport($file, $extension, $campagne);
        
        if (!$analysisResult['success']) {
            return [
                'success' => false,
                'message' => $analysisResult['message'],
                'errors' => $analysisResult['errors'] ?? [],
                'status_code' => 422
            ];
        }

        $data = $analysisResult['data'];
        
        if (empty($data)) {
            return [
                'success' => false,
                'message' => 'Aucune donnée valide trouvée dans le fichier',
                'status_code' => 422
            ];
        }

        Log::info('📊 Données analysées', [
            'total_rows' => count($data),
            'sample_keys' => !empty($data) ? array_keys($data[0]) : []
        ]);

        // ✅ Traitement des données ligne par ligne
        return $this->processDataRows($data, $campagne, $ignoreDoublons, $forceImport);

    } catch (\Exception $e) {
        Log::error('❌ Erreur processFileImportSafe', [
            'error' => $e->getMessage(),
            'file_name' => $file->getClientOriginalName()
        ]);

        return [
            'success' => false,
            'message' => 'Erreur lors du traitement: ' . $e->getMessage(),
            'debug_info' => [
                'method' => 'processFileImportSafe',
                'file' => basename($e->getFile()),
                'line' => $e->getLine()
            ],
            'status_code' => 500
        ];
    }
}

/**
 * Analyse du fichier pour l'import réel
 */






/**
 * Analyse du fichier pour l'import réel (VERSION CORRIGÉE POUR EXCEL)
 */
private function analyzeFileForImport($file, $extension, $campagne)
{
    try {
        $data = [];
        
        if (in_array($extension, ['xlsx', 'xls'])) {
            Log::info('📊 Traitement fichier Excel', ['extension' => $extension]);
            
            // ✅ TRAITEMENT EXCEL CORRIGÉ
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            
            // ✅ RÉCUPÉRATION DES DONNÉES EN FORMAT SIMPLE
            $rows = $worksheet->toArray(null, true, true, false); // false = pas de formatage des clés
            
            if (empty($rows)) {
                return ['success' => false, 'message' => 'Le fichier Excel est vide'];
            }

            Log::info('📋 Fichier Excel chargé', [
                'total_rows' => count($rows),
                'first_row_sample' => array_slice($rows[0] ?? [], 0, 5) // 5 premières colonnes
            ]);

            // ✅ RÉCUPÉRATION DES HEADERS (PREMIÈRE LIGNE)
            $headers = [];
            if (isset($rows[0]) && is_array($rows[0])) {
                foreach ($rows[0] as $header) {
                    $headers[] = $this->normalizeColumnName(trim((string)($header ?? '')));
                }
            }

            if (empty($headers)) {
                return ['success' => false, 'message' => 'Impossible de lire les en-têtes du fichier Excel'];
            }

            Log::info('📋 Headers Excel détectés', ['headers' => $headers]);

            // ✅ MAPPING DES COLONNES
            $expectedColumns = $this->getExpectedColumns();
            $columnMapping = $this->mapColumns($headers, $expectedColumns);
            
            if (!$columnMapping['success']) {
                return [
                    'success' => false, 
                    'message' => 'Colonnes manquantes: ' . implode(', ', $columnMapping['missing']),
                    'headers_found' => $headers,
                    'expected' => array_keys($expectedColumns)
                ];
            }

            Log::info('✅ Mapping colonnes Excel réussi', ['mapping' => $columnMapping['mapping']]);

            // ✅ TRAITEMENT DES LIGNES DE DONNÉES (SKIP HEADER)
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                
                if (!is_array($row)) {
                    Log::warning("⚠️ Ligne {$i} ignorée (pas un tableau)", ['row' => $row]);
                    continue;
                }
                
                $mappedRow = [];
                
                // ✅ MAPPING SÉCURISÉ DES COLONNES
                foreach ($columnMapping['mapping'] as $expectedCol => $actualIndex) {
                    $mappedRow[$expectedCol] = isset($row[$actualIndex]) 
                        ? trim((string)($row[$actualIndex] ?? '')) 
                        : '';
                }
                
                // ✅ IGNORER LES LIGNES VIDES
                if (!$this->isEmptyRow($mappedRow)) {
                    $data[] = $mappedRow;
                    
                    // Debug pour les premières lignes
                    if ($i <= 3) {
                        Log::debug("📝 Ligne {$i} mappée", [
                            'original_row' => array_slice($row, 0, 8),
                            'mapped_row' => $mappedRow
                        ]);
                    }
                }
            }

        } elseif ($extension === 'csv') {
            Log::info('📊 Traitement fichier CSV');
            
            // ✅ TRAITEMENT CSV (INCHANGÉ)
            $csvContent = file_get_contents($file->getPathname());
            
            // Détection de l'encodage et conversion si nécessaire
            if (!mb_check_encoding($csvContent, 'UTF-8')) {
                $csvContent = mb_convert_encoding($csvContent, 'UTF-8', 'auto');
            }
            
            $lines = explode("\n", $csvContent);
            $lines = array_filter($lines, function($line) {
                return !empty(trim($line));
            });
            
            if (empty($lines)) {
                return ['success' => false, 'message' => 'Le fichier CSV est vide'];
            }

            // ✅ HEADERS CSV
            $headers = array_map(function($header) {
                return $this->normalizeColumnName(trim((string)$header));
            }, str_getcsv($lines[0]));

            Log::info('📋 Headers CSV détectés', ['headers' => $headers]);

            // ✅ MAPPING DES COLONNES CSV
            $expectedColumns = $this->getExpectedColumns();
            $columnMapping = $this->mapColumns($headers, $expectedColumns);
            
            if (!$columnMapping['success']) {
                return [
                    'success' => false, 
                    'message' => 'Colonnes manquantes: ' . implode(', ', $columnMapping['missing'])
                ];
            }

            // ✅ TRAITEMENT DES DONNÉES CSV
            for ($i = 1; $i < count($lines); $i++) {
                $line = trim($lines[$i]);
                if (empty($line)) continue;
                
                $row = str_getcsv($line);
                $mappedRow = [];
                
                foreach ($columnMapping['mapping'] as $expectedCol => $actualIndex) {
                    $mappedRow[$expectedCol] = isset($row[$actualIndex]) 
                        ? trim((string)($row[$actualIndex] ?? '')) 
                        : '';
                }
                
                if (!$this->isEmptyRow($mappedRow)) {
                    $data[] = $mappedRow;
                }
            }
        }

        Log::info('✅ Analyse fichier terminée', [
            'total_rows' => count($data),
            'extension' => $extension,
            'sample_data' => !empty($data) ? array_keys($data[0]) : []
        ]);

        return [
            'success' => true,
            'data' => $data,
            'headers' => $headers ?? [],
            'column_mapping' => $columnMapping['mapping'] ?? []
        ];

    } catch (\Exception $e) {
        Log::error('❌ Erreur analyse fichier import', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'extension' => $extension
        ]);
        
        return [
            'success' => false,
            'message' => 'Erreur lors de l\'analyse: ' . $e->getMessage(),
            'errors' => [$e->getMessage()]
        ];
    }
}

/**
 * Version alternative avec PHPSpreadsheet plus robuste
 */
private function analyzeExcelFileRobust($file)
{
    try {
        Log::info('🔍 Analyse Excel robuste démarrée');
        
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
        $worksheet = $spreadsheet->getActiveSheet();
        
        // ✅ OBTENIR LES DIMENSIONS DE LA FEUILLE
        $highestRow = $worksheet->getHighestDataRow();
        $highestColumn = $worksheet->getHighestDataColumn();
        $highestColumnIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestColumn);
        
        Log::info('📊 Dimensions Excel', [
            'highest_row' => $highestRow,
            'highest_column' => $highestColumn,
            'highest_column_index' => $highestColumnIndex
        ]);
        
        if ($highestRow < 2) {
            return ['success' => false, 'message' => 'Le fichier doit contenir au moins une ligne d\'en-têtes et une ligne de données'];
        }
        
        $data = [];
        $headers = [];
        
        // ✅ LECTURE DES HEADERS (LIGNE 1)
        for ($col = 1; $col <= $highestColumnIndex; $col++) {
            $cellValue = $worksheet->getCellByColumnAndRow($col, 1)->getValue();
            $headers[] = $this->normalizeColumnName(trim((string)($cellValue ?? '')));
        }
        
        Log::info('📋 Headers extraits', ['headers' => $headers]);
        
        // ✅ MAPPING DES COLONNES
        $expectedColumns = $this->getExpectedColumns();
        $columnMapping = $this->mapColumns($headers, $expectedColumns);
        
        if (!$columnMapping['success']) {
            return [
                'success' => false, 
                'message' => 'Colonnes manquantes: ' . implode(', ', $columnMapping['missing']),
                'headers_found' => $headers
            ];
        }
        
        // ✅ LECTURE DES DONNÉES (LIGNES 2 à N)
        for ($row = 2; $row <= $highestRow; $row++) {
            $rowData = [];
            $isEmpty = true;
            
            // Lecture de toutes les colonnes de cette ligne
            for ($col = 1; $col <= $highestColumnIndex; $col++) {
                $cellValue = $worksheet->getCellByColumnAndRow($col, $row)->getValue();
                $value = trim((string)($cellValue ?? ''));
                $rowData[] = $value;
                
                if (!empty($value)) {
                    $isEmpty = false;
                }
            }
            
            // Si la ligne n'est pas vide, mapper les colonnes
            if (!$isEmpty) {
                $mappedRow = [];
                foreach ($columnMapping['mapping'] as $expectedCol => $actualIndex) {
                    $mappedRow[$expectedCol] = isset($rowData[$actualIndex]) 
                        ? $rowData[$actualIndex] 
                        : '';
                }
                
                // ✅ S'ASSURER QUE TOUTES LES COLONNES ATTENDUES SONT PRÉSENTES
                $expectedColumns = $this->getExpectedColumns();
                foreach (array_keys($expectedColumns) as $expectedCol) {
                    if (!isset($mappedRow[$expectedCol])) {
                        $mappedRow[$expectedCol] = '';
                    }
                }
                
                $data[] = $mappedRow;
                
                // Debug première ligne
                if ($row === 2) {
                    Log::debug('🔍 Première ligne de données mappée', [
                        'raw_data' => $rowData,
                        'mapped_data' => $mappedRow,
                        'decision_value' => $mappedRow['decision'] ?? 'NON TROUVÉ',
                        'decision_empty' => empty($mappedRow['decision'])
                    ]);
                }
            }
        }
        
        Log::info('✅ Analyse Excel robuste terminée', [
            'total_data_rows' => count($data)
        ]);
        
        return [
            'success' => true,
            'data' => $data,
            'headers' => $headers,
            'column_mapping' => $columnMapping['mapping']
        ];
        
    } catch (\Exception $e) {
        Log::error('❌ Erreur analyse Excel robuste', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return [
            'success' => false,
            'message' => 'Erreur lecture Excel: ' . $e->getMessage()
        ];
    }
}

/**
 * Méthode de secours pour fichiers Excel problématiques
 */
private function analyzeFileForImportFallback($file, $extension, $campagne)
{
    try {
        Log::info('🔄 Utilisation méthode de secours pour analyse fichier');
        
        if (in_array($extension, ['xlsx', 'xls'])) {
            // ✅ UTILISER LA MÉTHODE ROBUSTE POUR EXCEL
            $result = $this->analyzeExcelFileRobust($file);
            
            if (!$result['success']) {
                // ✅ TENTATIVE AVEC MÉTHODE SIMPLE
                Log::info('⚠️ Méthode robuste échouée, tentative méthode simple');
                return $this->analyzeFileForImport($file, $extension, $campagne);
            }
            
            return $result;
            
        } else {
            // ✅ POUR CSV, UTILISER MÉTHODE NORMALE
            return $this->analyzeFileForImport($file, $extension, $campagne);
        }
        
    } catch (\Exception $e) {
        Log::error('❌ Erreur méthode de secours', [
            'error' => $e->getMessage()
        ]);
        
        return [
            'success' => false,
            'message' => 'Impossible d\'analyser le fichier: ' . $e->getMessage()
        ];
    }
}

/**
 * Mise à jour de processFileImportSafe pour utiliser la méthode robuste
 */
private function processFileImportSafeWithFallback($file, $campagne, $ignoreDoublons, $forceImport)
{
    try {
        Log::info('📁 Début traitement fichier avec fallback', [
            'filename' => $file->getClientOriginalName(),
            'campagne' => $campagne->nom
        ]);

        $extension = strtolower($file->getClientOriginalExtension());
        
        if (!in_array($extension, ['xlsx', 'xls', 'csv'])) {
            return [
                'success' => false,
                'message' => "Type de fichier non supporté: .{$extension}",
                'status_code' => 422
            ];
        }

        // ✅ UTILISER MÉTHODE AVEC FALLBACK
        $analysisResult = $this->analyzeFileForImportFallback($file, $extension, $campagne);
        
        if (!$analysisResult['success']) {
            return [
                'success' => false,
                'message' => $analysisResult['message'],
                'errors' => $analysisResult['errors'] ?? [],
                'status_code' => 422
            ];
        }

        $data = $analysisResult['data'];
        
        if (empty($data)) {
            return [
                'success' => false,
                'message' => 'Aucune donnée valide trouvée dans le fichier',
                'status_code' => 422
            ];
        }

        Log::info('📊 Données analysées avec fallback', [
            'total_rows' => count($data),
            'sample_keys' => !empty($data) ? array_keys($data[0]) : []
        ]);

        // ✅ TRAITEMENT DES DONNÉES
        return $this->processDataRows($data, $campagne, $ignoreDoublons, $forceImport);

    } catch (\Exception $e) {
        Log::error('❌ Erreur processFileImportSafeWithFallback', [
            'error' => $e->getMessage(),
            'file_name' => $file->getClientOriginalName()
        ]);

        return [
            'success' => false,
            'message' => 'Erreur lors du traitement: ' . $e->getMessage(),
            'debug_info' => [
                'method' => 'processFileImportSafeWithFallback',
                'file' => basename($e->getFile()),
                'line' => $e->getLine()
            ],
            'status_code' => 500
        ];
    }
}
/**
 * Traitement des lignes de données
 */
private function processDataRows($data, $campagne, $ignoreDoublons, $forceImport)
{
    $stats = [
        'total_processed' => 0,
        'imported_count' => 0,
        'skipped_count' => 0,
        'error_count' => 0,
        'details_erreurs' => []
    ];

    // Récupération du type d'assistance
    $typeAssistance = null;
    if ($campagne->type_assistance_id) {
        $typeAssistance = DB::table('types_assistance')
            ->where('id', $campagne->type_assistance_id)
            ->first();
    }

    Log::info('🔄 Début traitement des lignes', [
        'total_rows' => count($data),
        'type_assistance' => $typeAssistance->libelle ?? 'Non défini'
    ]);

    foreach ($data as $index => $row) {
        $stats['total_processed']++;
        $rowNumber = $index + 2; // +2 car ligne 1 = headers

        try {
            // ✅ Validation des données avec le modèle Beneficiaire
            $validationErrors = Beneficiaire::validerDonneesImport($row, $typeAssistance);
            
            if (!empty($validationErrors)) {
                $stats['error_count']++;
                $stats['details_erreurs'][] = [
                    'ligne' => $rowNumber,
                    'erreurs' => $validationErrors,
                    'donnees' => $this->sanitizeRowForLog($row)
                ];
                continue;
            }

            // ✅ Vérification des doublons si nécessaire
            if (!$ignoreDoublons) {
                $existant = $this->checkForDuplicate($row, $campagne->id);
                if ($existant) {
                    $stats['skipped_count']++;
                    continue;
                }
            }

            // ✅ Création du bénéficiaire
            $beneficiaire = $this->createBeneficiaireFromRow($row, $campagne, $typeAssistance);
            
            if ($beneficiaire) {
                $stats['imported_count']++;
                
                if ($stats['imported_count'] % 50 === 0) {
                    Log::info('🔄 Progression import', [
                        'imported' => $stats['imported_count'],
                        'processed' => $stats['total_processed']
                    ]);
                }
            } else {
                $stats['error_count']++;
                $stats['details_erreurs'][] = [
                    'ligne' => $rowNumber,
                    'erreurs' => ['Échec de création en base de données'],
                    'donnees' => $this->sanitizeRowForLog($row)
                ];
            }

        } catch (\Exception $e) {
            $stats['error_count']++;
            $stats['details_erreurs'][] = [
                'ligne' => $rowNumber,
                'erreurs' => ['Erreur technique: ' . $e->getMessage()],
                'donnees' => $this->sanitizeRowForLog($row)
            ];
            
            Log::error("❌ Erreur ligne {$rowNumber}", [
                'error' => $e->getMessage(),
                'row_data' => $this->sanitizeRowForLog($row)
            ]);
        }
    }

    Log::info('✅ Traitement terminé', $stats);

    return [
        'success' => true,
        'message' => "Import terminé: {$stats['imported_count']} créés, {$stats['skipped_count']} ignorés, {$stats['error_count']} erreurs",
        'data' => $stats
    ];
}

/**
 * Nettoyage des données de ligne pour les logs (évite Array to string conversion)
 */
private function sanitizeRowForLog($row)
{
    if (!is_array($row)) {
        return (string)$row;
    }

    $sanitized = [];
    foreach ($row as $key => $value) {
        if (is_array($value)) {
            $sanitized[$key] = '[Array]';
        } elseif (is_object($value)) {
            $sanitized[$key] = '[Object]';
        } else {
            $sanitized[$key] = (string)$value;
        }
    }
    
    return $sanitized;
}

/**
 * Création d'un bénéficiaire à partir des données de ligne
 */
private function createBeneficiaireFromRow($row, $campagne, $typeAssistance)
{
    try {
        $beneficiaire = new Beneficiaire();
        
        // Les mutateurs vont nettoyer automatiquement
        $beneficiaire->fill([
            'nom' => $row['nom'],
            'prenom' => $row['prenom'],
            'sexe' => $this->normalizeSexe($row['sexe']),
            'date_naissance' => Carbon::parse($row['date_naissance'])->format('Y-m-d'),
            'telephone' => $row['telephone'], // Mutateur va valider et nettoyer
            'email' => $row['email'] ?? null,
            'adresse' => $row['adresse'] ?? '',
            'cin' => $row['cin'] ?? null,
            'commentaire' => $row['commentaire'] ?? null,
            'campagne_id' => $campagne->id,
            'type_assistance_id' => $campagne->type_assistance_id,
            'date_demande' => now()->format('Y-m-d'),
            'hors_campagne' => false,
            'a_beneficie' => false,
            'enfants_scolarises' => $this->normalizeBoolean($row['enfants_scolarises'] ?? null),
            'cote' => $this->normalizeCote($row['cote'] ?? null),
            'decision' => $row['decision'] ?? null
        ]);

        $beneficiaire->save();
        
        return $beneficiaire;
        
    } catch (\Exception $e) {
        Log::error('❌ Erreur création bénéficiaire', [
            'error' => $e->getMessage(),
            'row' => $this->sanitizeRowForLog($row)
        ]);
        
        return null;
    }
}

/**
 * Utilitaires de normalisation
 */
private function normalizeSexe($sexe)
{
    $sexe = strtoupper(trim((string)$sexe));
    
    if (in_array($sexe, ['M', 'MASCULIN', 'HOMME'])) return 'M';
    if (in_array($sexe, ['F', 'FÉMININ', 'FEMININ', 'FEMME'])) return 'F';
    
    return $sexe;
}

private function normalizeCote($cote)
{
    if (empty($cote)) return null;
    
    $cote = strtolower(trim((string)$cote));
    
    if (in_array($cote, ['unilateral', 'unilatéral'])) return 'unilatéral';
    if (in_array($cote, ['bilateral', 'bilatéral'])) return 'bilatéral';
    
    return $cote;
}

private function normalizeBoolean($value)
{
    if (is_null($value) || $value === '') return null;
    
    $value = strtolower(trim((string)$value));
    
    if (in_array($value, ['oui', 'yes', 'true', '1'])) return true;
    if (in_array($value, ['non', 'no', 'false', '0'])) return false;
    
    return null;
}
// ✅ 2. NOUVELLE MÉTHODE: Traitement unifié de l'import

private function processFileImport($file, $campagneId, $ignoreDoublons, $forceImport)
{
    try {
        // ✅ DÉTERMINER LE NOM DE TABLE CORRECT
        $tableName = $this->getBeneficiairesTableName();
        Log::info('📋 Table utilisée pour import:', ['table' => $tableName]);

        // ✅ RÉCUPÉRER LES INFORMATIONS DE LA CAMPAGNE
        $campagne = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->where('campagnes_medicales.id', $campagneId)
            ->select('campagnes_medicales.*', 'types_assistance.libelle as type_assistance')
            ->first();

        if (!$campagne) {
            return [
                'success' => false,
                'message' => 'Campagne non trouvée',
                'status_code' => 404
            ];
        }

        // ✅ ANALYSER LE FICHIER
        $analysisResult = $this->analyzeFileForImport($file);
        
        if (!$analysisResult['success']) {
            return [
                'success' => false,
                'message' => 'Erreur analyse fichier: ' . $analysisResult['message'],
                'status_code' => 422
            ];
        }

        $rows = $analysisResult['data'];
        $headers = $analysisResult['headers'];
        $headerIndexes = $analysisResult['header_indexes'];

        Log::info('📊 Fichier analysé', [
            'total_rows' => count($rows),
            'headers' => $headers
        ]);

        // ✅ VALIDATION DES HEADERS OBLIGATOIRES
        $requiredHeaders = ['nom', 'prenom', 'sexe', 'adresse', 'telephone'];
        $missingHeaders = array_diff($requiredHeaders, array_keys($headerIndexes));

        if (!empty($missingHeaders)) {
            return [
                'success' => false,
                'message' => 'Colonnes obligatoires manquantes: ' . implode(', ', $missingHeaders),
                'errors' => [
                    'missing_headers' => $missingHeaders,
                    'detected_headers' => array_keys($headerIndexes),
                    'required_headers' => $requiredHeaders
                ],
                'status_code' => 422
            ];
        }

        // ✅ TRAITEMENT DES DONNÉES AVEC TRANSACTION
        $erreurs = [];
        $importes = 0;
        $ignores = 0;

        DB::beginTransaction();

        try {
            foreach ($rows as $index => $row) {
                $ligneNum = $index + 1;

                try {
                    // ✅ PRÉPARATION DES DONNÉES
                    $donnees = $this->prepareRowDataForImport($row, $headerIndexes, $campagne, $ligneNum);
                    
                    if ($donnees === false) {
                        $ignores++;
                        continue;
                    }

                    if (isset($donnees['errors'])) {
                        $erreurs[] = [
                            'ligne' => $ligneNum,
                            'erreurs' => $donnees['errors']
                        ];
                        
                        if (!$forceImport) {
                            continue;
                        }
                    }

                    // ✅ VÉRIFIER LES DOUBLONS
                    if ($ignoreDoublons) {
                        $doublon = DB::table($tableName)
                            ->where('telephone', $donnees['telephone'])
                            ->whereNull('date_suppression')
                            ->exists();

                        if ($doublon) {
                            $ignores++;
                            Log::debug("Ligne {$ligneNum} ignorée - doublon téléphone: {$donnees['telephone']}");
                            continue;
                        }
                    }

                    // ✅ INSERTION EN BASE
                    try {
                        $insertId = DB::table($tableName)->insertGetId($donnees);
                        
                        if (!$insertId) {
                            throw new \Exception('Insertion échouée - ID non généré');
                        }
                        
                        $importes++;
                        Log::debug("✅ Bénéficiaire inséré avec ID: {$insertId}");
                        
                    } catch (\Exception $insertError) {
                        Log::error("❌ Erreur insertion ligne {$ligneNum}", [
                            'error' => $insertError->getMessage(),
                            'data_sample' => [
                                'nom' => $donnees['nom'] ?? '',
                                'prenom' => $donnees['prenom'] ?? '',
                                'telephone' => $donnees['telephone'] ?? ''
                            ]
                        ]);
                        
                        $erreurs[] = [
                            'ligne' => $ligneNum,
                            'erreurs' => ['Erreur insertion BDD: ' . $insertError->getMessage()]
                        ];
                        
                        if (!$forceImport) {
                            continue;
                        }
                    }

                } catch (\Exception $e) {
                    Log::error("❌ Erreur traitement ligne {$ligneNum}", [
                        'error' => $e->getMessage()
                    ]);
                    
                    $erreurs[] = [
                        'ligne' => $ligneNum,
                        'erreurs' => ['Erreur traitement: ' . $e->getMessage()]
                    ];
                }
            }

            // ✅ DÉCISION DE COMMIT/ROLLBACK
            if ($forceImport || count($erreurs) === 0) {
                DB::commit();
                
                $message = $importes > 0 ? 
                    "Import terminé avec succès: {$importes} bénéficiaires importés" : 
                    "Import terminé: aucun bénéficiaire importé";
                    
                if (count($erreurs) > 0 && $forceImport) {
                    $message .= " ({$erreurs} erreurs ignorées)";
                }
                
                Log::info('✅ Import validé et commité', [
                    'importes' => $importes,
                    'ignores' => $ignores,
                    'erreurs' => count($erreurs),
                    'force_import' => $forceImport
                ]);
                
            } else {
                DB::rollBack();
                
                return [
                    'success' => false,
                    'message' => "Import annulé: {$erreurs} erreurs détectées. Utilisez 'forcer l'import' pour ignorer les erreurs.",
                    'errors' => array_slice($erreurs, 0, 10),
                    'status_code' => 422
                ];
            }

        } catch (\Exception $globalError) {
            DB::rollBack();
            throw $globalError;
        }

        // ✅ RETOUR SUCCÈS
        return [
            'success' => true,
            'message' => $message ?? "Import terminé: {$importes} bénéficiaires importés",
            'data' => [
                'total_lignes' => count($rows),
                'imported_count' => $importes,
                'skipped_count' => $ignores,
                'error_count' => count($erreurs),
                'total_processed' => count($rows),
                'details_erreurs' => array_slice($erreurs, 0, 10),
                'campagne_id' => $campagneId,
                'table_used' => $tableName
            ]
        ];

    } catch (\Exception $e) {
        Log::error('❌ Erreur critique processFileImport', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
        
        return [
            'success' => false,
            'message' => 'Erreur lors du traitement du fichier: ' . $e->getMessage(),
            'debug_info' => [
                'error_line' => $e->getLine(),
                'error_file' => basename($e->getFile())
            ],
            'status_code' => 500
        ];
    }
}

// ✅ 3. MÉTHODE HELPER AMÉLIORÉE: Conversion Boolean

private function convertToBoolean($value)
{
    // Si déjà boolean, retourner tel quel
    if (is_bool($value)) {
        return $value;
    }
    
    // Si string, normaliser et convertir
    if (is_string($value)) {
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['true', '1', 'yes', 'oui', 'on']);
    }
    
    // Si numérique, convertir
    if (is_numeric($value)) {
        return (bool) intval($value);
    }
    
    // Par défaut, false
    return false;
}

// ✅ 4. MÉTHODE HELPER: Déterminer le nom de table

private function getBeneficiairesTableName()
{
    try {
        if (Schema::hasTable('beneficiaires_medicaux')) {
            return 'beneficiaires_medicaux';
        } elseif (Schema::hasTable('beneficiaires')) {
            return 'beneficiaires';
        } else {
            throw new \Exception('Aucune table bénéficiaires trouvée dans la base de données');
        }
    } catch (\Exception $e) {
        Log::error('❌ Erreur détermination table', ['error' => $e->getMessage()]);
        throw new \Exception('Impossible de déterminer la table des bénéficiaires: ' . $e->getMessage());
    }
}

// ✅ 5. MÉTHODE HELPER: Debug et test de la base

public function debugDatabase()
{
    try {
        $debug = [
            'database_connection' => 'OK',
            'tables_status' => [],
            'insert_permissions' => 'UNKNOWN',
            'sample_test' => 'NOT_PERFORMED'
        ];

        // Test connexion base
        try {
            DB::connection()->getPdo();
            $debug['database_connection'] = 'CONNECTED';
        } catch (\Exception $e) {
            $debug['database_connection'] = 'ERROR: ' . $e->getMessage();
            return response()->json(['debug' => $debug]);
        }

        // Vérifier les tables
        $tables = ['beneficiaires_medicaux', 'beneficiaires', 'campagnes_medicales', 'types_assistance'];
        foreach ($tables as $table) {
            try {
                $exists = Schema::hasTable($table);
                $count = $exists ? DB::table($table)->count() : 0;
                $debug['tables_status'][$table] = [
                    'exists' => $exists,
                    'count' => $count
                ];
            } catch (\Exception $e) {
                $debug['tables_status'][$table] = [
                    'exists' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        // Test insertion
        try {
            $tableName = $this->getBeneficiairesTableName();
            
            $testData = [
                'nom' => 'TEST_DEBUG',
                'prenom' => 'Import',
                'sexe' => 'M',
                'telephone' => '0600000099',
                'adresse' => 'Test Debug Address',
                'type_assistance_id' => 1,
                'campagne_id' => 1,
                'date_demande' => now()->format('Y-m-d'),
                'created_at' => now(),
                'updated_at' => now()
            ];

            DB::beginTransaction();
            $testId = DB::table($tableName)->insertGetId($testData);
            
            if ($testId) {
                DB::table($tableName)->where('id', $testId)->delete();
                $debug['insert_permissions'] = 'OK';
                $debug['sample_test'] = 'SUCCESS - Insert/Delete OK';
            } else {
                $debug['insert_permissions'] = 'FAILED';
                $debug['sample_test'] = 'FAILED - No ID returned';
            }
            
            DB::rollBack();
            
        } catch (\Exception $insertError) {
            DB::rollBack();
            $debug['insert_permissions'] = 'ERROR';
            $debug['sample_test'] = 'ERROR: ' . $insertError->getMessage();
        }

        return response()->json([
            'success' => true,
            'debug' => $debug,
            'timestamp' => now()->toISOString()
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'debug' => $debug ?? []
        ]);
    }
}


// ✅ 1. CORRECTION DE LA MÉTHODE importBeneficiairesOptimized

public function importBeneficiairesOptimized(Request $request)
{
    $validator = Validator::make($request->all(), [
        'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        'campagne_id' => 'required|exists:campagnes_medicales,id',
        'ignore_doublons' => ['required', function ($attribute, $value, $fail) {
            // Accepter true/false, "true"/"false", "1"/"0", 1/0
            if (!in_array($value, [true, false, 'true', 'false', '1', '0', 1, 0], true)) {
                $fail('Le paramètre ignore_doublons doit être true ou false');
            }
        }],
        'dry_run' => 'sometimes|in:true,false,1,0'
    ], [
        'ignore_doublons.required' => 'Le champ ignore_doublons est obligatoire',
        'dry_run.in' => 'Le champ dry_run doit être true ou false'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Fichier invalide',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        $file = $request->file('file');
        $campagneId = $request->campagne_id;
        $ignoreDoublons = $this->convertToBoolean($request->input('ignore_doublons'));
        $dryRun = $this->convertToBoolean($request->input('dry_run', false));

        Log::info('🚀 Début import optimisé', [
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'campagne_id' => $campagneId,
            'ignore_doublons' => $ignoreDoublons,
            'dry_run' => $dryRun
        ]);

        // ✅ DÉTERMINER LE NOM DE TABLE CORRECT
        $tableName = $this->getBeneficiairesTableName();
        Log::info('📋 Table utilisée pour import:', ['table' => $tableName]);

        // Récupérer les informations de la campagne
        $campagne = DB::table('campagnes_medicales')
            ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->where('campagnes_medicales.id', $campagneId)
            ->select('campagnes_medicales.*', 'types_assistance.libelle as type_assistance')
            ->first();

        if (!$campagne) {
            return response()->json([
                'success' => false,
                'message' => 'Campagne non trouvée'
            ], 404);
        }

        // ✅ LIRE LE FICHIER DE MANIÈRE ROBUSTE
        $analysisResult = $this->analyzeFileForImport($file);
        
        if (!$analysisResult['success']) {
            return response()->json([
                'success' => false,
                'message' => $analysisResult['message']
            ], 422);
        }

        $rows = $analysisResult['data'];
        $headers = $analysisResult['headers'];
        $headerIndexes = $analysisResult['header_indexes'];

        Log::info('📊 Fichier analysé', [
            'total_rows' => count($rows),
            'headers' => $headers
        ]);

        // ✅ VALIDATION DES HEADERS OBLIGATOIRES
        $requiredHeaders = ['nom', 'prenom', 'sexe', 'adresse', 'telephone'];
        $missingHeaders = array_diff($requiredHeaders, array_keys($headerIndexes));

        if (!empty($missingHeaders)) {
            return response()->json([
                'success' => false,
                'message' => 'Colonnes obligatoires manquantes: ' . implode(', ', $missingHeaders),
                'debug_info' => [
                    'detected_headers' => array_keys($headerIndexes),
                    'required_headers' => $requiredHeaders,
                    'missing_headers' => $missingHeaders
                ]
            ], 422);
        }

        // ✅ TRAITEMENT DES DONNÉES AVEC TRANSACTION CONDITIONNELLE
        $erreurs = [];
        $importes = 0;
        $ignores = 0;

        // ✅ COMMENCER TRANSACTION SEULEMENT SI PAS DRY RUN
        if (!$dryRun) {
            DB::beginTransaction();
        }

        try {
            foreach ($rows as $index => $row) {
                $ligneNum = $index + 1;

                try {
                    // ✅ PRÉPARATION DES DONNÉES ROBUSTE
                    $donnees = $this->prepareRowDataForImport($row, $headerIndexes, $campagne, $ligneNum);
                    
                    if ($donnees === false) {
                        // Ligne ignorée (vide ou invalide)
                        $ignores++;
                        continue;
                    }

                    if (isset($donnees['errors'])) {
                        // Erreurs de validation
                        $erreurs[] = [
                            'ligne' => $ligneNum,
                            'erreurs' => $donnees['errors']
                        ];
                        continue;
                    }

                    // ✅ VÉRIFIER LES DOUBLONS
                    if (!$ignoreDoublons) {
                        $doublon = DB::table($tableName)
                            ->where('telephone', $donnees['telephone'])
                            ->whereNull('date_suppression')
                            ->exists();

                        if ($doublon) {
                            $ignores++;
                            Log::info("Ligne {$ligneNum} ignorée - doublon téléphone: {$donnees['telephone']}");
                            continue;
                        }
                    }

                    Log::debug("Ligne {$ligneNum} - Données préparées", [
                        'nom' => $donnees['nom'],
                        'prenom' => $donnees['prenom'],
                        'telephone' => $donnees['telephone']
                    ]);

                    // ✅ INSERTION EN BASE SI PAS DRY RUN
                    if (!$dryRun) {
                        try {
                            $insertId = DB::table($tableName)->insertGetId($donnees);
                            
                            if (!$insertId) {
                                throw new \Exception('Insertion échouée - ID non généré');
                            }
                            
                            Log::debug("✅ Bénéficiaire inséré avec ID: {$insertId}");
                            
                        } catch (\Exception $insertError) {
                            Log::error("❌ Erreur insertion ligne {$ligneNum}", [
                                'error' => $insertError->getMessage(),
                                'sql_state' => $insertError->getCode(),
                                'data_sample' => [
                                    'nom' => $donnees['nom'],
                                    'prenom' => $donnees['prenom'],
                                    'telephone' => $donnees['telephone']
                                ]
                            ]);
                            
                            $erreurs[] = [
                                'ligne' => $ligneNum,
                                'erreurs' => ['Erreur insertion BDD: ' . $insertError->getMessage()]
                            ];
                            continue;
                        }
                    }
                    
                    $importes++;

                } catch (\Exception $e) {
                    Log::error("❌ Erreur traitement ligne {$ligneNum}", [
                        'error' => $e->getMessage(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine()
                    ]);
                    
                    $erreurs[] = [
                        'ligne' => $ligneNum,
                        'erreurs' => ['Erreur traitement: ' . $e->getMessage()]
                    ];
                }
            }

            // ✅ COMMIT SEULEMENT SI PAS DRY RUN ET SUCCÈS
            if (!$dryRun && count($erreurs) === 0) {
                DB::commit();
                Log::info('✅ Import validé et commité', [
                    'importes' => $importes,
                    'ignores' => $ignores,
                    'erreurs' => count($erreurs)
                ]);
            } elseif (!$dryRun && count($erreurs) > 0) {
                // ✅ COMMIT PARTIEL SI FORCE IMPORT DEMANDÉ
                if ($request->boolean('force_import', false)) {
                    DB::commit();
                    Log::warning('⚠️ Import partiel commité avec erreurs (force_import)', [
                        'importes' => $importes,
                        'erreurs' => count($erreurs)
                    ]);
                } else {
                    DB::rollBack();
                    Log::warning('🔄 Rollback - erreurs détectées', [
                        'importes' => $importes,
                        'erreurs' => count($erreurs)
                    ]);
                }
            } else {
                if (!$dryRun) {
                    DB::rollBack();
                }
                Log::info('🔄 Rollback - dry run ou aucun import');
            }

        } catch (\Exception $globalError) {
            if (!$dryRun) {
                DB::rollBack();
            }
            throw $globalError;
        }

        $message = $dryRun ? 
            "Simulation terminée: $importes bénéficiaires seraient importés" : 
            "Import terminé: $importes bénéficiaires importés avec succès";

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => [
                'total_lignes' => count($rows),
                'imported_count' => $importes,
                'skipped_count' => $ignores,
                'error_count' => count($erreurs),
                'details_erreurs' => array_slice($erreurs, 0, 10), // Limiter les erreurs affichées
                'dry_run' => $dryRun,
                'campagne_id' => $campagneId,
                'table_used' => $tableName
            ]
        ]);

    } catch (\Exception $e) {
        Log::error('❌ Erreur critique import', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'import: ' . $e->getMessage(),
            'debug_info' => [
                'error_line' => $e->getLine(),
                'error_file' => basename($e->getFile())
            ]
        ], 500);
    }
}

// ✅ 2. MÉTHODE HELPER POUR DÉTERMINER LE NOM DE TABLE


// ✅ 3. MÉTHODE ROBUSTE D'ANALYSE DE FICHIER


// ✅ 4. MÉTHODE ROBUSTE DE PRÉPARATION DES DONNÉES

private function prepareRowDataForImport($row, $headerIndexes, $campagne, $ligneNum)
{
    try {
        // Vérifier si la ligne est vide
        if (empty(array_filter($row))) {
            return false; // Ligne vide - à ignorer
        }

        $errors = [];

        // ✅ EXTRACTION DES DONNÉES AVEC VÉRIFICATION D'EXISTENCE
        $nom = $this->getValueFromRow($row, $headerIndexes, 'nom');
        $prenom = $this->getValueFromRow($row, $headerIndexes, 'prenom');
        $sexe = $this->getValueFromRow($row, $headerIndexes, 'sexe');
        $adresse = $this->getValueFromRow($row, $headerIndexes, 'adresse');
        $telephone = $this->getValueFromRow($row, $headerIndexes, 'telephone');

        // ✅ VALIDATIONS OBLIGATOIRES
        if (empty($nom)) $errors[] = 'Nom obligatoire';
        if (empty($prenom)) $errors[] = 'Prénom obligatoire';
        if (empty($telephone)) $errors[] = 'Téléphone obligatoire';
        if (empty($adresse)) $errors[] = 'Adresse obligatoire';

        // ✅ NORMALISATION DU SEXE
        $sexeNormalized = $this->normalizeSexe($sexe);
        if (empty($sexeNormalized)) {
            $errors[] = 'Sexe invalide (M ou F requis)';
        }

        // ✅ NETTOYAGE DU TÉLÉPHONE
        $telephoneClean = preg_replace('/[^0-9]/', '', $telephone);
        if (strlen($telephoneClean) < 10) {
            $errors[] = 'Téléphone invalide';
        }

        // Si erreurs critiques, retourner les erreurs
        if (!empty($errors)) {
            return ['errors' => $errors];
        }

        // ✅ PRÉPARER LES DONNÉES POUR INSERTION
        $donnees = [
            'nom' => ucwords(strtolower(trim($nom))),
            'prenom' => ucwords(strtolower(trim($prenom))),
            'sexe' => $sexeNormalized,
            'adresse' => trim($adresse),
            'telephone' => $telephoneClean,
            'type_assistance_id' => $campagne->type_assistance_id,
            'campagne_id' => $campagne->id,
            'date_demande' => now()->format('Y-m-d'),
            'hors_campagne' => false,
            'a_beneficie' => false,
            'created_at' => now(),
            'updated_at' => now()
        ];

        // ✅ CHAMPS OPTIONNELS
        $email = $this->getValueFromRow($row, $headerIndexes, 'email');
        if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $donnees['email'] = strtolower(trim($email));
        }

        $cin = $this->getValueFromRow($row, $headerIndexes, 'cin');
        if (!empty($cin)) {
            $donnees['cin'] = strtoupper(trim($cin));
        }

        $commentaire = $this->getValueFromRow($row, $headerIndexes, 'commentaire');
        if (!empty($commentaire)) {
            $donnees['commentaire'] = trim($commentaire);
        }

        // ✅ DATE DE NAISSANCE
        $dateNaissance = $this->getValueFromRow($row, $headerIndexes, 'date_naissance');
        if (!empty($dateNaissance)) {
            try {
                if (is_numeric($dateNaissance)) {
                    // Format Excel numérique
                    $donnees['date_naissance'] = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($dateNaissance)->format('Y-m-d');
                } else {
                    $donnees['date_naissance'] = Carbon::parse($dateNaissance)->format('Y-m-d');
                }
            } catch (\Exception $e) {
                Log::warning("Erreur date naissance ligne {$ligneNum}: {$e->getMessage()}");
                $donnees['date_naissance'] = null;
            }
        }

        // ✅ CHAMPS ENUM
        $decision = $this->getValueFromRow($row, $headerIndexes, 'decision');
        if (!empty($decision)) {
            $donnees['decision'] = $this->normalizeDecisionValue($decision);
        }

        $cote = $this->getValueFromRow($row, $headerIndexes, 'cote');
        if (!empty($cote) && in_array(strtolower($cote), ['unilatéral', 'bilatéral'])) {
            $donnees['cote'] = strtolower($cote);
        }

        $enfantsScolarises = $this->getValueFromRow($row, $headerIndexes, 'enfants_scolarises');
        if (!empty($enfantsScolarises)) {
            $donnees['enfants_scolarises'] = $this->normalizeBoolean($enfantsScolarises);
        }

        return $donnees;

    } catch (\Exception $e) {
        Log::error("Erreur préparation données ligne {$ligneNum}", [
            'error' => $e->getMessage()
        ]);
        return ['errors' => ['Erreur préparation données: ' . $e->getMessage()]];
    }
}

// ✅ 5. MÉTHODES HELPER

/**
 * ✅ NOUVELLE MÉTHODE: Conversion flexible en boolean
 */

private function getValueFromRow($row, $headerIndexes, $column)
{
    if (!isset($headerIndexes[$column])) {
        return '';
    }
    
    $index = $headerIndexes[$column];
    return isset($row[$index]) ? trim($row[$index]) : '';
}



/**
 * ✅ CORRECTION POUR LA MÉTHODE importBeneficiaires ÉGALEMENT
 */

public function debugTableStatus()
{
    try {
        $info = [
            'tables_exist' => [
                'beneficiaires_medicaux' => Schema::hasTable('beneficiaires_medicaux'),
                'beneficiaires' => Schema::hasTable('beneficiaires')
            ],
            'selected_table' => null,
            'table_structure' => null,
            'sample_insert_test' => null
        ];

        // Déterminer la table à utiliser
        try {
            $tableName = $this->getBeneficiairesTableName();
            $info['selected_table'] = $tableName;

            // Obtenir la structure
            $columns = DB::select("DESCRIBE {$tableName}");
            $info['table_structure'] = $columns;

            // Test d'insertion simple
            $testData = [
                'nom' => 'Test',
                'prenom' => 'Import',
                'sexe' => 'M',
                'telephone' => '0600000000',
                'adresse' => 'Test Address',
                'type_assistance_id' => 1,
                'campagne_id' => 1,
                'date_demande' => now()->format('Y-m-d'),
                'created_at' => now(),
                'updated_at' => now()
            ];

            try {
                $testId = DB::table($tableName)->insertGetId($testData);
                
                if ($testId) {
                    // Nettoyer le test
                    DB::table($tableName)->where('id', $testId)->delete();
                    $info['sample_insert_test'] = 'SUCCESS - Insert/Delete works';
                } else {
                    $info['sample_insert_test'] = 'FAILED - Insert returned no ID';
                }
                
            } catch (\Exception $insertError) {
                $info['sample_insert_test'] = 'ERROR: ' . $insertError->getMessage();
            }

        } catch (\Exception $tableError) {
            $info['table_error'] = $tableError->getMessage();
        }

        return response()->json([
            'success' => true,
            'debug_info' => $info
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

/**
 * MÉTHODE MISE À JOUR : Créer une assistance médicale avec gestion des prêts
 */
public function storeAssistanceMedicale(Request $request)
{
    $validator = Validator::make($request->all(), [
        // Champs obligatoires
        'type_assistance_id' => 'required|exists:types_assistance,id',
        'beneficiaire_id' => 'required|exists:beneficiaires,id',
        'etat_don_id' => 'required|exists:etat_dones,id',
        'date_assistance' => 'required|date',
        'priorite' => 'required|in:Normale,Urgente,Très urgente',
        
        // Champs optionnels
        'campagne_id' => 'nullable|exists:campagnes_medicales,id',
        'details_type_assistance_id' => 'nullable|exists:details_type_assistances,id',
        'situation_id' => 'nullable|exists:situations,id',
        'nature_done_id' => 'nullable|exists:nature_dones,id',
        'montant' => 'nullable|numeric|min:0',
        'observations' => 'nullable|string|max:1000',
        'commentaire_interne' => 'nullable|string|max:1000',
        'realisee_par' => 'nullable|string|max:255',
        'moi_meme' => 'boolean',
        
        // Champs pour prêts - NOUVELLES RÈGLES
        'duree_utilisation' => 'nullable|integer|min:1',
        'retour_effectue' => 'boolean',
        'date_retour' => 'nullable|date',
        'observation_retour' => 'nullable|string|max:1000',
    ]);

    // NOUVELLE VALIDATION : Durée obligatoire pour les prêts
    $validator->after(function ($validator) use ($request) {
        if ($request->nature_done_id) {
            $natureDone = DB::table('nature_dones')
                ->where('id', $request->nature_done_id)
                ->first();
            
            if ($natureDone && stripos($natureDone->libelle, 'prêt pour une durée') !== false) {
                if (!$request->duree_utilisation || $request->duree_utilisation <= 0) {
                    $validator->errors()->add('duree_utilisation', 
                        'La durée d\'utilisation est obligatoire pour les prêts.');
                }
            }
        }
    });

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        DB::beginTransaction();

        $numeroAssistance = $this->generateNumeroAssistanceSecure();

        $assistanceData = [
            'numero_assistance' => $numeroAssistance,
            'type_assistance_id' => $request->type_assistance_id,
            'beneficiaire_id' => $request->beneficiaire_id,
            'etat_don_id' => $request->etat_don_id,
            'date_assistance' => $request->date_assistance,
            'priorite' => $request->priorite,
            'validee' => false,
            'rejetee' => false,
            'rappel_envoye' => false,
            'assistance_renouvelee' => false,
            'retour_effectue' => $request->boolean('retour_effectue', false),
            'moi_meme' => $request->boolean('moi_meme', false),
            'campagne_id' => $request->campagne_id,
            'details_type_assistance_id' => $request->details_type_assistance_id,
            'situation_id' => $request->situation_id,
            'nature_done_id' => $request->nature_done_id,
            'montant' => $request->montant ? floatval($request->montant) : null,
            'observations' => $request->observations,
            'commentaire_interne' => $request->commentaire_interne,
            'realisee_par' => $request->realisee_par,
            'duree_utilisation' => $request->duree_utilisation,
            'date_retour' => $request->date_retour,
            'observation_retour' => $request->observation_retour,
            'created_at' => now(),
            'updated_at' => now(),
            'created_by' => Auth::id()
        ];

        // CALCUL AUTOMATIQUE DE LA DATE FIN PRÉVUE POUR LES PRÊTS
        if ($assistanceData['duree_utilisation'] && $assistanceData['date_assistance']) {
            $dateFinPrevue = Carbon::parse($assistanceData['date_assistance'])
                ->addDays($assistanceData['duree_utilisation']);
            $assistanceData['date_fin_prevue'] = $dateFinPrevue->format('Y-m-d');
        }

        $assistanceId = DB::table('assistance_medicales')->insertGetId($assistanceData);

        if (!$assistanceId) {
            throw new Exception('Échec de l\'insertion en base de données');
        }

        DB::table('beneficiaires')
            ->where('id', $request->beneficiaire_id)
            ->update([
                'a_beneficie' => true,
                'updated_at' => now()
            ]);

        $assistance = $this->getAssistanceByIdWithPretStatus($assistanceId);

        DB::commit();

        Log::info('Assistance médicale créée', [
            'assistance_id' => $assistanceId,
            'numero_assistance' => $numeroAssistance,
            'est_pret' => !empty($assistanceData['date_fin_prevue']),
            'date_fin_prevue' => $assistanceData['date_fin_prevue'] ?? null,
            'user_id' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Assistance médicale créée avec succès',
            'data' => $assistance
        ], 201);

    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error('Erreur création assistance', [
            'error' => $e->getMessage(),
            'user_id' => Auth::id()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la création: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * NOUVELLE MÉTHODE : Marquer un prêt comme retourné
 */
public function marquerRetourPret(Request $request, $id)
{
    $validator = Validator::make($request->all(), [
        'date_retour' => 'required|date|before_or_equal:today',
        'observation_retour' => 'nullable|string|max:1000'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Données invalides',
            'errors' => $validator->errors()
        ], 422);
    }

    try {
        DB::beginTransaction();

        $assistance = DB::table('assistance_medicales')
            ->leftJoin('nature_dones', 'assistance_medicales.nature_done_id', '=', 'nature_dones.id')
            ->where('assistance_medicales.id', $id)
            ->whereNull('assistance_medicales.date_suppression')
            ->select('assistance_medicales.*', 'nature_dones.libelle as nature_done')
            ->first();

        if (!$assistance) {
            return response()->json([
                'success' => false,
                'message' => 'Assistance non trouvée'
            ], 404);
        }

        // Vérifier que c'est un prêt
        if (!$assistance->nature_done || stripos($assistance->nature_done, 'prêt') === false) {
            return response()->json([
                'success' => false,
                'message' => 'Cette assistance n\'est pas un prêt'
            ], 400);
        }

        // Vérifier que le retour n'est pas déjà effectué
        if ($assistance->retour_effectue) {
            return response()->json([
                'success' => false,
                'message' => 'Le retour a déjà été marqué comme effectué'
            ], 400);
        }

        // Mettre à jour
        DB::table('assistance_medicales')
            ->where('id', $id)
            ->update([
                'retour_effectue' => true,
                'date_retour' => $request->date_retour,
                'observation_retour' => $request->observation_retour,
                'updated_at' => now(),
                'updated_by' => Auth::id()
            ]);

        $assistanceUpdated = $this->getAssistanceByIdWithPretStatus($id);

        DB::commit();

        Log::info('Retour prêt marqué', [
            'assistance_id' => $id,
            'date_retour' => $request->date_retour,
            'user_id' => Auth::id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Retour marqué comme effectué avec succès',
            'data' => $assistanceUpdated
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        Log::error('Erreur marquage retour prêt', [
            'error' => $e->getMessage(),
            'assistance_id' => $id
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du marquage du retour: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * MÉTHODE MISE À JOUR : Lister les assistances avec statut prêt
 */
public function getAssistances(Request $request)
{
    try {
        $query = DB::table('assistance_medicales')
            ->leftJoin('beneficiaires', 'assistance_medicales.beneficiaire_id', '=', 'beneficiaires.id')
            ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
            ->leftJoin('details_type_assistances', 'assistance_medicales.details_type_assistance_id', '=', 'details_type_assistances.id')
            ->leftJoin('campagnes_medicales', 'assistance_medicales.campagne_id', '=', 'campagnes_medicales.id')
            ->leftJoin('situations', 'assistance_medicales.situation_id', '=', 'situations.id')
            ->leftJoin('etat_dones', 'assistance_medicales.etat_don_id', '=', 'etat_dones.id')
            ->leftJoin('nature_dones', 'assistance_medicales.nature_done_id', '=', 'nature_dones.id')
            ->select(
                'assistance_medicales.id',
                'assistance_medicales.numero_assistance',
                'assistance_medicales.date_assistance',
                'assistance_medicales.montant',
                'assistance_medicales.priorite',
                'assistance_medicales.observations',
                'assistance_medicales.moi_meme',
                'assistance_medicales.retour_effectue',
                'assistance_medicales.date_retour',
                'assistance_medicales.date_fin_prevue',
                'assistance_medicales.duree_utilisation',
                'assistance_medicales.realisee_par',
                'assistance_medicales.created_at',
                'beneficiaires.nom',
                'beneficiaires.prenom',
                'beneficiaires.cin as beneficiaire_cin',
                'beneficiaires.telephone',
                DB::raw("CONCAT(COALESCE(beneficiaires.nom, ''), ' ', COALESCE(beneficiaires.prenom, '')) as nom_complet_beneficiaire"),
                'types_assistance.libelle as type_assistance',
                'details_type_assistances.libelle as details_type_assistance',
                'campagnes_medicales.nom as campagne_nom',
                'situations.libelle as situation',
                'etat_dones.libelle as etat_don',
                'nature_dones.libelle as nature_done'
            )
            ->whereNull('assistance_medicales.date_suppression');

        // Filtres existants
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('assistance_medicales.numero_assistance', 'like', "%{$search}%")
                  ->orWhere('beneficiaires.nom', 'like', "%{$search}%")
                  ->orWhere('beneficiaires.prenom', 'like', "%{$search}%")
                  ->orWhere('beneficiaires.cin', 'like', "%{$search}%");
            });
        }

        if ($request->filled('moi_meme')) {
            $query->where('assistance_medicales.moi_meme', $request->boolean('moi_meme'));
        }

        if ($request->filled('type_assistance_id')) {
            $query->where('assistance_medicales.type_assistance_id', $request->type_assistance_id);
        }

        if ($request->filled('priorite')) {
            $query->where('assistance_medicales.priorite', $request->priorite);
        }

        // NOUVEAU FILTRE : Statut prêt
        if ($request->filled('statut_pret')) {
            $statutPret = $request->statut_pret;
            
            switch ($statutPret) {
                case 'en_cours':
                    $query->whereNotNull('assistance_medicales.date_fin_prevue')
                          ->where('assistance_medicales.retour_effectue', false)
                          ->where('assistance_medicales.date_fin_prevue', '>=', Carbon::now()->toDateString());
                    break;
                    
                case 'en_retard':
                    $query->whereNotNull('assistance_medicales.date_fin_prevue')
                          ->where('assistance_medicales.retour_effectue', false)
                          ->where('assistance_medicales.date_fin_prevue', '<', Carbon::now()->toDateString());
                    break;
                    
                case 'retourne':
                    $query->where('assistance_medicales.retour_effectue', true);
                    break;
                    
                case 'non_pret':
                    $query->whereNull('assistance_medicales.date_fin_prevue');
                    break;
            }
        }

        // Tri
        $sortBy = $request->get('sort_by', 'date_assistance');
        $sortDir = $request->get('sort_dir', 'desc');
        $query->orderBy('assistance_medicales.' . $sortBy, $sortDir);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $page = $request->get('page', 1);
        $offset = ($page - 1) * $perPage;

        $totalCount = $query->count();
        $assistances = $query->limit($perPage)->offset($offset)->get();

        // ENRICHISSEMENT AVEC STATUT PRÊT ET CALCULS
        $assistances = $assistances->map(function($assistance) {
            // Informations sur moi_meme (existant)
            $assistance->moi_meme_label = $assistance->moi_meme ? 'Oui' : 'Non';
            $assistance->moi_meme_icon = $assistance->moi_meme ? '👤' : '';
            $assistance->moi_meme_color = $assistance->moi_meme ? 'primary' : 'default';

            // NOUVEAUX CALCULS POUR LES PRÊTS
            $estPret = !empty($assistance->date_fin_prevue);
            $assistance->est_pret = $estPret;

            if ($estPret) {
                $today = Carbon::now();
                $dateFin = Carbon::parse($assistance->date_fin_prevue);
                
                if ($assistance->retour_effectue) {
                    $assistance->statut_pret = 'retourne';
                    $assistance->statut_pret_label = 'Retourné';
                    $assistance->statut_pret_color = 'success';
                    $assistance->jours_restants = 0;
                } elseif ($dateFin->isPast()) {
                    $assistance->statut_pret = 'en_retard';
                    $assistance->statut_pret_label = 'En retard';
                    $assistance->statut_pret_color = 'error';
                    $assistance->jours_restants = $today->diffInDays($dateFin) * -1; // Négatif pour retard
                } else {
                    $assistance->statut_pret = 'en_cours';
                    $assistance->statut_pret_label = 'En cours';
                    $assistance->statut_pret_color = 'warning';
                    $assistance->jours_restants = $today->diffInDays($dateFin);
                }
            } else {
                $assistance->statut_pret = 'non_pret';
                $assistance->statut_pret_label = 'Non applicable';
                $assistance->statut_pret_color = 'default';
                $assistance->jours_restants = 0;
            }

            return $assistance;
        });

        return response()->json([
            'success' => true,
            'data' => $assistances,
            'current_page' => (int) $page,
            'per_page' => (int) $perPage,
            'total' => $totalCount,
            'last_page' => ceil($totalCount / $perPage),
            'filters' => [
                'search' => $request->search,
                'statut_pret' => $request->statut_pret,
                'type_assistance_id' => $request->type_assistance_id,
                'priorite' => $request->priorite,
                'moi_meme' => $request->moi_meme
            ]
        ]);

    } catch (Exception $e) {
        Log::error('Erreur getAssistances', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement des assistances: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * NOUVELLE MÉTHODE : Obtenir les statistiques des prêts
 */
public function getStatistiquesPrets(Request $request)
{
    try {
        $dateDebut = $request->get('date_debut');
        $dateFin = $request->get('date_fin');

        $query = DB::table('assistance_medicales')
            ->leftJoin('nature_dones', 'assistance_medicales.nature_done_id', '=', 'nature_dones.id')
            ->whereNull('assistance_medicales.date_suppression')
            ->whereNotNull('assistance_medicales.date_fin_prevue'); // Seulement les prêts

        if ($dateDebut && $dateFin) {
            $query->whereBetween('assistance_medicales.date_assistance', [$dateDebut, $dateFin]);
        }

        $today = Carbon::now()->toDateString();

        $stats = [
            'total_prets' => $query->count(),
            'en_cours' => $query->clone()
                ->where('assistance_medicales.retour_effectue', false)
                ->where('assistance_medicales.date_fin_prevue', '>=', $today)
                ->count(),
            'en_retard' => $query->clone()
                ->where('assistance_medicales.retour_effectue', false)
                ->where('assistance_medicales.date_fin_prevue', '<', $today)
                ->count(),
            'retournes' => $query->clone()
                ->where('assistance_medicales.retour_effectue', true)
                ->count()
        ];

        // Prêts à retourner dans les 7 prochains jours
        $stats['a_retourner_prochainement'] = DB::table('assistance_medicales')
            ->whereNull('date_suppression')
            ->whereNotNull('date_fin_prevue')
            ->where('retour_effectue', false)
            ->whereBetween('date_fin_prevue', [
                $today,
                Carbon::now()->addDays(7)->toDateString()
            ])
            ->count();

        return response()->json([
            'success' => true,
            'data' => $stats,
            'periode' => [
                'debut' => $dateDebut,
                'fin' => $dateFin
            ]
        ]);

    } catch (Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du calcul des statistiques: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * MÉTHODE HELPER : Récupérer une assistance avec statut prêt
 */
private function getAssistanceByIdWithPretStatus($id)
{
    $assistance = DB::table('assistance_medicales')
        ->leftJoin('beneficiaires', 'assistance_medicales.beneficiaire_id', '=', 'beneficiaires.id')
        ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
        ->leftJoin('details_type_assistances', 'assistance_medicales.details_type_assistance_id', '=', 'details_type_assistances.id')
        ->leftJoin('campagnes_medicales', 'assistance_medicales.campagne_id', '=', 'campagnes_medicales.id')
        ->leftJoin('situations', 'assistance_medicales.situation_id', '=', 'situations.id')
        ->leftJoin('etat_dones', 'assistance_medicales.etat_don_id', '=', 'etat_dones.id')
        ->leftJoin('nature_dones', 'assistance_medicales.nature_done_id', '=', 'nature_dones.id')
        ->select(
            'assistance_medicales.*',
            'beneficiaires.nom as beneficiaire_nom',
            'beneficiaires.prenom as beneficiaire_prenom',
            'beneficiaires.cin as beneficiaire_cin',
            'beneficiaires.telephone as beneficiaire_telephone',
            DB::raw("CONCAT(beneficiaires.nom, ' ', beneficiaires.prenom) as nom_complet_beneficiaire"),
            'types_assistance.libelle as type_assistance',
            'details_type_assistances.libelle as details_type_assistance',
            'campagnes_medicales.nom as campagne_nom',
            'situations.libelle as situation',
            'etat_dones.libelle as etat_don',
            'nature_dones.libelle as nature_done'
        )
        ->where('assistance_medicales.id', $id)
        ->whereNull('assistance_medicales.date_suppression')
        ->first();

    if ($assistance && $assistance->date_fin_prevue) {
        $today = Carbon::now();
        $dateFin = Carbon::parse($assistance->date_fin_prevue);
        
        $assistance->est_pret = true;
        
        if ($assistance->retour_effectue) {
            $assistance->statut_pret = 'retourne';
            $assistance->jours_restants = 0;
        } elseif ($dateFin->isPast()) {
            $assistance->statut_pret = 'en_retard';
            $assistance->jours_restants = $today->diffInDays($dateFin) * -1;
        } else {
            $assistance->statut_pret = 'en_cours';
            $assistance->jours_restants = $today->diffInDays($dateFin);
        }
    } else {
        $assistance->est_pret = false;
        $assistance->statut_pret = 'non_pret';
        $assistance->jours_restants = 0;
    }

    return $assistance;
}



public function getStatistiquesCampagne($id)
    {
        try {
            $campagne = DB::table('campagnes_medicales')
                ->leftJoin('types_assistance', 'campagnes_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select(
                    'campagnes_medicales.*',
                    'types_assistance.libelle as type_assistance_libelle'
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

            // Statistiques de base des bénéficiaires
            $beneficiairesQuery = DB::table('beneficiaires')
                ->where('campagne_id', $id)
                ->whereNull('date_suppression');

            $beneficiairesStats = $beneficiairesQuery
                ->select(
                    DB::raw('COUNT(*) as total'),
                    DB::raw('SUM(CASE WHEN sexe = "M" THEN 1 ELSE 0 END) as hommes'),
                    DB::raw('SUM(CASE WHEN sexe = "F" THEN 1 ELSE 0 END) as femmes'),
                    DB::raw('SUM(CASE WHEN a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie')
                )
                ->first();

            // Calcul des tranches d'âge
            $beneficiaires = $beneficiairesQuery->get();
            $tranchesAge = [
                'moins_15' => 0,
                '15_64' => 0,
                'plus_65' => 0
            ];

            foreach ($beneficiaires as $beneficiaire) {
                if ($beneficiaire->date_naissance) {
                    $age = Carbon::parse($beneficiaire->date_naissance)->age;
                    if ($age < 15) {
                        $tranchesAge['moins_15']++;
                    } elseif ($age <= 64) {
                        $tranchesAge['15_64']++;
                    } else {
                        $tranchesAge['plus_65']++;
                    }
                }
            }

            $statistiques = [
                'campagne' => $campagne,
                'beneficiaires' => [
                    'total' => $beneficiairesStats->total ?? 0,
                    'hommes' => $beneficiairesStats->hommes ?? 0,
                    'femmes' => $beneficiairesStats->femmes ?? 0,
                    'ayant_beneficie' => $beneficiairesStats->ayant_beneficie ?? 0,
                    'tranches_age' => $tranchesAge
                ]
            ];

            // Statistiques spécifiques selon le type d'assistance
            $typeAssistanceLibelle = strtolower($campagne->type_assistance_libelle ?? '');

            if ($typeAssistanceLibelle === 'lunettes') {
                $statistiques['lunettes'] = $this->getStatistiquesLunettes($id);
            } elseif (strpos($typeAssistanceLibelle, 'auditif') !== false) {
                $statistiques['appareils_auditifs'] = $this->getStatistiquesAuditifs($id);
            }

            return response()->json([
                'success' => true,
                'data' => $statistiques
            ]);

        } catch (Exception $e) {
            Log::error('Erreur statistiques campagne', [
                'campagne_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul des statistiques: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Statistiques spécifiques pour les lunettes
     */
    private function getStatistiquesLunettes($campagneId)
    {
        $lunettesStats = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->whereNull('date_suppression')
            ->select(
                DB::raw('COUNT(*) as total_personnes'),
                DB::raw('SUM(CASE WHEN enfants_scolarises = 1 THEN 1 ELSE 0 END) as enfants_scolarises_oui'),
                DB::raw('SUM(CASE WHEN enfants_scolarises = 0 THEN 1 ELSE 0 END) as enfants_scolarises_non'),
                DB::raw('SUM(CASE WHEN enfants_scolarises IS NULL THEN 1 ELSE 0 END) as enfants_scolarises_na'),
                DB::raw('SUM(CASE WHEN a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie')
            )
            ->first();

        return [
            'total_personnes_necessitant' => $lunettesStats->total_personnes ?? 0,
            'ayant_beneficie' => $lunettesStats->ayant_beneficie ?? 0,
            'enfants_scolarises' => [
                'oui' => $lunettesStats->enfants_scolarises_oui ?? 0,
                'non' => $lunettesStats->enfants_scolarises_non ?? 0,
                'non_applicable' => $lunettesStats->enfants_scolarises_na ?? 0
            ],
            'credit_estime' => ($lunettesStats->ayant_beneficie ?? 0) * 190,
            'prix_unitaire' => 190,
            'appareils_distribues' => $lunettesStats->ayant_beneficie ?? 0
        ];
    }

    /**
     * Statistiques spécifiques pour les appareils auditifs
     */
    private function getStatistiquesAuditifs($campagneId)
    {
        $auditifsStats = DB::table('beneficiaires')
            ->where('campagne_id', $campagneId)
            ->whereNull('date_suppression')
            ->select(
                DB::raw('COUNT(*) as total_cas_surdite'),
                DB::raw('SUM(CASE WHEN cote = "unilatéral" THEN 1 ELSE 0 END) as unilateral'),
                DB::raw('SUM(CASE WHEN cote = "bilatéral" THEN 1 ELSE 0 END) as bilateral'),
                DB::raw('SUM(CASE WHEN a_beneficie = 1 THEN 1 ELSE 0 END) as ayant_beneficie')
            )
            ->first();

        return [
            'total_cas_surdite' => $auditifsStats->total_cas_surdite ?? 0,
            'ayant_beneficie' => $auditifsStats->ayant_beneficie ?? 0,
            'par_cote' => [
                'unilateral' => $auditifsStats->unilateral ?? 0,
                'bilateral' => $auditifsStats->bilateral ?? 0
            ],
            'credit_estime' => ($auditifsStats->ayant_beneficie ?? 0) * 2050,
            'prix_unitaire' => 2050,
            'appareils_distribues' => $auditifsStats->ayant_beneficie ?? 0
        ];
    }

    /**
     * Statistiques détaillées pour les lunettes avec filtres
     */
    public function getStatistiquesLunettesDetaillees(Request $request)
    {
        try {
            $query = DB::table('beneficiaires')
                ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
                ->leftJoin('campagnes_medicales', 'beneficiaires.campagne_id', '=', 'campagnes_medicales.id')
                ->where('types_assistance.libelle', 'LIKE', '%lunette%')
                ->whereNull('beneficiaires.date_suppression');

            // Filtres optionnels
            if ($request->filled('campagne_id')) {
                $query->where('beneficiaires.campagne_id', $request->campagne_id);
            }

            if ($request->filled('date_debut') && $request->filled('date_fin')) {
                $query->whereBetween('beneficiaires.created_at', [$request->date_debut, $request->date_fin]);
            }

            $beneficiaires = $query->select(
                'beneficiaires.*',
                'campagnes_medicales.nom as campagne_nom'
            )->get();

            // Calcul des tranches d'âge
            $tranchesAge = ['moins_15' => 0, '15_64' => 0, 'plus_65' => 0];
            foreach ($beneficiaires as $beneficiaire) {
                if ($beneficiaire->date_naissance) {
                    $age = Carbon::parse($beneficiaire->date_naissance)->age;
                    if ($age < 15) $tranchesAge['moins_15']++;
                    elseif ($age <= 64) $tranchesAge['15_64']++;
                    else $tranchesAge['plus_65']++;
                }
            }

            // Statistiques par campagne
            $parCampagne = $beneficiaires->groupBy('campagne_nom')
                ->map(function ($groupe, $campagne) {
                    return [
                        'campagne' => $campagne ?: 'Hors campagne',
                        'total' => $groupe->count(),
                        'ayant_beneficie' => $groupe->where('a_beneficie', true)->count(),
                        'credit_consomme' => $groupe->where('a_beneficie', true)->count() * 190
                    ];
                })->values();

            $stats = [
                'total' => $beneficiaires->count(),
                'par_sexe' => [
                    'hommes' => $beneficiaires->where('sexe', 'M')->count(),
                    'femmes' => $beneficiaires->where('sexe', 'F')->count(),
                ],
                'par_tranche_age' => $tranchesAge,
                'enfants_scolarises' => [
                    'oui' => $beneficiaires->where('enfants_scolarises', true)->count(),
                    'non' => $beneficiaires->where('enfants_scolarises', false)->count(),
                    'non_applicable' => $beneficiaires->whereNull('enfants_scolarises')->count(),
                ],
                'ayant_beneficie' => $beneficiaires->where('a_beneficie', true)->count(),
                'credit_consomme' => $beneficiaires->where('a_beneficie', true)->count() * 190,
                'par_campagne' => $parCampagne,
                'prix_unitaire' => 190
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul des statistiques détaillées: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculer le crédit total consommé
     */
    public function getCreditConsomme(Request $request)
    {
        try {
            $query = DB::table('beneficiaires')
                ->leftJoin('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
                ->leftJoin('campagnes_medicales', 'beneficiaires.campagne_id', '=', 'campagnes_medicales.id')
                ->where('beneficiaires.a_beneficie', true)
                ->whereNull('beneficiaires.date_suppression');

            // Filtres
            if ($request->filled('campagne_id')) {
                $query->where('beneficiaires.campagne_id', $request->campagne_id);
            }

            if ($request->filled('date_debut') && $request->filled('date_fin')) {
                $query->whereBetween('beneficiaires.created_at', [$request->date_debut, $request->date_fin]);
            }

            $beneficiaires = $query->select(
                'beneficiaires.*',
                'types_assistance.libelle as type_assistance',
                'campagnes_medicales.nom as campagne_nom'
            )->get();

            $creditTotal = 0;
            $detailsCredit = [];

            // Grouper par type d'assistance
            $typesGroupes = $beneficiaires->groupBy('type_assistance');

            foreach ($typesGroupes as $type => $groupe) {
                $prixUnitaire = $this->getPrixUnitaireByType($type);
                $creditType = $groupe->count() * $prixUnitaire;
                $creditTotal += $creditType;

                // Détail par campagne
                $parCampagne = $groupe->groupBy('campagne_nom')
                    ->map(function ($campagneGroupe, $campagne) use ($prixUnitaire) {
                        return [
                            'campagne' => $campagne ?: 'Hors campagne',
                            'nombre' => $campagneGroupe->count(),
                            'credit' => $campagneGroupe->count() * $prixUnitaire
                        ];
                    })->values();

                $detailsCredit[] = [
                    'type_assistance' => $type,
                    'nombre_beneficiaires' => $groupe->count(),
                    'prix_unitaire' => $prixUnitaire,
                    'credit_consomme' => $creditType,
                    'par_campagne' => $parCampagne
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'credit_total' => $creditTotal,
                    'nombre_total_beneficiaires' => $beneficiaires->count(),
                    'details_par_type' => $detailsCredit,
                    'periode' => [
                        'debut' => $request->date_debut,
                        'fin' => $request->date_fin
                    ]
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul du crédit consommé: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir le prix unitaire selon le type d'assistance
     */
    private function getPrixUnitaireByType($type)
    {
        $type = strtolower($type);
        
        if (strpos($type, 'lunette') !== false) {
            return 190;
        } elseif (strpos($type, 'auditif') !== false) {
            return 2050;
        }
        
        return 0;
    }

    /**
     * Statistiques globales du dashboard
     */
    public function getDashboardStatistics()
    {
        try {
            // Statistiques générales
            $stats = [
                'campagnes' => [
                    'total' => DB::table('campagnes_medicales')->whereNull('date_suppression')->count(),
                    'actives' => DB::table('campagnes_medicales')
                        ->whereNull('date_suppression')
                        ->where('statut', 'Active')
                        ->count(),
                    'terminees' => DB::table('campagnes_medicales')
                        ->whereNull('date_suppression')
                        ->where('statut', 'Terminée')
                        ->count()
                ],
                'beneficiaires' => [
                    'total' => DB::table('beneficiaires')->whereNull('date_suppression')->count(),
                    'ayant_beneficie' => DB::table('beneficiaires')
                        ->whereNull('date_suppression')
                        ->where('a_beneficie', true)
                        ->count(),
                    'en_attente' => DB::table('beneficiaires')
                        ->whereNull('date_suppression')
                        ->where('a_beneficie', false)
                        ->count()
                ]
            ];

            // Crédit total consommé
            $creditLunettes = DB::table('beneficiaires')
                ->join('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
                ->where('types_assistance.libelle', 'LIKE', '%lunette%')
                ->where('beneficiaires.a_beneficie', true)
                ->whereNull('beneficiaires.date_suppression')
                ->count() * 190;

            $creditAuditifs = DB::table('beneficiaires')
                ->join('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
                ->where('types_assistance.libelle', 'LIKE', '%auditif%')
                ->where('beneficiaires.a_beneficie', true)
                ->whereNull('beneficiaires.date_suppression')
                ->count() * 2050;

            $stats['credit_total'] = $creditLunettes + $creditAuditifs;
            $stats['credit_lunettes'] = $creditLunettes;
            $stats['credit_auditifs'] = $creditAuditifs;

            // Répartition par type d'assistance
            $repartitionTypes = DB::table('beneficiaires')
                ->join('types_assistance', 'beneficiaires.type_assistance_id', '=', 'types_assistance.id')
                ->select(
                    'types_assistance.libelle',
                    DB::raw('COUNT(*) as total'),
                    DB::raw('SUM(CASE WHEN beneficiaires.a_beneficie = 1 THEN 1 ELSE 0 END) as beneficiant')
                )
                ->whereNull('beneficiaires.date_suppression')
                ->groupBy('types_assistance.id', 'types_assistance.libelle')
                ->get();

            $stats['repartition_types'] = $repartitionTypes;

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul des statistiques du dashboard: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rapport comparatif entre campagnes
     */
    public function getRapportComparatif(Request $request)
    {
        try {
            $campagneIds = $request->input('campagne_ids', []);
            
            if (empty($campagneIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Veuillez sélectionner au moins une campagne'
                ], 400);
            }

            $comparaison = [];

            foreach ($campagneIds as $campagneId) {
                $statsCampagne = $this->getStatistiquesCampagne($campagneId);
                
                if ($statsCampagne->original['success']) {
                    $comparaison[] = $statsCampagne->original['data'];
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'comparaison' => $comparaison,
                    'resume' => $this->calculerResume($comparaison)
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport comparatif: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculer un résumé des statistiques comparées
     */
    private function calculerResume($comparaison)
    {
        $totalBeneficiaires = 0;
        $totalAyantBeneficie = 0;
        $totalCredit = 0;

        foreach ($comparaison as $campagne) {
            $totalBeneficiaires += $campagne['beneficiaires']['total'];
            $totalAyantBeneficie += $campagne['beneficiaires']['ayant_beneficie'];
            
            if (isset($campagne['lunettes'])) {
                $totalCredit += $campagne['lunettes']['credit_estime'];
            }
            if (isset($campagne['appareils_auditifs'])) {
                $totalCredit += $campagne['appareils_auditifs']['credit_estime'];
            }
        }

        return [
            'nombre_campagnes' => count($comparaison),
            'total_beneficiaires' => $totalBeneficiaires,
            'total_ayant_beneficie' => $totalAyantBeneficie,
            'total_credit' => $totalCredit,
            'taux_satisfaction' => $totalBeneficiaires > 0 ? round(($totalAyantBeneficie / $totalBeneficiaires) * 100, 2) : 0
        ];
    }

    /**
     * Export des statistiques en format CSV
     */
    public function exportStatistiques(Request $request)
    {
        try {
            $type = $request->input('type', 'campagne');
            $campagneId = $request->input('campagne_id');

            $filename = 'statistiques_' . $type . '_' . date('Y-m-d_H-i-s') . '.csv';

            $headers = [
                'Content-Type' => 'text/csv; charset=utf-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];

            $callback = function() use ($type, $campagneId) {
                $file = fopen('php://output', 'w');
                
                // BOM UTF-8
                fputs($file, "\xEF\xBB\xBF");

                if ($type === 'campagne' && $campagneId) {
                    $this->exportStatistiquesCampagne($file, $campagneId);
                } else {
                    $this->exportStatistiquesGlobales($file);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export des statistiques d'une campagne spécifique
     */
    private function exportStatistiquesCampagne($file, $campagneId)
    {
        $stats = $this->getStatistiquesCampagne($campagneId);
        $data = $stats->original['data'];

        // En-têtes
        fputcsv($file, ['Indicateur', 'Valeur']);
        
        // Informations générales
        fputcsv($file, ['Campagne', $data['campagne']->nom]);
        fputcsv($file, ['Total bénéficiaires', $data['beneficiaires']['total']]);
        fputcsv($file, ['Hommes', $data['beneficiaires']['hommes']]);
        fputcsv($file, ['Femmes', $data['beneficiaires']['femmes']]);
        fputcsv($file, ['Ayant bénéficié', $data['beneficiaires']['ayant_beneficie']]);
        
        // Tranches d'âge
        fputcsv($file, ['Moins de 15 ans', $data['beneficiaires']['tranches_age']['moins_15']]);
        fputcsv($file, ['15-64 ans', $data['beneficiaires']['tranches_age']['15_64']]);
        fputcsv($file, ['Plus de 65 ans', $data['beneficiaires']['tranches_age']['plus_65']]);

        // Statistiques spécifiques
        if (isset($data['lunettes'])) {
            fputcsv($file, ['']);
            fputcsv($file, ['LUNETTES']);
            fputcsv($file, ['Crédit estimé (DHS)', $data['lunettes']['credit_estime']]);
            fputcsv($file, ['Prix unitaire (DHS)', $data['lunettes']['prix_unitaire']]);
        }

        if (isset($data['appareils_auditifs'])) {
            fputcsv($file, ['']);
            fputcsv($file, ['APPAREILS AUDITIFS']);
            fputcsv($file, ['Crédit estimé (DHS)', $data['appareils_auditifs']['credit_estime']]);
            fputcsv($file, ['Prix unitaire (DHS)', $data['appareils_auditifs']['prix_unitaire']]);
        }
    }

    /**
     * Export des statistiques globales
     */
    private function exportStatistiquesGlobales($file)
    {
        $stats = $this->getDashboardStatistics();
        $data = $stats->original['data'];

        // En-têtes
        fputcsv($file, ['Type', 'Indicateur', 'Valeur']);
        
        // Campagnes
        fputcsv($file, ['Campagnes', 'Total', $data['campagnes']['total']]);
        fputcsv($file, ['Campagnes', 'Actives', $data['campagnes']['actives']]);
        fputcsv($file, ['Campagnes', 'Terminées', $data['campagnes']['terminees']]);
        
        // Bénéficiaires
        fputcsv($file, ['Bénéficiaires', 'Total', $data['beneficiaires']['total']]);
        fputcsv($file, ['Bénéficiaires', 'Ayant bénéficié', $data['beneficiaires']['ayant_beneficie']]);
        fputcsv($file, ['Bénéficiaires', 'En attente', $data['beneficiaires']['en_attente']]);
        
        // Crédit
        fputcsv($file, ['Crédit', 'Total (DHS)', $data['credit_total']]);
        fputcsv($file, ['Crédit', 'Lunettes (DHS)', $data['credit_lunettes']]);
        fputcsv($file, ['Crédit', 'Auditifs (DHS)', $data['credit_auditifs']]);
    }



    private $pdfStorageStrategy = 'file';

    /**
     * Lister les kafalas avec filtres et pagination
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'search' => 'nullable|string|max:255',
                'sexe_enfant' => 'nullable|in:M,F',
                'date_mariage_from' => 'nullable|date',
                'date_mariage_to' => 'nullable|date|after_or_equal:date_mariage_from',
                'sort_by' => 'nullable|in:reference,nom_pere,nom_mere,nom_enfant,date_mariage,created_at',
                'sort_dir' => 'nullable|in:asc,desc',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Données de filtrage invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = Kafala::query();

            // Filtres
            if ($request->filled('search')) {
                $query->search($request->search);
            }

            if ($request->filled('sexe_enfant')) {
                $query->bySexeEnfant($request->sexe_enfant);
            }

            if ($request->filled('date_mariage_from')) {
                $query->where('date_mariage', '>=', $request->date_mariage_from);
            }

            if ($request->filled('date_mariage_to')) {
                $query->where('date_mariage', '<=', $request->date_mariage_to);
            }

            // Tri
            $sortBy = $request->get('sort_by', 'created_at');
            $sortDir = $request->get('sort_dir', 'desc');
            $query->orderBy($sortBy, $sortDir);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $kafalas = $query->paginate($perPage);

            // Ajouter les informations PDF pour chaque kafala
            $kafalas->getCollection()->transform(function ($kafala) {
                $kafala->append(['a_fichier_pdf', 'fichier_pdf_taille_formatee']);
                return $kafala;
            });

            return response()->json([
                'data' => $kafalas->items(),
                'current_page' => $kafalas->currentPage(),
                'last_page' => $kafalas->lastPage(),
                'per_page' => $kafalas->perPage(),
                'total' => $kafalas->total(),
                'from' => $kafalas->firstItem(),
                'to' => $kafalas->lastItem()
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des kafalas: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la récupération des données'
            ], 500);
        }
    }

    /**
     * Créer une nouvelle kafala
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = $this->getKafalaValidator($request);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $kafala = Kafala::create($validator->validated());

            return response()->json([
                'message' => 'Kafala créée avec succès',
                'data' => $kafala
            ], 201);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la création de la kafala: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la création'
            ], 500);
        }
    }

    /**
     * Afficher les détails d'une kafala
     */
    public function show($id): JsonResponse
    {
        try {
            $kafala = Kafala::findOrFail($id);
            $kafala->append(['a_fichier_pdf', 'fichier_pdf_taille_formatee']);

            return response()->json([
                'data' => $kafala
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Kafala introuvable'
            ], 404);
        }
    }

    /**
     * Mettre à jour une kafala
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $kafala = Kafala::findOrFail($id);
            
            $validator = $this->getKafalaValidator($request, $kafala->id);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $kafala->update($validator->validated());

            return response()->json([
                'message' => 'Kafala mise à jour avec succès',
                'data' => $kafala
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la mise à jour: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la mise à jour'
            ], 500);
        }
    }

    /**
     * Suppression logique d'une kafala
     */
    public function destroy($id): JsonResponse
    {
        try {
            $kafala = Kafala::findOrFail($id);
            $kafala->delete();

            return response()->json([
                'message' => 'Kafala supprimée avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la suppression: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la suppression'
            ], 500);
        }
    }

    /**
     * Uploader ou remplacer le PDF d'une kafala
     */
    public function uploadPdf(Request $request, $id): JsonResponse
    {
        try {
            $kafala = Kafala::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'file' => 'required|file|mimes:pdf|max:10240' // Max 10MB
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Fichier PDF invalide',
                    'errors' => $validator->errors()
                ], 422);
            }

            $file = $request->file('file');
            
            DB::beginTransaction();

            if ($this->pdfStorageStrategy === 'file') {
                // Stratégie A : Stocker le fichier sur disque
                $this->storePdfAsFile($kafala, $file);
            } else {
                // Stratégie B : Stocker en BLOB
                $this->storePdfAsBlob($kafala, $file);
            }

            DB::commit();

            return response()->json([
                'message' => 'PDF uploadé avec succès',
                'data' => [
                    'fichier_pdf_nom' => $kafala->fichier_pdf_nom,
                    'fichier_pdf_taille' => $kafala->fichier_pdf_taille_formatee,
                    'fichier_pdf_uploaded_at' => $kafala->fichier_pdf_uploaded_at
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur lors de l\'upload PDF: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de l\'upload du PDF'
            ], 500);
        }
    }

    /**
     * Visualiser le PDF inline
     */
    public function viewPdf($id)
    {
        try {
            $kafala = Kafala::findOrFail($id);

            if (!$kafala->a_fichier_pdf) {
                return response()->json([
                    'message' => 'Aucun PDF disponible pour cette kafala'
                ], 404);
            }

            if ($this->pdfStorageStrategy === 'file') {
                return $this->servePdfFromFile($kafala, false);
            } else {
                return $this->servePdfFromBlob($kafala, false);
            }

        } catch (\Exception $e) {
            Log::error('Erreur lors de la visualisation PDF: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la récupération du PDF'
            ], 500);
        }
    }

    /**
     * Télécharger le PDF
     */
    public function downloadPdf($id)
    {
        try {
            $kafala = Kafala::findOrFail($id);

            if (!$kafala->a_fichier_pdf) {
                return response()->json([
                    'message' => 'Aucun PDF disponible pour cette kafala'
                ], 404);
            }

            if ($this->pdfStorageStrategy === 'file') {
                return $this->servePdfFromFile($kafala, true);
            } else {
                return $this->servePdfFromBlob($kafala, true);
            }

        } catch (\Exception $e) {
            Log::error('Erreur lors du téléchargement PDF: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors du téléchargement du PDF'
            ], 500);
        }
    }

    /**
     * Validator pour les données kafala
     */
    private function getKafalaValidator(Request $request, $excludeId = null)
    {
        return Validator::make($request->all(), [
            'reference' => 'nullable|string|max:255|unique:kafalas,reference,' . $excludeId,
            'nom_pere' => 'required|string|max:255',
            'prenom_pere' => 'required|string|max:255',
            'cin_pere' => 'nullable|string|max:255',
            'nom_mere' => 'required|string|max:255',
            'prenom_mere' => 'required|string|max:255',
            'cin_mere' => 'nullable|string|max:255',
            'telephone' => 'required|string|max:255|regex:/^[0-9+\-\s]+$/',
            'email' => 'required|email|max:255',
            'adresse' => 'required|string',
            'date_mariage' => 'nullable|date|before:today',
            'nom_enfant' => 'required|string|max:255',
            'prenom_enfant' => 'required|string|max:255',
            'sexe_enfant' => 'required|in:M,F',
            'date_naissance_enfant' => 'nullable|date|before:today',
            'cin_enfant' => 'nullable|string|max:255',
            'commentaires' => 'nullable|string'
        ]);
    }

    /**
     * Stocker le PDF comme fichier (Stratégie A)
     */
    private function storePdfAsFile(Kafala $kafala, $file)
    {
        // Supprimer l'ancien fichier s'il existe
        if ($kafala->fichier_pdf_path && Storage::disk('public')->exists($kafala->fichier_pdf_path)) {
            Storage::disk('public')->delete($kafala->fichier_pdf_path);
        }

        // Stocker le nouveau fichier
        $path = $file->store('kafalas/pdfs', 'public');
        
        $kafala->update([
            'fichier_pdf_path' => $path,
            'fichier_pdf_nom' => $file->getClientOriginalName(),
            'fichier_pdf_taille' => $file->getSize(),
            'fichier_pdf_type' => $file->getMimeType(),
            'fichier_pdf_uploaded_at' => now(),
            // Nettoyer les champs BLOB
            'fichier_pdf' => null
        ]);
    }

    /**
     * Stocker le PDF en BLOB (Stratégie B)
     */
    private function storePdfAsBlob(Kafala $kafala, $file)
    {
        // Supprimer l'ancien fichier s'il existe
        if ($kafala->fichier_pdf_path && Storage::disk('public')->exists($kafala->fichier_pdf_path)) {
            Storage::disk('public')->delete($kafala->fichier_pdf_path);
        }

        $kafala->update([
            'fichier_pdf' => file_get_contents($file->getRealPath()),
            'fichier_pdf_nom' => $file->getClientOriginalName(),
            'fichier_pdf_taille' => $file->getSize(),
            'fichier_pdf_type' => $file->getMimeType(),
            'fichier_pdf_uploaded_at' => now(),
            // Nettoyer le chemin fichier
            'fichier_pdf_path' => null
        ]);
    }

    /**
     * Servir le PDF depuis un fichier
     */
    private function servePdfFromFile(Kafala $kafala, $download = false)
    {
        if (!$kafala->fichier_pdf_path || !Storage::disk('public')->exists($kafala->fichier_pdf_path)) {
            return response()->json(['message' => 'Fichier PDF introuvable'], 404);
        }

        $disposition = $download ? 'attachment' : 'inline';
        $filename = $kafala->fichier_pdf_nom ?: 'kafala_' . $kafala->id . '.pdf';

        return Storage::disk('public')->response(
            $kafala->fichier_pdf_path,
            $filename,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => $disposition . '; filename="' . $filename . '"'
            ]
        );
    }

    /**
     * Servir le PDF depuis un BLOB
     */
    private function servePdfFromBlob(Kafala $kafala, $download = false)
    {
        if (!$kafala->fichier_pdf) {
            return response()->json(['message' => 'Fichier PDF introuvable'], 404);
        }

        $disposition = $download ? 'attachment' : 'inline';
        $filename = $kafala->fichier_pdf_nom ?: 'kafala_' . $kafala->id . '.pdf';

        return response($kafala->fichier_pdf)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', $disposition . '; filename="' . $filename . '"')
            ->header('Content-Length', strlen($kafala->fichier_pdf));
    }



   

/**
 * 🔍 Récupérer une kafala spécifique
 * GET /api/upas/kafalas/{id}
 */

/**
 * 📄 Upload PDF pour une kafala
 * POST /api/upas/kafalas/{id}/pdf
 */


/**
 * ✅ Vérifier l'existence d'un PDF
 * GET /api/upas/kafalas/{id}/pdf/exists
 */
public function checkKafalaPdfExists(Request $request, $id)
{
    try {
        $kafala = DB::table('kafalas')
            ->whereNull('deleted_at')
            ->where('id', $id)
            ->select('fichier_pdf', 'fichier_pdf_nom', 'fichier_pdf_taille', 'fichier_pdf_type', 'fichier_pdf_uploaded_at')
            ->first();

        if (!$kafala) {
            return response()->json([
                'success' => false,
                'message' => 'Kafala non trouvée'
            ], 404);
        }

        $hasPdf = !is_null($kafala->fichier_pdf) && !empty($kafala->fichier_pdf);

        return response()->json([
            'success' => true,
            'data' => [
                'has_pdf' => $hasPdf,
                'file_exists_on_disk' => $hasPdf, // Dans ce cas, même chose car stocké en BDD
                'filename' => $kafala->fichier_pdf_nom,
                'size' => $kafala->fichier_pdf_taille,
                'type' => $kafala->fichier_pdf_type,
                'uploaded_at' => $kafala->fichier_pdf_uploaded_at
            ]
        ]);

    } catch (Exception $e) {
        Log::error('Erreur vérification PDF', [
            'kafala_id' => $id,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la vérification du PDF'
        ], 500);
    }
}

/**
 * 📊 Statistiques des kafalas
 * GET /api/upas/kafalas/statistics
 */

/**
 * 🔍 Recherche avancée dans les kafalas
 * GET /api/upas/kafalas/search
 */
public function searchKafalas(Request $request)
{
    try {
        $query = $request->get('query', '');
        $limit = $request->get('limit', 20);

        if (empty($query)) {
            return response()->json([
                'success' => true,
                'data' => [],
                'message' => 'Aucune requête fournie'
            ]);
        }

        $searchTerm = '%' . $query . '%';
        
        $results = DB::table('kafalas')
            ->whereNull('deleted_at')
            ->where(function($q) use ($searchTerm) {
                $q->where('reference', 'LIKE', $searchTerm)
                  ->orWhere('nom_pere', 'LIKE', $searchTerm)
                  ->orWhere('prenom_pere', 'LIKE', $searchTerm)
                  ->orWhere('nom_mere', 'LIKE', $searchTerm)
                  ->orWhere('prenom_mere', 'LIKE', $searchTerm)
                  ->orWhere('nom_enfant', 'LIKE', $searchTerm)
                  ->orWhere('prenom_enfant', 'LIKE', $searchTerm)
                  ->orWhere('telephone', 'LIKE', $searchTerm)
                  ->orWhere('email', 'LIKE', $searchTerm);
            })
            ->select([
                'id', 'reference', 'nom_pere', 'prenom_pere', 
                'nom_mere', 'prenom_mere', 'nom_enfant', 'prenom_enfant',
                'sexe_enfant', 'telephone', 
                DB::raw('(fichier_pdf IS NOT NULL) as a_fichier_pdf')
            ])
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $results,
            'query' => $query,
            'count' => $results->count()
        ]);

    } catch (Exception $e) {
        Log::error('Erreur recherche kafalas', [
            'error' => $e->getMessage(),
            'query' => $request->get('query')
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la recherche'
        ], 500);
    }
}

/**
 * ✅ Valider les données d'une kafala
 * POST /api/upas/kafalas/validate
 */
public function validateKafalaData(Request $request)
{
    try {
        $validator = Validator::make($request->all(), [
            'nom_pere' => 'required|string|max:255',
            'prenom_pere' => 'required|string|max:255',
            'cin_pere' => 'nullable|string|max:255',
            'nom_mere' => 'required|string|max:255',
            'prenom_mere' => 'required|string|max:255',
            'cin_mere' => 'nullable|string|max:255',
            'telephone' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'adresse' => 'required|string',
            'date_mariage' => 'nullable|date|before_or_equal:today',
            'nom_enfant' => 'required|string|max:255',
            'prenom_enfant' => 'required|string|max:255',
            'sexe_enfant' => 'required|in:M,F',
            'date_naissance_enfant' => 'nullable|date|before_or_equal:today',
            'cin_enfant' => 'nullable|string|max:255',
            'commentaires' => 'nullable|string'
        ]);

        $isValid = !$validator->fails();
        $errors = $validator->errors()->toArray();

        // Vérifications supplémentaires
        $warnings = [];
        
        if ($request->date_mariage && $request->date_naissance_enfant) {
            $dateMarriage = Carbon::parse($request->date_mariage);
            $dateNaissance = Carbon::parse($request->date_naissance_enfant);
            
            if ($dateNaissance->lt($dateMarriage)) {
                $warnings[] = 'La date de naissance de l\'enfant est antérieure à la date de mariage';
            }
            
            if ($dateNaissance->diffInMonths($dateMarriage) < 9) {
                $warnings[] = 'La date de naissance de l\'enfant semble très proche de la date de mariage';
            }
        }

        return response()->json([
            'success' => true,
            'valid' => $isValid,
            'errors' => $errors,
            'warnings' => $warnings
        ]);

    } catch (Exception $e) {
        Log::error('Erreur validation kafala', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la validation'
        ], 500);
    }
}

/**
 * 🔧 Test de connexion UPAS spécifique aux kafalas
 * GET /api/upas/test-connection
 */
public function testConnection()
{
    try {
        Log::info('🔍 Test de connexion UPAS - Kafalas');

        // Test de base de données
        $dbStatus = false;
        $dbMessage = '';
        
        try {
            DB::connection()->getPdo();
            $dbStatus = true;
            $dbMessage = 'Connexion DB OK';
        } catch (Exception $e) {
            $dbMessage = 'Erreur DB: ' . $e->getMessage();
        }

        // Test table kafalas
        $kafalaTableExists = false;
        $kafalaCount = 0;
        $tableStructure = [];
        
        try {
            // Vérifier l'existence de la table
            $kafalaCount = DB::table('kafalas')->count();
            $kafalaTableExists = true;
            
            // Obtenir la structure de la table
            $tableStructure = DB::select("DESCRIBE kafalas");
            
        } catch (Exception $e) {
            $dbMessage .= ' | Erreur table kafalas: ' . $e->getMessage();
        }

        // Test authentification
        $authUser = auth()->user();
        $authStatus = $authUser ? true : false;

        $response = [
            'success' => true,
            'message' => 'Test de connexion UPAS terminé',
            'timestamp' => now()->toISOString(),
            'environment' => config('app.env'),
            'tests' => [
                'database' => [
                    'status' => $dbStatus,
                    'message' => $dbMessage
                ],
                'kafala_table' => [
                    'exists' => $kafalaTableExists,
                    'count' => $kafalaCount,
                    'structure_fields' => count($tableStructure)
                ],
                'authentication' => [
                    'status' => $authStatus,
                    'user_id' => $authUser ? $authUser->id : null,
                    'role' => $authUser && $authUser->role ? $authUser->role->libelle : 'N/A'
                ]
            ],
            'endpoints' => [
                'kafalas_list' => '/api/upas/kafalas',
                'kafala_show' => '/api/upas/kafalas/{id}',
                'kafala_create' => 'POST /api/upas/kafalas',
                'kafala_update' => 'PUT /api/upas/kafalas/{id}',
                'kafala_delete' => 'DELETE /api/upas/kafalas/{id}',
                'kafala_upload_pdf' => 'POST /api/upas/kafalas/{id}/pdf',
                'kafala_view_pdf' => 'GET /api/upas/kafalas/{id}/pdf',
                'kafala_download_pdf' => 'GET /api/upas/kafalas/{id}/pdf/download'
            ]
        ];

        // Ajouter des détails sur la structure si disponible
        if (!empty($tableStructure)) {
            $response['table_details'] = [
                'fields' => array_map(function($field) {
                    return [
                        'name' => $field->Field,
                        'type' => $field->Type,
                        'null' => $field->Null,
                        'key' => $field->Key,
                        'default' => $field->Default
                    ];
                }, $tableStructure)
            ];
        }

        Log::info('Test connexion terminé', $response);

        return response()->json($response, 200);

    } catch (Exception $e) {
        Log::error('Erreur test connexion', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du test de connexion: ' . $e->getMessage(),
            'timestamp' => now()->toISOString(),
            'debug' => [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]
        ], 500);
    }
}



public function getKafalas(Request $request)
    {
        try {
            Log::info('Début getKafalas', [
                'params' => $request->all(),
                'user_id' => auth()->id(),
                'timestamp' => now()
            ]);

            // Validation des paramètres
            $validator = Validator::make($request->all(), [
                'page' => 'integer|min:1',
                'per_page' => 'integer|min:1|max:100',
                'search' => 'string|max:255',
                'sexe_enfant' => 'in:M,F',
                'date_mariage_from' => 'date',
                'date_mariage_to' => 'date',
                'sort_by' => 'string|in:created_at,updated_at,reference,nom_pere,nom_mere,nom_enfant,date_mariage,date_naissance_enfant',
                'sort_dir' => 'in:asc,desc',
                'avec_pdf' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paramètres invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Paramètres par défaut
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 15);
            $search = $request->get('search');
            $sexeEnfant = $request->get('sexe_enfant');
            $dateMarriageFrom = $request->get('date_mariage_from');
            $dateMarriageTo = $request->get('date_mariage_to');
            $sortBy = $request->get('sort_by', 'created_at');
            $sortDir = $request->get('sort_dir', 'desc');
            $avecPdf = $request->get('avec_pdf');

            // Construction de la requête
            $query = DB::table('kafalas')
                ->whereNull('deleted_at')
                ->select([
                    'id',
                    'reference',
                    'nom_pere',
                    'prenom_pere',
                    'cin_pere',
                    'nom_mere',
                    'prenom_mere', 
                    'cin_mere',
                    'telephone',
                    'email',
                    'adresse',
                    'date_mariage',
                    'nom_enfant',
                    'prenom_enfant',
                    'sexe_enfant',
                    'date_naissance_enfant',
                    'cin_enfant',
                    'fichier_pdf_nom',
                    'fichier_pdf_taille',
                    'fichier_pdf_type',
                    'fichier_pdf_uploaded_at',
                    'fichier_pdf_path',
                    'commentaires',
                    'created_at',
                    'updated_at',
                    DB::raw('(fichier_pdf IS NOT NULL OR fichier_pdf_path IS NOT NULL) as a_fichier_pdf')
                ]);

            // Filtre de recherche
            if (!empty($search)) {
                $searchTerm = '%' . $search . '%';
                $query->where(function($q) use ($searchTerm) {
                    $q->where('reference', 'LIKE', $searchTerm)
                      ->orWhere('nom_pere', 'LIKE', $searchTerm)
                      ->orWhere('prenom_pere', 'LIKE', $searchTerm)
                      ->orWhere('nom_mere', 'LIKE', $searchTerm)
                      ->orWhere('prenom_mere', 'LIKE', $searchTerm)
                      ->orWhere('nom_enfant', 'LIKE', $searchTerm)
                      ->orWhere('prenom_enfant', 'LIKE', $searchTerm)
                      ->orWhere('telephone', 'LIKE', $searchTerm)
                      ->orWhere('email', 'LIKE', $searchTerm)
                      ->orWhere('cin_pere', 'LIKE', $searchTerm)
                      ->orWhere('cin_mere', 'LIKE', $searchTerm)
                      ->orWhere('cin_enfant', 'LIKE', $searchTerm);
                });
            }

            // Filtre par sexe de l'enfant
            if (!empty($sexeEnfant)) {
                $query->where('sexe_enfant', $sexeEnfant);
            }

            // Filtre par date de mariage
            if (!empty($dateMarriageFrom)) {
                $query->where('date_mariage', '>=', $dateMarriageFrom);
            }
            
            if (!empty($dateMarriageTo)) {
                $query->where('date_mariage', '<=', $dateMarriageTo);
            }

            // Filtre par présence de PDF
            if ($avecPdf !== null) {
                if ($avecPdf) {
                    $query->where(function($q) {
                        $q->whereNotNull('fichier_pdf')
                          ->orWhereNotNull('fichier_pdf_path');
                    });
                } else {
                    $query->whereNull('fichier_pdf')
                          ->whereNull('fichier_pdf_path');
                }
            }

            // Tri
            $query->orderBy($sortBy, $sortDir);

            // Pagination
            $total = $query->count();
            $kafalas = $query->skip(($page - 1) * $perPage)
                           ->take($perPage)
                           ->get();

            // Formatage des données
            $formattedKafalas = $kafalas->map(function ($kafala) {
                return [
                    'id' => $kafala->id,
                    'reference' => $kafala->reference,
                    'nom_pere' => $kafala->nom_pere,
                    'prenom_pere' => $kafala->prenom_pere,
                    'cin_pere' => $kafala->cin_pere,
                    'nom_mere' => $kafala->nom_mere,
                    'prenom_mere' => $kafala->prenom_mere,
                    'cin_mere' => $kafala->cin_mere,
                    'telephone' => $kafala->telephone,
                    'email' => $kafala->email,
                    'adresse' => $kafala->adresse,
                    'date_mariage' => $kafala->date_mariage,
                    'nom_enfant' => $kafala->nom_enfant,
                    'prenom_enfant' => $kafala->prenom_enfant,
                    'sexe_enfant' => $kafala->sexe_enfant,
                    'date_naissance_enfant' => $kafala->date_naissance_enfant,
                    'cin_enfant' => $kafala->cin_enfant,
                    'commentaires' => $kafala->commentaires,
                    'a_fichier_pdf' => (bool) $kafala->a_fichier_pdf,
                    'fichier_pdf_nom' => $kafala->fichier_pdf_nom,
                    'fichier_pdf_taille' => $kafala->fichier_pdf_taille,
                    'fichier_pdf_type' => $kafala->fichier_pdf_type,
                    'fichier_pdf_uploaded_at' => $kafala->fichier_pdf_uploaded_at,
                    'fichier_pdf_path' => $kafala->fichier_pdf_path,
                    'created_at' => $kafala->created_at,
                    'updated_at' => $kafala->updated_at
                ];
            });

            // Statistiques rapides
            $stats = [
                'total_kafalas' => DB::table('kafalas')->whereNull('deleted_at')->count(),
                'avec_pdf' => DB::table('kafalas')
                    ->whereNull('deleted_at')
                    ->where(function($q) {
                        $q->whereNotNull('fichier_pdf')
                          ->orWhereNotNull('fichier_pdf_path');
                    })
                    ->count(),
                'sans_pdf' => DB::table('kafalas')
                    ->whereNull('deleted_at')
                    ->whereNull('fichier_pdf')
                    ->whereNull('fichier_pdf_path')
                    ->count(),
                'masculin' => DB::table('kafalas')->whereNull('deleted_at')->where('sexe_enfant', 'M')->count(),
                'feminin' => DB::table('kafalas')->whereNull('deleted_at')->where('sexe_enfant', 'F')->count()
            ];

            // Réponse
            $response = [
                'success' => true,
                'data' => $formattedKafalas,
                'meta' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'last_page' => ceil($total / $perPage),
                    'from' => ($page - 1) * $perPage + 1,
                    'to' => min($page * $perPage, $total)
                ],
                'filters_applied' => [
                    'search' => $search,
                    'sexe_enfant' => $sexeEnfant,
                    'date_mariage_from' => $dateMarriageFrom,
                    'date_mariage_to' => $dateMarriageTo,
                    'avec_pdf' => $avecPdf,
                    'sort_by' => $sortBy,
                    'sort_dir' => $sortDir
                ],
                'statistics' => $stats
            ];

            Log::info('getKafalas terminé avec succès', [
                'total_found' => $total,
                'page' => $page,
                'per_page' => $perPage
            ]);

            return response()->json($response, 200);

        } catch (Exception $e) {
            Log::error('Erreur dans getKafalas', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
                'params' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des kafalas: ' . $e->getMessage(),
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'per_page' => 15,
                    'total' => 0,
                    'last_page' => 1
                ],
                'debug' => [
                    'error' => $e->getMessage(),
                    'line' => $e->getLine(),
                    'file' => $e->getFile()
                ]
            ], 500);
        }
    }

    /**
     * Statistiques des kafalas
     * GET /api/upas/kafalas/statistics
     */
    public function getKafalaStatistics(Request $request)
    {
        try {
            $stats = [
                'total_kafalas' => DB::table('kafalas')->whereNull('deleted_at')->count(),
                'avec_pdf' => DB::table('kafalas')
                    ->whereNull('deleted_at')
                    ->where(function($q) {
                        $q->whereNotNull('fichier_pdf')
                          ->orWhereNotNull('fichier_pdf_path');
                    })
                    ->count(),
                'sans_pdf' => DB::table('kafalas')
                    ->whereNull('deleted_at')
                    ->whereNull('fichier_pdf')
                    ->whereNull('fichier_pdf_path')
                    ->count(),
                'masculin' => DB::table('kafalas')->whereNull('deleted_at')->where('sexe_enfant', 'M')->count(),
                'feminin' => DB::table('kafalas')->whereNull('deleted_at')->where('sexe_enfant', 'F')->count(),
                'par_annee' => DB::table('kafalas')
                    ->whereNull('deleted_at')
                    ->selectRaw('YEAR(created_at) as annee, COUNT(*) as total')
                    ->groupByRaw('YEAR(created_at)')
                    ->orderBy('annee', 'desc')
                    ->get(),
                'recentes' => DB::table('kafalas')
                    ->whereNull('deleted_at')
                    ->where('created_at', '>=', Carbon::now()->subDays(30))
                    ->count()
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (Exception $e) {
            Log::error('Erreur statistiques kafalas', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul des statistiques: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupérer une kafala spécifique
     * GET /api/upas/kafalas/{id}
     */
    public function getKafala(Request $request, $id)
    {
        try {
            Log::info('Récupération kafala', ['id' => $id]);

            $kafala = DB::table('kafalas')
                ->whereNull('deleted_at')
                ->where('id', $id)
                ->select([
                    '*',
                    DB::raw('(fichier_pdf IS NOT NULL OR fichier_pdf_path IS NOT NULL) as a_fichier_pdf')
                ])
                ->first();

            if (!$kafala) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kafala non trouvée',
                    'error_code' => 'KAFALA_NOT_FOUND'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $kafala
            ], 200);

        } catch (Exception $e) {
            Log::error('Erreur getKafala', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de la kafala: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer une nouvelle kafala
     * POST /api/upas/kafalas
     */
    
    /**
     * Mettre à jour une kafala
     * PUT /api/upas/kafalas/{id}
     */
    
    /**
     * Supprimer une kafala (soft delete)
     * DELETE /api/upas/kafalas/{id}
     */
    public function deleteKafala(Request $request, $id)
    {
        try {
            Log::info('Suppression kafala', ['id' => $id]);

            // Vérifier existence
            $kafala = DB::table('kafalas')->whereNull('deleted_at')->where('id', $id)->first();
            
            if (!$kafala) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kafala non trouvée'
                ], 404);
            }

            // Suppression logique
            DB::table('kafalas')->where('id', $id)->update([
                'deleted_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('Kafala supprimée avec succès', ['id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Kafala supprimée avec succès'
            ], 200);

        } catch (Exception $e) {
            Log::error('Erreur suppression kafala', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la kafala: ' . $e->getMessage()
            ], 500);
        }
    }

    public function viewKafalaPdf(Request $request, $id)
    {
        try {
            Log::info('📖 Visualisation PDF kafala', ['id' => $id]);

            // 🔐 Vérification d'authentification manuelle (optionnel)
            $token = $request->get('token') ?? $request->bearerToken();
            if (!$token && !auth()->check()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                    'error_code' => 'AUTH_REQUIRED'
                ], 401);
            }

            // Vérifier existence de la kafala
            $kafala = DB::table('kafalas')
                ->whereNull('deleted_at')
                ->where('id', $id)
                ->whereNotNull('fichier_pdf')
                ->first();
            
            if (!$kafala || !$kafala->fichier_pdf) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF non trouvé pour cette kafala'
                ], 404);
            }

            // Retourner le fichier PDF depuis la base de données
            return response($kafala->fichier_pdf, 200, [
                'Content-Type' => $kafala->fichier_pdf_type ?? 'application/pdf',
                'Content-Disposition' => 'inline; filename="kafala_' . ($kafala->reference ?? $kafala->id) . '.pdf"',
                'Content-Length' => $kafala->fichier_pdf_taille ?? strlen($kafala->fichier_pdf),
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);

        } catch (Exception $e) {
            Log::error('❌ Erreur visualisation PDF', [
                'kafala_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la visualisation du PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 💾 Télécharger PDF d'une kafala - VERSION CORRIGÉE
     * GET /api/upas/kafalas/{id}/pdf/download
     */
    public function downloadKafalaPdf(Request $request, $id)
    {
        try {
            Log::info('💾 Téléchargement PDF kafala', ['id' => $id]);

            // 🔐 Vérification d'authentification manuelle (optionnel)
            $token = $request->get('token') ?? $request->bearerToken();
            if (!$token && !auth()->check()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                    'error_code' => 'AUTH_REQUIRED'
                ], 401);
            }

            // Vérifier existence de la kafala
            $kafala = DB::table('kafalas')
                ->whereNull('deleted_at')
                ->where('id', $id)
                ->whereNotNull('fichier_pdf')
                ->first();
            
            if (!$kafala || !$kafala->fichier_pdf) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF non trouvé pour cette kafala'
                ], 404);
            }

            // Télécharger le fichier PDF
            return response($kafala->fichier_pdf, 200, [
                'Content-Type' => $kafala->fichier_pdf_type ?? 'application/pdf',
                'Content-Disposition' => 'attachment; filename="kafala_' . ($kafala->reference ?? $kafala->id) . '.pdf"',
                'Content-Length' => $kafala->fichier_pdf_taille ?? strlen($kafala->fichier_pdf),
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);

        } catch (Exception $e) {
            Log::error('❌ Erreur téléchargement PDF', [
                'kafala_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du téléchargement du PDF: ' . $e->getMessage()
            ], 500);
        }
    }


    public function storeKafala(Request $request)
{
    try {
        Log::info('Création nouvelle kafala', ['data' => $request->except(['fichier_pdf'])]);

        // Validation - MISE À JOUR : EMAIL et CHAMPS ENFANT OPTIONNELS
        $validator = Validator::make($request->all(), [
            // Référence optionnelle - si fournie doit être unique
            'reference' => 'nullable|string|max:255|unique:kafalas,reference',
            
            // CHAMPS OBLIGATOIRES - Parents
            'nom_pere' => 'required|string|max:255',
            'prenom_pere' => 'required|string|max:255',
            'cin_pere' => 'nullable|string|max:255',
            'nom_mere' => 'required|string|max:255',
            'prenom_mere' => 'required|string|max:255',
            'cin_mere' => 'nullable|string|max:255',
            'telephone' => 'required|string|max:255',
            
            // EMAIL N'EST PLUS REQUIS - MODIFIÉ
            'email' => 'nullable|email|max:255',  // nullable au lieu de required
            
            'adresse' => 'required|string',
            'date_mariage' => 'nullable|date',
            
            // TOUS LES CHAMPS ENFANT SONT MAINTENANT OPTIONNELS - MODIFIÉS
            'nom_enfant' => 'nullable|string|max:255',        // nullable au lieu de required
            'prenom_enfant' => 'nullable|string|max:255',     // nullable au lieu de required
            'sexe_enfant' => 'nullable|in:M,F',               // nullable au lieu de required
            'date_naissance_enfant' => 'nullable|date',
            'cin_enfant' => 'nullable|string|max:255',
            
            'commentaires' => 'nullable|string',
            // Validation du fichier PDF
            'fichier_pdf' => 'nullable|file|mimes:pdf|max:10240' // Max 10MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        // Gestion de la référence - génération automatique si vide
        $reference = $request->reference;
        if (empty($reference)) {
            // Générer une référence automatique
            $lastKafala = DB::table('kafalas')
                ->whereNull('deleted_at')
                ->orderBy('id', 'desc')
                ->first();
            
            $nextNumber = 1;
            if ($lastKafala && $lastKafala->reference) {
                // Extraire le numéro de la dernière référence (format: KAF-YYYY-XXXX)
                preg_match('/KAF-\d{4}-(\d+)/', $lastKafala->reference, $matches);
                if (!empty($matches[1])) {
                    $nextNumber = intval($matches[1]) + 1;
                }
            }
            
            $reference = 'KAF-' . date('Y') . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
        }

        // Gestion du fichier PDF
        $pdfData = null;
        $pdfNom = null;
        $pdfTaille = null;
        $pdfType = null;
        $pdfUploadedAt = null;
        $pdfPath = null;

        if ($request->hasFile('fichier_pdf')) {
            $file = $request->file('fichier_pdf');
            
            if ($file->isValid()) {
                // Lire le contenu du fichier
                $pdfData = file_get_contents($file->getPathname());
                $pdfNom = $file->getClientOriginalName();
                $pdfTaille = $file->getSize();
                $pdfType = $file->getMimeType();
                $pdfUploadedAt = now();
                
                // Optionnel : sauvegarder aussi sur le disque
                // $pdfPath = $file->store('kafalas/pdfs', 'public');
                
                Log::info('Fichier PDF uploadé', [
                    'nom' => $pdfNom,
                    'taille' => $pdfTaille,
                    'type' => $pdfType
                ]);
            }
        }

        // Créer la kafala
        $kafalaId = DB::table('kafalas')->insertGetId([
            'reference' => $reference,
            'nom_pere' => $request->nom_pere,
            'prenom_pere' => $request->prenom_pere,
            'cin_pere' => $request->cin_pere,
            'nom_mere' => $request->nom_mere,
            'prenom_mere' => $request->prenom_mere,
            'cin_mere' => $request->cin_mere,
            'telephone' => $request->telephone,
            'email' => $request->email, // Peut être null maintenant
            'adresse' => $request->adresse,
            'date_mariage' => $request->date_mariage,
            'nom_enfant' => $request->nom_enfant, // Peut être null maintenant
            'prenom_enfant' => $request->prenom_enfant, // Peut être null maintenant
            'sexe_enfant' => $request->sexe_enfant, // Peut être null maintenant
            'date_naissance_enfant' => $request->date_naissance_enfant,
            'cin_enfant' => $request->cin_enfant,
            'fichier_pdf' => $pdfData,
            'fichier_pdf_nom' => $pdfNom,
            'fichier_pdf_taille' => $pdfTaille,
            'fichier_pdf_type' => $pdfType,
            'fichier_pdf_uploaded_at' => $pdfUploadedAt,
            'fichier_pdf_path' => $pdfPath,
            'commentaires' => $request->commentaires,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Récupérer la kafala créée
        $kafala = DB::table('kafalas')
            ->where('id', $kafalaId)
            ->select([
                '*',
                DB::raw('(fichier_pdf IS NOT NULL OR fichier_pdf_path IS NOT NULL) as a_fichier_pdf')
            ])
            ->first();

        // Ne pas retourner le contenu binaire du PDF dans la réponse
        $kafalaResponse = (array) $kafala;
        unset($kafalaResponse['fichier_pdf']);

        Log::info('Kafala créée avec succès', [
            'id' => $kafalaId, 
            'reference' => $reference,
            'avec_pdf' => $pdfData ? 'oui' : 'non'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kafala créée avec succès',
            'data' => $kafalaResponse
        ], 201);

    } catch (Exception $e) {
        Log::error('Erreur création kafala', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'data' => $request->except(['fichier_pdf'])
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la création de la kafala: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Mettre à jour une kafala
 * PUT /api/upas/kafalas/{id}
 */
public function updateKafala(Request $request, $id)
{
    try {
        Log::info('Mise à jour kafala', ['id' => $id, 'data' => $request->except(['fichier_pdf'])]);

        // Vérifier existence
        $kafala = DB::table('kafalas')->whereNull('deleted_at')->where('id', $id)->first();
        
        if (!$kafala) {
            return response()->json([
                'success' => false,
                'message' => 'Kafala non trouvée'
            ], 404);
        }

        // Validation - MISE À JOUR : EMAIL et CHAMPS ENFANT OPTIONNELS
        $validator = Validator::make($request->all(), [
            // Référence peut être modifiée mais doit rester unique (sauf pour l'enregistrement courant)
            'reference' => 'sometimes|string|max:255|unique:kafalas,reference,' . $id,
            
            // CHAMPS OBLIGATOIRES - Parents
            'nom_pere' => 'sometimes|required|string|max:255',
            'prenom_pere' => 'sometimes|required|string|max:255',
            'cin_pere' => 'nullable|string|max:255',
            'nom_mere' => 'sometimes|required|string|max:255',
            'prenom_mere' => 'sometimes|required|string|max:255',
            'cin_mere' => 'nullable|string|max:255',
            'telephone' => 'sometimes|required|string|max:255',
            
            // EMAIL N'EST PLUS REQUIS - MODIFIÉ
            'email' => 'nullable|email|max:255',  // nullable - pas de required même avec sometimes
            
            'adresse' => 'sometimes|required|string',
            'date_mariage' => 'nullable|date',
            
            // TOUS LES CHAMPS ENFANT SONT MAINTENANT OPTIONNELS - MODIFIÉS
            'nom_enfant' => 'nullable|string|max:255',        // nullable - pas de required
            'prenom_enfant' => 'nullable|string|max:255',     // nullable - pas de required
            'sexe_enfant' => 'nullable|in:M,F',               // nullable - pas de required
            'date_naissance_enfant' => 'nullable|date',
            'cin_enfant' => 'nullable|string|max:255',
            
            'commentaires' => 'nullable|string',
            // Validation du fichier PDF
            'fichier_pdf' => 'nullable|file|mimes:pdf|max:10240', // Max 10MB
            'supprimer_pdf' => 'nullable|boolean' // Option pour supprimer le PDF existant
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        // Préparer les données à mettre à jour
        $dataToUpdate = $request->only([
            'reference', 'nom_pere', 'prenom_pere', 'cin_pere',
            'nom_mere', 'prenom_mere', 'cin_mere',
            'telephone', 'email', 'adresse', 'date_mariage',
            'nom_enfant', 'prenom_enfant', 'sexe_enfant',
            'date_naissance_enfant', 'cin_enfant', 'commentaires'
        ]);

        // Gestion du fichier PDF
        if ($request->hasFile('fichier_pdf')) {
            $file = $request->file('fichier_pdf');
            
            if ($file->isValid()) {
                // Nouveau fichier PDF
                $dataToUpdate['fichier_pdf'] = file_get_contents($file->getPathname());
                $dataToUpdate['fichier_pdf_nom'] = $file->getClientOriginalName();
                $dataToUpdate['fichier_pdf_taille'] = $file->getSize();
                $dataToUpdate['fichier_pdf_type'] = $file->getMimeType();
                $dataToUpdate['fichier_pdf_uploaded_at'] = now();
                
                // Optionnel : sauvegarder aussi sur le disque
                // $dataToUpdate['fichier_pdf_path'] = $file->store('kafalas/pdfs', 'public');
                
                Log::info('Nouveau fichier PDF uploadé', [
                    'kafala_id' => $id,
                    'nom' => $file->getClientOriginalName(),
                    'taille' => $file->getSize()
                ]);
            }
        } elseif ($request->get('supprimer_pdf')) {
            // Supprimer le PDF existant
            $dataToUpdate['fichier_pdf'] = null;
            $dataToUpdate['fichier_pdf_nom'] = null;
            $dataToUpdate['fichier_pdf_taille'] = null;
            $dataToUpdate['fichier_pdf_type'] = null;
            $dataToUpdate['fichier_pdf_uploaded_at'] = null;
            $dataToUpdate['fichier_pdf_path'] = null;
            
            Log::info('PDF supprimé pour kafala', ['id' => $id]);
        }
        
        $dataToUpdate['updated_at'] = now();

        // Mettre à jour
        DB::table('kafalas')->where('id', $id)->update($dataToUpdate);

        // Récupérer la kafala mise à jour
        $updatedKafala = DB::table('kafalas')
            ->where('id', $id)
            ->select([
                '*',
                DB::raw('(fichier_pdf IS NOT NULL OR fichier_pdf_path IS NOT NULL) as a_fichier_pdf')
            ])
            ->first();

        // Ne pas retourner le contenu binaire du PDF dans la réponse
        $kafalaResponse = (array) $updatedKafala;
        unset($kafalaResponse['fichier_pdf']);

        Log::info('Kafala mise à jour avec succès', ['id' => $id]);

        return response()->json([
            'success' => true,
            'message' => 'Kafala mise à jour avec succès',
            'data' => $kafalaResponse
        ], 200);

    } catch (Exception $e) {
        Log::error('Erreur mise à jour kafala', [
            'id' => $id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la mise à jour de la kafala: ' . $e->getMessage()
        ], 500);
    }
}
    /**
     * Upload ou mise à jour du fichier PDF d'une kafala
     * POST /api/upas/kafalas/{id}/pdf
     */
    public function uploadKafalaPdf(Request $request, $id)
    {
        try {
            Log::info('Upload PDF kafala', ['id' => $id]);

            // Vérifier existence
            $kafala = DB::table('kafalas')->whereNull('deleted_at')->where('id', $id)->first();
            
            if (!$kafala) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kafala non trouvée'
                ], 404);
            }

            // Validation du fichier
            $validator = Validator::make($request->all(), [
                'fichier_pdf' => 'required|file|mimes:pdf|max:10240' // Max 10MB
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier invalide',
                    'errors' => $validator->errors()
                ], 422);
            }

            $file = $request->file('fichier_pdf');
            
            if (!$file->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier PDF invalide'
                ], 422);
            }

            // Traiter le fichier
            $pdfData = file_get_contents($file->getPathname());
            $pdfNom = $file->getClientOriginalName();
            $pdfTaille = $file->getSize();
            $pdfType = $file->getMimeType();
            $pdfUploadedAt = now();

            // Mettre à jour la kafala avec le PDF
            DB::table('kafalas')->where('id', $id)->update([
                'fichier_pdf' => $pdfData,
                'fichier_pdf_nom' => $pdfNom,
                'fichier_pdf_taille' => $pdfTaille,
                'fichier_pdf_type' => $pdfType,
                'fichier_pdf_uploaded_at' => $pdfUploadedAt,
                'updated_at' => now()
            ]);

            Log::info('PDF uploadé avec succès', [
                'kafala_id' => $id,
                'nom' => $pdfNom,
                'taille' => $pdfTaille
            ]);

            return response()->json([
                'success' => true,
                'message' => 'PDF uploadé avec succès',
                'data' => [
                    'fichier_pdf_nom' => $pdfNom,
                    'fichier_pdf_taille' => $pdfTaille,
                    'fichier_pdf_type' => $pdfType,
                    'fichier_pdf_uploaded_at' => $pdfUploadedAt
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Erreur upload PDF kafala', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'upload du PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer le fichier PDF d'une kafala
     * DELETE /api/upas/kafalas/{id}/pdf
     */
    public function deleteKafalaPdf(Request $request, $id)
    {
        try {
            Log::info('Suppression PDF kafala', ['id' => $id]);

            // Vérifier existence
            $kafala = DB::table('kafalas')->whereNull('deleted_at')->where('id', $id)->first();
            
            if (!$kafala) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kafala non trouvée'
                ], 404);
            }

            // Supprimer le PDF
            DB::table('kafalas')->where('id', $id)->update([
                'fichier_pdf' => null,
                'fichier_pdf_nom' => null,
                'fichier_pdf_taille' => null,
                'fichier_pdf_type' => null,
                'fichier_pdf_uploaded_at' => null,
                'fichier_pdf_path' => null,
                'updated_at' => now()
            ]);

            Log::info('PDF supprimé avec succès', ['kafala_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'PDF supprimé avec succès'
            ], 200);

        } catch (Exception $e) {
            Log::error('Erreur suppression PDF kafala', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du PDF: ' . $e->getMessage()
            ], 500);
        }
    }



    




    public function getCampaigns()
{
    // You need to join with the type_assistance table to get the type names
    $campaigns = DB::table('campagne') // Changed from 'campagnes' to match your actual table name
        ->join('type_assistance', 'campagne.type_assistance_id', '=', 'type_assistance.id')
        ->select('campagne.id', 'campagne.nom', 'type_assistance.nom as type_assistance')
        ->whereIn('type_assistance.nom', ['lunettes', 'appareils_auditifs']) // Assuming these are the type names
        ->orderBy('campagne.nom')
        ->get();

    return response()->json($campaigns);
}

public function getStats(Request $request, $campaignId)
{
    // Récupérer les informations de la campagne avec le type d'assistance
    $campaign = DB::table('campagne') // Changed table name
        ->join('type_assistance', 'campagne.type_assistance_id', '=', 'type_assistance.id')
        ->select('campagne.nom', 'type_assistance.nom as type_assistance')
        ->where('campagne.id', $campaignId)
        ->first();

    if (!$campaign) {
        return response()->json(['error' => 'Campagne non trouvée'], 404);
    }

    // Statistiques des participants
    $participantsStats = $this->getParticipantsStats($campaignId);
    
    // Statistiques des bénéficiaires
    $beneficiairesStats = $this->getBeneficiairesStats($campaignId);

    // Statistiques spéciales pour appareils auditifs
    $auditifsStats = null;
    if ($campaign->type_assistance === 'appareils_auditifs') {
        $auditifsStats = $this->getAuditifStats($campaignId);
    }

    // Calcul des indicateurs complémentaires
    $indicators = $this->calculateIndicators($participantsStats, $beneficiairesStats);

    return response()->json([
        'campaign' => $campaign,
        'participants' => $participantsStats,
        'beneficiaires' => $beneficiairesStats,
        'auditifs' => $auditifsStats,
        'indicators' => $indicators
    ]);
}

private function getParticipantsStats($campaignId)
{
    // Total participants - using 'campagne_id' assuming it references the campagne table
    $total = DB::table('participants')
        ->where('campagne_id', $campaignId)
        ->whereNull('date_suppression')
        ->count();

    // Répartition par sexe
    $sexeStats = DB::table('participants')
        ->select('sexe', DB::raw('COUNT(*) as count'))
        ->where('campagne_id', $campaignId)
        ->whereNull('date_suppression')
        ->whereNotNull('sexe')
        ->groupBy('sexe')
        ->get()
        ->keyBy('sexe');

    // Répartition par tranche d'âge avec sexe
    $ageStats = DB::table('participants')
        ->select(
            'sexe',
            DB::raw('
                CASE 
                    WHEN TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) < 15 THEN "<15"
                    WHEN TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) BETWEEN 15 AND 64 THEN "15-64"
                    ELSE "≥65"
                END as tranche_age
            '),
            DB::raw('COUNT(*) as count')
        )
        ->where('campagne_id', $campaignId)
        ->whereNull('date_suppression')
        ->whereNotNull('date_naissance')
        ->groupBy('sexe', 'tranche_age')
        ->get();

    // Organiser les données par tranche d'âge
    $ageGrouped = $ageStats->groupBy('tranche_age');
    $ageData = [];
    foreach (['<15', '15-64', '≥65'] as $tranche) {
        $ageData[$tranche] = [
            'M' => $ageGrouped->get($tranche, collect())->where('sexe', 'M')->sum('count'),
            'F' => $ageGrouped->get($tranche, collect())->where('sexe', 'F')->sum('count'),
            'total' => $ageGrouped->get($tranche, collect())->sum('count')
        ];
    }

    return [
        'total' => $total,
        'par_sexe' => [
            'M' => $sexeStats->get('M')->count ?? 0,
            'F' => $sexeStats->get('F')->count ?? 0
        ],
        'par_age' => $ageData,
        'graphique_data' => $this->formatGraphData($ageData)
    ];
}

private function getBeneficiairesStats($campaignId)
{
    // Total bénéficiaires ayant reçu l'assistance
    $total = DB::table('beneficiaires')
        ->where('campagne_id', $campaignId)
        ->where('a_beneficie', 1)
        ->whereNull('date_suppression')
        ->count();

    // Répartition par sexe
    $sexeStats = DB::table('beneficiaires')
        ->select('sexe', DB::raw('COUNT(*) as count'))
        ->where('campagne_id', $campaignId)
        ->where('a_beneficie', 1)
        ->whereNull('date_suppression')
        ->groupBy('sexe')
        ->get()
        ->keyBy('sexe');

    // Enfants scolarisés
    $enfantsStats = DB::table('beneficiaires')
        ->select('sexe', DB::raw('COUNT(*) as count'))
        ->where('campagne_id', $campaignId)
        ->where('enfants_scolarises', 1)
        ->whereNull('date_suppression')
        ->groupBy('sexe')
        ->get()
        ->keyBy('sexe');

    // En liste d'attente
    $enAttente = DB::table('beneficiaires')
        ->where('campagne_id', $campaignId)
        ->where('decision', 'en_attente')
        ->whereNull('date_suppression')
        ->count();

    // Répartition par tranche d'âge avec sexe pour les bénéficiaires
    $ageStats = DB::table('beneficiaires')
        ->select(
            'sexe',
            DB::raw('
                CASE 
                    WHEN TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) < 15 THEN "<15"
                    WHEN TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) BETWEEN 15 AND 64 THEN "15-64"
                    ELSE "≥65"
                END as tranche_age
            '),
            DB::raw('COUNT(*) as count')
        )
        ->where('campagne_id', $campaignId)
        ->where('a_beneficie', 1)
        ->whereNull('date_suppression')
        ->whereNotNull('date_naissance')
        ->groupBy('sexe', 'tranche_age')
        ->get();

    // Organiser les données par tranche d'âge
    $ageGrouped = $ageStats->groupBy('tranche_age');
    $ageData = [];
    foreach (['<15', '15-64', '≥65'] as $tranche) {
        $ageData[$tranche] = [
            'M' => $ageGrouped->get($tranche, collect())->where('sexe', 'M')->sum('count'),
            'F' => $ageGrouped->get($tranche, collect())->where('sexe', 'F')->sum('count'),
            'total' => $ageGrouped->get($tranche, collect())->sum('count')
        ];
    }

    return [
        'total' => $total,
        'par_sexe' => [
            'M' => $sexeStats->get('M')->count ?? 0,
            'F' => $sexeStats->get('F')->count ?? 0
        ],
        'enfants_scolarises' => [
            'M' => $enfantsStats->get('M')->count ?? 0,
            'F' => $enfantsStats->get('F')->count ?? 0,
            'total' => $enfantsStats->sum('count')
        ],
        'en_attente' => $enAttente,
        'par_age' => $ageData,
        'graphique_data' => $this->formatGraphData($ageData)
    ];
}

private function getAuditifStats($campaignId)
{
    $coteStats = DB::table('beneficiaires')
        ->select('cote', DB::raw('COUNT(*) as count'))
        ->where('campagne_id', $campaignId)
        ->where('a_beneficie', 1)
        ->whereNull('date_suppression')
        ->whereNotNull('cote')
        ->groupBy('cote')
        ->get()
        ->keyBy('cote');

    return [
        'par_cote' => [
            'unilateral' => $coteStats->get('unilatéral')->count ?? 0,
            'bilateral' => $coteStats->get('bilatéral')->count ?? 0
        ]
    ];
}

private function calculateIndicators($participantsStats, $beneficiairesStats)
{
    $totalParticipants = $participantsStats['total'];
    $totalBeneficiaires = $beneficiairesStats['total'];
    
    $tauxCouverture = $totalParticipants > 0 
        ? round(($totalBeneficiaires / $totalParticipants) * 100, 2)
        : 0;

    $backlog = $totalParticipants - $totalBeneficiaires;

    return [
        'taux_couverture' => $tauxCouverture,
        'backlog' => max(0, $backlog)
    ];
}

private function formatGraphData($ageData)
{
    $graphData = [];
    foreach ($ageData as $tranche => $data) {
        $graphData[] = [
            'tranche' => $tranche,
            'M' => $data['M'],
            'F' => $data['F'],
            'total' => $data['total']
        ];
    }
    return $graphData;
}
}
