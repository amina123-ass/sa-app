<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Situation;
use App\Models\NatureDon;
use App\Models\TypeAssistance;
use App\Models\DetailsTypeAssistance;
use App\Models\EtatDon;
use App\Models\TypeBudget;
use App\Models\Budget;
use App\Models\SecurityQuestion;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Exception;

class DictionaryController extends Controller
{
    // Fonction de test de connectivité
    public function testConnection()
    {
        try {
            Log::info('Test de connectivité DictionaryController');
            
            // Tester la connexion à la base de données
            DB::connection()->getPdo();
            
            return response()->json([
                'success' => true,
                'message' => 'Connexion réussie au DictionaryController',
                'timestamp' => now(),
                'database_status' => 'OK'
            ]);
        } catch (Exception $e) {
            Log::error('Erreur de connectivité DictionaryController: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur de connexion',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ===== QUESTIONS DE SÉCURITÉ =====
    public function getSecurityQuestions()
    {
        try {
            Log::info('Début du chargement des questions de sécurité');
            
            if (!Schema::hasTable('security_questions')) {
                Log::error('Table security_questions n\'existe pas');
                return response()->json([
                    'error' => 'Table security_questions n\'existe pas',
                    'message' => 'Veuillez exécuter les migrations : php artisan migrate'
                ], 500);
            }
            
            $questions = SecurityQuestion::all();
            Log::info('Questions de sécurité chargées avec succès', ['count' => $questions->count()]);
            
            return response()->json([
                'success' => true,
                'data' => $questions
            ]);
        } catch (Exception $e) {
            Log::error('Error loading security questions: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Erreur lors du chargement des questions de sécurité',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ===== ÉTATS DE DON - CORRIGÉ =====
    public function getEtatDones()
    {
        try {
            Log::info('Début du chargement des états de don');
            
            // Vérifier si la table existe
            if (!Schema::hasTable('etat_dons')) {
                Log::warning('Table etat_dons n\'existe pas, retour de données par défaut');
                
                // Retourner des données par défaut au lieu d'une erreur
                return response()->json([
                    'success' => true,
                    'data' => [
                        ['id' => 1, 'libelle' => 'En attente'],
                        ['id' => 2, 'libelle' => 'Validé'],
                        ['id' => 3, 'libelle' => 'Rejeté'],
                        ['id' => 4, 'libelle' => 'En cours'],
                        ['id' => 5, 'libelle' => 'Terminé']
                    ],
                    'message' => 'Données par défaut - Table etat_dons non trouvée'
                ], 200);
            }
            
            $etatDons = EtatDon::whereNull('date_suppression')
                              ->orderBy('libelle')
                              ->get();
            
            Log::info('États de don chargés avec succès', ['count' => $etatDons->count()]);
            
            return response()->json([
                'success' => true,
                'data' => $etatDons
            ], 200);
        } catch (Exception $e) {
            Log::error('Error loading etat dons: ' . $e->getMessage());
            
            // Fallback avec données par défaut en cas d'erreur
            return response()->json([
                'success' => true,
                'data' => [
                    ['id' => 1, 'libelle' => 'En attente'],
                    ['id' => 2, 'libelle' => 'Validé'],
                    ['id' => 3, 'libelle' => 'Rejeté'],
                    ['id' => 4, 'libelle' => 'En cours'],
                    ['id' => 5, 'libelle' => 'Terminé']
                ],
                'message' => 'Données par défaut - Erreur de chargement'
            ], 200);
        }
    }

    public function storeEtatDone(Request $request)
    {
        try {
            Log::info('Création d\'un état de don', ['data' => $request->all()]);
            
            $validated = $request->validate([
                'libelle' => 'required|string|max:255'
            ]);
            
            // Vérifier si la table existe avant de créer
            if (!Schema::hasTable('etat_dons')) {
                return response()->json([
                    'error' => 'Table etat_dons n\'existe pas',
                    'message' => 'Veuillez créer la table avec les migrations'
                ], 500);
            }
            
            $etatDon = EtatDon::create($validated);
            Log::info('État de don créé', ['id' => $etatDon->id, 'libelle' => $etatDon->libelle]);
            
            return response()->json([
                'success' => true,
                'data' => $etatDon,
                'message' => 'État de don créé avec succès'
            ], 201);
        } catch (Exception $e) {
            Log::error('Error creating etat done: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la création de l\'état de don',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateEtatDone(Request $request, $id)
    {
        try {
            Log::info('Mise à jour d\'un état de don', ['id' => $id, 'data' => $request->all()]);
            
            $validated = $request->validate([
                'libelle' => 'required|string|max:255'
            ]);
            
            if (!Schema::hasTable('etat_dons')) {
                return response()->json([
                    'error' => 'Table etat_dons n\'existe pas',
                    'message' => 'Veuillez créer la table avec les migrations'
                ], 500);
            }
            
            $etatDon = EtatDon::findOrFail($id);
            $etatDon->update($validated);
            
            Log::info('État de don mis à jour', ['id' => $id]);
            return response()->json([
                'success' => true,
                'data' => $etatDon,
                'message' => 'État de don mis à jour avec succès'
            ]);
        } catch (Exception $e) {
            Log::error('Error updating etat done: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la mise à jour de l\'état de don',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteEtatDone($id)
    {
        try {
            Log::info('Suppression d\'un état de don', ['id' => $id]);
            
            if (!Schema::hasTable('etat_dons')) {
                return response()->json([
                    'error' => 'Table etat_dons n\'existe pas',
                    'message' => 'Veuillez créer la table avec les migrations'
                ], 500);
            }
            
            $etatDon = EtatDon::findOrFail($id);
            
            // Soft delete
            $etatDon->update(['date_suppression' => now()]);
            
            Log::info('État de don supprimé', ['id' => $id]);
            return response()->json([
                'success' => true,
                'message' => 'État de don supprimé avec succès'
            ]);
        } catch (Exception $e) {
            Log::error('Error deleting etat done: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la suppression de l\'état de don',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ===== NATURE DE DON - CORRIGÉ =====
    public function getNatureDones()
    {
        try {
            Log::info('Début du chargement des natures de don');
            
            // Vérifier si la table existe
            if (!Schema::hasTable('nature_dons')) {
                Log::warning('Table nature_dons n\'existe pas, retour de données par défaut');
                
                // Retourner des données par défaut au lieu d'une erreur
                return response()->json([
                    'success' => true,
                    'data' => [
                        ['id' => 1, 'libelle' => 'Don individuel', 'duree' => null],
                        ['id' => 2, 'libelle' => 'Don d\'entreprise', 'duree' => 12],
                        ['id' => 3, 'libelle' => 'Don d\'association', 'duree' => 6],
                        ['id' => 4, 'libelle' => 'Don gouvernemental', 'duree' => 24]
                    ],
                    'message' => 'Données par défaut - Table nature_dons non trouvée'
                ], 200);
            }
            
            $natureDons = NatureDon::whereNull('date_suppression')->get();
            Log::info('Natures de don chargées avec succès', ['count' => $natureDons->count()]);
            
            return response()->json([
                'success' => true,
                'data' => $natureDons
            ]);
        } catch (Exception $e) {
            Log::error('Error loading nature dons: ' . $e->getMessage());
            
            // Fallback avec données par défaut
            return response()->json([
                'success' => true,
                'data' => [
                    ['id' => 1, 'libelle' => 'Don individuel', 'duree' => null],
                    ['id' => 2, 'libelle' => 'Don d\'entreprise', 'duree' => 12],
                    ['id' => 3, 'libelle' => 'Don d\'association', 'duree' => 6],
                    ['id' => 4, 'libelle' => 'Don gouvernemental', 'duree' => 24]
                ],
                'message' => 'Données par défaut - Erreur de chargement'
            ], 200);
        }
    }

    public function storeNatureDone(Request $request)
    {
        try {
            $validated = $request->validate([
                'libelle' => 'required|string|max:255',
                'duree' => 'nullable|integer|min:1'
            ]);
            
            if (!Schema::hasTable('nature_dons')) {
                return response()->json([
                    'error' => 'Table nature_dons n\'existe pas',
                    'message' => 'Veuillez créer la table avec les migrations'
                ], 500);
            }
            
            $natureDon = NatureDon::create($validated);
            
            return response()->json([
                'success' => true,
                'data' => $natureDon,
                'message' => 'Nature de don créée avec succès'
            ], 201);
        } catch (Exception $e) {
            Log::error('Error creating nature don: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la création de la nature de don',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateNatureDone(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'libelle' => 'required|string|max:255',
                'duree' => 'nullable|integer|min:1'
            ]);
            
            if (!Schema::hasTable('nature_dons')) {
                return response()->json([
                    'error' => 'Table nature_dons n\'existe pas',
                    'message' => 'Veuillez créer la table avec les migrations'
                ], 500);
            }
            
            $natureDon = NatureDon::findOrFail($id);
            $natureDon->update($validated);
            
            return response()->json([
                'success' => true,
                'data' => $natureDon,
                'message' => 'Nature de don mise à jour avec succès'
            ]);
        } catch (Exception $e) {
            Log::error('Error updating nature don: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la mise à jour de la nature de don',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteNatureDone($id)
    {
        try {
            if (!Schema::hasTable('nature_dons')) {
                return response()->json([
                    'error' => 'Table nature_dons n\'existe pas',
                    'message' => 'Veuillez créer la table avec les migrations'
                ], 500);
            }
            
            $natureDon = NatureDon::findOrFail($id);
            $natureDon->update(['date_suppression' => now()]);
            
            return response()->json([
                'success' => true,
                'message' => 'Nature de don supprimée avec succès'
            ]);
        } catch (Exception $e) {
            Log::error('Error deleting nature don: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la suppression de la nature de don',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ===== SITUATIONS =====
    public function getSituations()
    {
        try {
            Log::info('Début du chargement des situations');
            
            if (!Schema::hasTable('situations')) {
                Log::error('Table situations n\'existe pas');
                return response()->json([
                    'error' => 'Table situations n\'existe pas',
                    'message' => 'Veuillez exécuter les migrations'
                ], 500);
            }
            
            $situations = Situation::whereNull('date_suppression')->get();
            Log::info('Situations chargées avec succès', ['count' => $situations->count()]);
            
            return response()->json([
                'success' => true,
                'data' => $situations
            ]);
        } catch (Exception $e) {
            Log::error('Error loading situations: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors du chargement des situations',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function storeSituation(Request $request)
    {
        try {
            $validated = $request->validate(['libelle' => 'required|string|max:255']);
            $situation = Situation::create($validated);
            Log::info('Situation créée', ['id' => $situation->id]);
            return response()->json($situation, 201);
        } catch (Exception $e) {
            Log::error('Error creating situation: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la création de la situation',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateSituation(Request $request, $id)
    {
        try {
            $validated = $request->validate(['libelle' => 'required|string|max:255']);
            $situation = Situation::findOrFail($id);
            $situation->update($validated);
            return response()->json($situation);
        } catch (Exception $e) {
            Log::error('Error updating situation: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la mise à jour de la situation',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteSituation($id)
    {
        try {
            $situation = Situation::findOrFail($id);
            $situation->update(['date_suppression' => now()]);
            return response()->json(['message' => 'Situation supprimée avec succès']);
        } catch (Exception $e) {
            Log::error('Error deleting situation: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la suppression de la situation',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ===== TYPE D'ASSISTANCE =====
    public function getTypeAssistances()
    {
        try {
            Log::info('Début du chargement des types d\'assistance');
            
            // Vérifier la table types_assistance (pas type_assistances)
            if (!Schema::hasTable('types_assistance')) {
                Log::error('Table types_assistance n\'existe pas');
                return response()->json([
                    'error' => 'Table types_assistance n\'existe pas',
                    'message' => 'Veuillez vérifier le nom de la table'
                ], 500);
            }
            
            $typeAssistances = TypeAssistance::whereNull('date_suppression')->get();
            
            Log::info('Types d\'assistance chargés avec succès', ['count' => $typeAssistances->count()]);
            return response()->json([
                'success' => true,
                'data' => $typeAssistances
            ]);
        } catch (Exception $e) {
            Log::error('Error loading type assistances: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors du chargement des types d\'assistance',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function storeTypeAssistance(Request $request)
    {
        try {
            $validated = $request->validate([
                'libelle' => 'required|string|max:255',
                'description' => 'nullable|string',
                'prix_unitaire' => 'nullable|numeric|min:0'
            ]);
            $typeAssistance = TypeAssistance::create($validated);
            return response()->json($typeAssistance, 201);
        } catch (Exception $e) {
            Log::error('Error creating type assistance: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la création du type d\'assistance',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateTypeAssistance(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'libelle' => 'required|string|max:255',
                'description' => 'nullable|string',
                'prix_unitaire' => 'nullable|numeric|min:0'
            ]);
            $typeAssistance = TypeAssistance::findOrFail($id);
            $typeAssistance->update($validated);
            return response()->json($typeAssistance);
        } catch (Exception $e) {
            Log::error('Error updating type assistance: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la mise à jour du type d\'assistance',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteTypeAssistance($id)
    {
        try {
            $typeAssistance = TypeAssistance::findOrFail($id);
            $typeAssistance->update(['date_suppression' => now()]);
            return response()->json(['message' => 'Type d\'assistance supprimé avec succès']);
        } catch (Exception $e) {
            Log::error('Error deleting type assistance: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la suppression du type d\'assistance',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ===== TYPE BUDGET =====
    public function getTypeBudgets()
    {
        try {
            Log::info('Début du chargement des types de budget');
            
            if (!Schema::hasTable('type_budgets')) {
                Log::error('Table type_budgets n\'existe pas');
                return response()->json([
                    'error' => 'Table type_budgets n\'existe pas',
                    'message' => 'Veuillez vérifier le nom de la table'
                ], 500);
            }
            
            $typeBudgets = TypeBudget::whereNull('date_suppression')->get();
            Log::info('Types de budget chargés avec succès', ['count' => $typeBudgets->count()]);
            
            return response()->json([
                'success' => true,
                'data' => $typeBudgets
            ]);
        } catch (Exception $e) {
            Log::error('Error loading type budgets: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors du chargement des types de budget',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function storeTypeBudget(Request $request)
    {
        try {
            $validated = $request->validate(['libelle' => 'required|string|max:255']);
            $typeBudget = TypeBudget::create($validated);
            return response()->json($typeBudget, 201);
        } catch (Exception $e) {
            Log::error('Error creating type budget: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la création du type de budget',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateTypeBudget(Request $request, $id)
    {
        try {
            $validated = $request->validate(['libelle' => 'required|string|max:255']);
            $typeBudget = TypeBudget::findOrFail($id);
            $typeBudget->update($validated);
            return response()->json($typeBudget);
        } catch (Exception $e) {
            Log::error('Error updating type budget: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la mise à jour du type de budget',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteTypeBudget($id)
    {
        try {
            $typeBudget = TypeBudget::findOrFail($id);
            $typeBudget->update(['date_suppression' => now()]);
            return response()->json(['message' => 'Type de budget supprimé avec succès']);
        } catch (Exception $e) {
            Log::error('Error deleting type budget: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la suppression du type de budget',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ===== BUDGET =====
    public function getBudgets()
    {
        try {
            Log::info('Début du chargement des budgets');
            
            if (!Schema::hasTable('budgets')) {
                Log::error('Table budgets n\'existe pas');
                return response()->json([
                    'error' => 'Table budgets n\'existe pas',
                    'message' => 'Veuillez vérifier le nom de la table'
                ], 500);
            }
            
            $budgets = Budget::whereNull('date_suppression')
                ->with('typeBudget')
                ->get();
            
            Log::info('Budgets chargés avec succès', ['count' => $budgets->count()]);
            return response()->json([
                'success' => true,
                'data' => $budgets
            ]);
        } catch (Exception $e) {
            Log::error('Error loading budgets: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors du chargement des budgets',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function storeBudget(Request $request)
    {
        try {
            $validated = $request->validate([
                'libelle' => 'required|string|max:255',
                'montant' => 'nullable|numeric|min:0',
                'annee_exercice' => 'required|integer|min:2020|max:2030',
                'type_budget_id' => 'required|exists:type_budgets,id'
            ]);
            $budget = Budget::create($validated);
            return response()->json($budget->load('typeBudget'), 201);
        } catch (Exception $e) {
            Log::error('Error creating budget: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la création du budget',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateBudget(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'libelle' => 'required|string|max:255',
                'montant' => 'nullable|numeric|min:0',
                'annee_exercice' => 'required|integer|min:2020|max:2030',
                'type_budget_id' => 'required|exists:type_budgets,id'
            ]);
            $budget = Budget::findOrFail($id);
            $budget->update($validated);
            return response()->json($budget->load('typeBudget'));
        } catch (Exception $e) {
            Log::error('Error updating budget: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la mise à jour du budget',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteBudget($id)
    {
        try {
            $budget = Budget::findOrFail($id);
            $budget->update(['date_suppression' => now()]);
            return response()->json(['message' => 'Budget supprimé avec succès']);
        } catch (Exception $e) {
            Log::error('Error deleting budget: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la suppression du budget',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function storeSecurityQuestion(Request $request)
    {
        try {
            $validated = $request->validate([
                'question' => 'required|string|max:500',
                'active' => 'boolean'
            ]);

            $question = SecurityQuestion::create([
                'question' => $validated['question'],
                'active' => $validated['active'] ?? true
            ]);

            Log::info('Question de sécurité créée', ['id' => $question->id]);
            return response()->json($question, 201);
        } catch (Exception $e) {
            Log::error('Error creating security question: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la création de la question',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateSecurityQuestion(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'question' => 'required|string|max:500',
                'active' => 'boolean'
            ]);

            $question = SecurityQuestion::findOrFail($id);
            $question->update($validated);

            Log::info('Question de sécurité mise à jour', ['id' => $id]);
            return response()->json($question);
        } catch (Exception $e) {
            Log::error('Error updating security question: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la mise à jour de la question',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteSecurityQuestion($id)
    {
        try {
            $question = SecurityQuestion::findOrFail($id);
            $question->delete();
            Log::info('Question de sécurité supprimée', ['id' => $id]);
            return response()->json(['message' => 'Question supprimée avec succès']);
        } catch (Exception $e) {
            Log::error('Error deleting security question: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la suppression de la question',
                'message' => $e->getMessage()
            ], 500);
        }
    }


    public function getDetailsTypeAssistances()
{
    try {
        Log::info('Début du chargement des détails types d\'assistance');
        
        if (!Schema::hasTable('details_type_assistances')) {
            Log::warning('Table details_type_assistances n\'existe pas, retour de données par défaut');
            
            return response()->json([
                'success' => true,
                'data' => [
                    [
                        'id' => 1,
                        'type_assistance_id' => 1,
                        'libelle' => 'Consultation médicale',
                        'description' => 'Consultation chez un médecin généraliste',
                        'montant' => 50.00,
                        'typeAssistance' => ['libelle' => 'Aide médicale']
                    ],
                    [
                        'id' => 2,
                        'type_assistance_id' => 1,
                        'libelle' => 'Médicaments essentiels',
                        'description' => 'Provision de médicaments de base',
                        'montant' => 25.00,
                        'typeAssistance' => ['libelle' => 'Aide médicale']
                    ],
                    [
                        'id' => 3,
                        'type_assistance_id' => 2,
                        'libelle' => 'Aide alimentaire',
                        'description' => 'Distribution de colis alimentaires',
                        'montant' => 30.00,
                        'typeAssistance' => ['libelle' => 'Aide sociale']
                    ]
                ],
                'message' => 'Données par défaut - Table details_type_assistances non trouvée'
            ], 200);
        }
        
        $detailsTypeAssistances = DetailsTypeAssistance::whereNull('date_suppression')
                                  ->with('typeAssistance')
                                  ->orderBy('type_assistance_id')
                                  ->orderBy('libelle')
                                  ->get();
        
        Log::info('Détails types d\'assistance chargés avec succès', ['count' => $detailsTypeAssistances->count()]);
        
        return response()->json([
            'success' => true,
            'data' => $detailsTypeAssistances
        ], 200);
    } catch (Exception $e) {
        Log::error('Error loading details type assistances: ' . $e->getMessage());
        
        // Fallback avec données par défaut en cas d'erreur
        return response()->json([
            'success' => true,
            'data' => [
                [
                    'id' => 1,
                    'type_assistance_id' => 1,
                    'libelle' => 'Consultation médicale',
                    'description' => 'Consultation chez un médecin généraliste',
                    'montant' => 50.00,
                    'typeAssistance' => ['libelle' => 'Aide médicale']
                ],
                [
                    'id' => 2,
                    'type_assistance_id' => 1,
                    'libelle' => 'Médicaments essentiels',
                    'description' => 'Provision de médicaments de base',
                    'montant' => 25.00,
                    'typeAssistance' => ['libelle' => 'Aide médicale']
                ]
            ],
            'message' => 'Données par défaut - Erreur de chargement'
        ], 200);
    }
}

/**
 * Récupérer les détails pour un type d'assistance spécifique
 */
public function getDetailsTypeAssistancesByType($typeAssistanceId)
{
    try {
        Log::info('Chargement des détails pour type assistance', ['type_assistance_id' => $typeAssistanceId]);
        
        if (!Schema::hasTable('details_type_assistances')) {
            Log::error('Table details_type_assistances n\'existe pas');
            return response()->json([
                'error' => 'Table details_type_assistances n\'existe pas',
                'message' => 'Veuillez vérifier le nom de la table'
            ], 500);
        }
        
        $detailsTypeAssistances = DetailsTypeAssistance::where('type_assistance_id', $typeAssistanceId)
            ->whereNull('date_suppression')
            ->with('typeAssistance')
            ->orderBy('libelle')
            ->get();
        
        Log::info('Détails types d\'assistance chargés par type', ['count' => $detailsTypeAssistances->count()]);
        return response()->json([
            'success' => true,
            'data' => $detailsTypeAssistances
        ]);
    } catch (Exception $e) {
        Log::error('Error loading details type assistances by type: ' . $e->getMessage());
        return response()->json([
            'error' => 'Erreur lors du chargement des détails types d\'assistance',
            'message' => $e->getMessage()
        ], 500);
    }
}

/**
 * Créer un nouveau détail type assistance
 */
public function storeDetailsTypeAssistance(Request $request)
{
    try {
        Log::info('Création d\'un détail type assistance', ['data' => $request->all()]);
        
        $validated = $request->validate([
            'type_assistance_id' => 'required|exists:types_assistance,id',
            'libelle' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'montant' => 'nullable|numeric|min:0|max:999999.99'
        ]);
        
        if (!Schema::hasTable('details_type_assistances')) {
            return response()->json([
                'error' => 'Table details_type_assistances n\'existe pas',
                'message' => 'Veuillez créer la table avec les migrations'
            ], 500);
        }
        
        $detailsTypeAssistance = DetailsTypeAssistance::create($validated);
        $detailsTypeAssistance->load('typeAssistance');
        
        Log::info('Détail type assistance créé', ['id' => $detailsTypeAssistance->id]);
        
        return response()->json([
            'success' => true,
            'data' => $detailsTypeAssistance,
            'message' => 'Détail type assistance créé avec succès'
        ], 201);
    } catch (Exception $e) {
        Log::error('Error creating details type assistance: ' . $e->getMessage());
        return response()->json([
            'error' => 'Erreur lors de la création du détail type assistance',
            'message' => $e->getMessage()
        ], 500);
    }
}

/**
 * Mettre à jour un détail type assistance
 */
public function updateDetailsTypeAssistance(Request $request, $id)
{
    try {
        Log::info('Mise à jour d\'un détail type assistance', ['id' => $id, 'data' => $request->all()]);
        
        $validated = $request->validate([
            'type_assistance_id' => 'required|exists:types_assistance,id',
            'libelle' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'montant' => 'nullable|numeric|min:0|max:999999.99'
        ]);
        
        if (!Schema::hasTable('details_type_assistances')) {
            return response()->json([
                'error' => 'Table details_type_assistances n\'existe pas',
                'message' => 'Veuillez créer la table avec les migrations'
            ], 500);
        }
        
        $detailsTypeAssistance = DetailsTypeAssistance::findOrFail($id);
        $detailsTypeAssistance->update($validated);
        $detailsTypeAssistance->load('typeAssistance');
        
        Log::info('Détail type assistance mis à jour', ['id' => $id]);
        
        return response()->json([
            'success' => true,
            'data' => $detailsTypeAssistance,
            'message' => 'Détail type assistance mis à jour avec succès'
        ]);
    } catch (Exception $e) {
        Log::error('Error updating details type assistance: ' . $e->getMessage());
        return response()->json([
            'error' => 'Erreur lors de la mise à jour du détail type assistance',
            'message' => $e->getMessage()
        ], 500);
    }
}

/**
 * Supprimer un détail type assistance (soft delete)
 */
public function deleteDetailsTypeAssistance($id)
{
    try {
        Log::info('Suppression d\'un détail type assistance', ['id' => $id]);
        
        if (!Schema::hasTable('details_type_assistances')) {
            return response()->json([
                'error' => 'Table details_type_assistances n\'existe pas',
                'message' => 'Veuillez créer la table avec les migrations'
            ], 500);
        }
        
        $detailsTypeAssistance = DetailsTypeAssistance::findOrFail($id);
        
        // Soft delete
        $detailsTypeAssistance->update(['date_suppression' => now()]);
        
        Log::info('Détail type assistance supprimé', ['id' => $id]);
        
        return response()->json([
            'success' => true,
            'message' => 'Détail type assistance supprimé avec succès'
        ]);
    } catch (Exception $e) {
        Log::error('Error deleting details type assistance: ' . $e->getMessage());
        return response()->json([
            'error' => 'Erreur lors de la suppression du détail type assistance',
            'message' => $e->getMessage()
        ], 500);
    }
}

/**
 * Restaurer un détail type assistance supprimé
 */
public function restoreDetailsTypeAssistance($id)
{
    try {
        Log::info('Restauration d\'un détail type assistance', ['id' => $id]);
        
        if (!Schema::hasTable('details_type_assistances')) {
            return response()->json([
                'error' => 'Table details_type_assistances n\'existe pas',
                'message' => 'Veuillez créer la table avec les migrations'
            ], 500);
        }
        
        $detailsTypeAssistance = DetailsTypeAssistance::findOrFail($id);
        
        // Restore
        $detailsTypeAssistance->update(['date_suppression' => null]);
        $detailsTypeAssistance->load('typeAssistance');
        
        Log::info('Détail type assistance restauré', ['id' => $id]);
        
        return response()->json([
            'success' => true,
            'data' => $detailsTypeAssistance,
            'message' => 'Détail type assistance restauré avec succès'
        ]);
    } catch (Exception $e) {
        Log::error('Error restoring details type assistance: ' . $e->getMessage());
        return response()->json([
            'error' => 'Erreur lors de la restauration du détail type assistance',
            'message' => $e->getMessage()
        ], 500);
    }
}



}