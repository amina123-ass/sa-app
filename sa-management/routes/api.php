<?php
// routes/api.php - VERSION NETTOYÉE (SUPPRESSION DES DOUBLONS)

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ReceptionController;
use App\Http\Controllers\DictionaryController;
use App\Http\Controllers\UpasController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/*
|--------------------------------------------------------------------------
| API Routes - ROUTES NETTOYÉES
|--------------------------------------------------------------------------
*/

// ===== ROUTES PUBLIQUES =====
Route::get('/test', function () {
    return response()->json([
        'message' => 'API UPAS fonctionne correctement',
        'timestamp' => now(),
        'version' => '1.0.0',
        'environment' => app()->environment()
    ]);
});

// ===== AUTHENTIFICATION =====
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/security-questions', [AuthController::class, 'getSecurityQuestions']);

// ===== RÉCUPÉRATION DE MOT DE PASSE =====
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/verify-security-answers', [AuthController::class, 'verifySecurityAnswers']);
Route::post('/setup-security', [AuthController::class, 'setupSecurity']);
Route::post('/reset-password-with-token', [AuthController::class, 'resetPasswordWithToken']);

// ===== VÉRIFICATION D'EMAIL =====
Route::get('/email/verify/{id}/{hash}', function (Request $request) {
    try {
        Log::info('Tentative de vérification email', [
            'user_id' => $request->route('id'),
            'hash' => $request->route('hash'),
            'ip' => request()->ip()
        ]);

        $user = User::findOrFail($request->route('id'));

        if (!hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification()))) {
            Log::warning('Email verification failed: Invalid hash');
            return redirect(env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/email-verification-result?status=error&message=Lien de vérification invalide');
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            
            Log::info('Email verified successfully', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            $hasPassword = !empty($user->password) && strlen($user->password) >= 60;
            
            if (!$hasPassword) {
                $redirectUrl = env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/security-setup?' . http_build_query([
                    'email' => $user->email,
                    'verified' => 'true',
                    'user_id' => $user->id,
                    'step' => 'password'
                ]);
                return redirect($redirectUrl);
            } else {
                $hasSecurityQuestions = $user->securityAnswers()->count() >= 3;
                
                if (!$hasSecurityQuestions) {
                    $redirectUrl = env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/security-setup?' . http_build_query([
                        'email' => $user->email,
                        'verified' => 'true',
                        'user_id' => $user->id,
                        'step' => 'security-questions'
                    ]);
                    return redirect($redirectUrl);
                } else {
                    // *** ENVOI EMAIL D'ACTIVATION APRÈS VÉRIFICATION EMAIL ***
                    try {
                        $token = sha1($user->email . $user->created_at . config('app.key'));
                        $activationUrl = config('app.url') . '/api/users/' . $user->id . '/activate/' . $token;
                        
                        // Logique d'envoi d'email d'activation (à adapter selon vos notifications)
                        // $user->notify(new \App\Notifications\UserActivationNotification($user, $activationUrl));
                        
                        Log::info('Email d\'activation envoyé', [
                            'user_id' => $user->id,
                            'activation_url' => $activationUrl
                        ]);
                    } catch (\Exception $emailError) {
                        Log::error('Erreur envoi email d\'activation', [
                            'user_id' => $user->id,
                            'error' => $emailError->getMessage()
                        ]);
                    }
                    
                    $redirectUrl = env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/email-verification-result?' . http_build_query([
                        'status' => 'success',
                        'message' => 'Email vérifié avec succès. Un lien d\'activation vous a été envoyé.',
                        'user_id' => $user->id,
                        'show_admin_message' => 'true'
                    ]);
                    return redirect($redirectUrl);
                }
            }
        } else {
            $redirectUrl = env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/email-verification-result?' . http_build_query([
                'status' => 'already_verified',
                'message' => 'Votre email a déjà été vérifié.'
            ]);
            return redirect($redirectUrl);
        }

    } catch (\Exception $e) {
        Log::error('Email verification error', [
            'error' => $e->getMessage(),
            'user_id' => $request->route('id')
        ]);
        
        return redirect(env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/email-verification-result?status=error&message=Erreur lors de la vérification');
    }
})->name('verification.verify');

// ===== ROUTES D'ACTIVATION PUBLIQUES (SANS AUTHENTIFICATION) =====

// Route GET publique pour rediriger vers l'interface d'activation
Route::get('/users/{id}/activate/{token}', function (Request $request, $id, $token) {
    try {
        Log::info('Accès lien activation public', [
            'user_id' => $id,
            'token_partial' => substr($token, 0, 8) . '...',
            'ip' => request()->ip(),
            'user_agent' => $request->userAgent()
        ]);

        $user = User::findOrFail($id);
        
        // Générer le token attendu
        $expectedToken = sha1($user->email . $user->created_at . config('app.key'));
        
        // Vérifier le token
        if (!hash_equals($token, $expectedToken)) {
            Log::warning('Token d\'activation invalide', [
                'user_id' => $id,
                'ip' => request()->ip()
            ]);
            
            return redirect(env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/activation-error?' . http_build_query([
                'error' => 'invalid_token',
                'message' => 'Lien d\'activation invalide ou expiré.'
            ]));
        }

        // Vérifications de statut
        if (!$user->hasVerifiedEmail()) {
            Log::info('Tentative activation sans email vérifié', [
                'user_id' => $id
            ]);
            
            return redirect(env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/activation-error?' . http_build_query([
                'error' => 'email_not_verified',
                'message' => 'Vous devez d\'abord vérifier votre adresse email.'
            ]));
        }
        
        if ($user->activer_compte) {
            Log::info('Utilisateur déjà activé', [
                'user_id' => $id
            ]);
            
            return redirect(env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/activation-result?' . http_build_query([
                'status' => 'already_activated',
                'message' => 'Votre compte est déjà activé. Vous pouvez vous connecter.',
                'redirect_to' => 'login'
            ]));
        }
        
        // Redirection vers la page publique d'activation
        $frontendUrl = env('FRONTEND_URL', 'http://192.168.1.45:3001');
        $redirectUrl = $frontendUrl . '/public/activate-account?' . http_build_query([
            'user_id' => $user->id,
            'token' => $token,
            'email' => $user->email,
            'name' => trim($user->prenom_user . ' ' . $user->nom_user),
            'verified' => 'true'
        ]);
        
        Log::info('Redirection vers page publique d\'activation', [
            'user_id' => $id,
            'redirect_url' => $redirectUrl
        ]);
        
        return redirect($redirectUrl);
        
    } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        Log::error('Utilisateur non trouvé pour activation', [
            'user_id' => $id,
            'ip' => request()->ip()
        ]);
        
        return redirect(env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/activation-error?' . http_build_query([
            'error' => 'user_not_found',
            'message' => 'Utilisateur non trouvé.'
        ]));
        
    } catch (\Exception $e) {
        Log::error('Erreur lors de l\'activation via lien public', [
            'user_id' => $id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return redirect(env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/activation-error?' . http_build_query([
            'error' => 'server_error',
            'message' => 'Erreur serveur lors de l\'activation.'
        ]));
    }
})->name('public.activation.redirect');

// Route POST publique pour traiter l'activation avec token
Route::post('/users/{id}/activate-with-token', function (Request $request, $id) {
    $validator = Validator::make($request->all(), [
        'token' => 'required|string',
        'role_id' => 'required|exists:roles,id'
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
        
        $user = User::findOrFail($id);
        $role = \App\Models\Role::findOrFail($request->role_id);
        
        // Vérifier le token
        $expectedToken = sha1($user->email . $user->created_at . config('app.key'));
        
        if (!hash_equals($request->token, $expectedToken)) {
            Log::warning('Token invalide lors de l\'activation', [
                'user_id' => $id,
                'ip' => request()->ip()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Token d\'activation invalide ou expiré'
            ], 403);
        }
        
        // Vérifications de statut
        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'success' => false,
                'message' => 'L\'email doit être vérifié avant l\'activation'
            ], 400);
        }
        
        if ($user->activer_compte) {
            return response()->json([
                'success' => true,
                'message' => 'Ce compte est déjà activé',
                'user' => $user->load('role'),
                'already_activated' => true
            ], 200);
        }
        
        // Procéder à l'activation
        $updates = [
            'activer_compte' => true,
            'role_id' => $request->role_id,
            'email_verified_at' => $user->email_verified_at ?? now()
        ];
        
        $newPassword = null;
        
        // Générer un mot de passe si nécessaire
        if (empty($user->password) || strlen($user->password) < 60) {
            $newPassword = Str::random(8) . rand(10, 99) . Str::random(2);
            $updates['password'] = Hash::make($newPassword);
        }
        
        $user->update($updates);
        
        // Envoyer l'email de confirmation
        $emailSent = false;
        try {
            // Si vous avez une notification d'activation
            $user->notify(new \App\Notifications\AccountActivatedNotification($user, $role, $newPassword));
            $emailSent = true;
        } catch (\Exception $emailError) {
            Log::error('Erreur envoi email activation', [
                'user_id' => $user->id,
                'error' => $emailError->getMessage()
            ]);
        }
        
        DB::commit();
        
        Log::info('Compte activé avec succès via lien public', [
            'user_id' => $user->id,
            'role_assigned' => $role->libelle,
            'email_sent' => $emailSent,
            'ip' => request()->ip()
        ]);
        
        $response = [
            'success' => true,
            'message' => $emailSent 
                ? 'Compte activé avec succès ! Un email de confirmation a été envoyé.'
                : 'Compte activé avec succès !',
            'user' => $user->load('role'),
            'activation_details' => [
                'activated_at' => now()->format('d/m/Y H:i:s'),
                'role_assigned' => $role->libelle,
                'email_sent' => $emailSent,
                'login_url' => env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/login'
            ]
        ];
        
        if ($newPassword) {
            $response['generated_credentials'] = [
                'email' => $user->email,
                'temporary_password' => $newPassword,
                'password' => $newPassword, // Compatibilité
                'role' => $role->libelle,
                'message' => 'Un mot de passe temporaire a été généré et envoyé par email.'
            ];
        }
        
        return response()->json($response, 200);
        
    } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        DB::rollBack();
        
        return response()->json([
            'success' => false,
            'message' => 'Utilisateur non trouvé'
        ], 404);
        
    } catch (\Exception $e) {
        DB::rollBack();
        
        Log::error('Erreur activation via token public', [
            'user_id' => $id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'activation du compte',
            'error' => config('app.debug') ? $e->getMessage() : 'Erreur interne'
        ], 500);
    }
});

// Route GET publique pour obtenir les rôles disponibles (si nécessaire)
Route::get('/activation/roles', function () {
    try {
        $roles = \App\Models\Role::whereNull('date_suppression')
            ->where('libelle', '!=', 'Administrateur Informatique') // Exclure les rôles admin
            ->orderBy('libelle')
            ->get(['id', 'libelle']);
        
        return response()->json([
            'success' => true,
            'roles' => $roles
        ]);
    } catch (\Exception $e) {
        Log::error('Erreur chargement rôles pour activation', [
            'error' => $e->getMessage()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du chargement des rôles'
        ], 500);
    }
});

// ===== ROUTES PROTÉGÉES =====
Route::middleware('auth:sanctum')->group(function () {
    
    // ===== AUTHENTIFICATION =====
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    
    // ===== PROFIL UTILISATEUR =====
    Route::get('/profile', function () {
        $user = auth()->user();
        return response()->json([
            'success' => true,
            'data' => $user->load('role')
        ]);
    });
    
    Route::put('/profile', function (Request $request) {
        $user = auth()->user();
        
        $validator = Validator::make($request->all(), [
            'nom_user' => 'sometimes|required|string|max:255',
            'prenom_user' => 'sometimes|required|string|max:255',
            'tel_user' => 'sometimes|required|string|max:20',
            'adresse_user' => 'sometimes|required|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $user->update($request->only(['nom_user', 'prenom_user', 'tel_user', 'adresse_user']));

        return response()->json([
            'success' => true,
            'message' => 'Profil mis à jour avec succès',
            'data' => $user->load('role')
        ]);
    });

    // ===== NOTIFICATIONS =====
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::get('/notifications/stream', [NotificationController::class, 'stream']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'getUnreadCount']);

    // ===== ROUTES ADMINISTRATEUR =====
    Route::prefix('admin')->group(function () {
        
        // Dashboard
        Route::get('/dashboard', function () {
            return response()->json([
                'stats' => [
                    'total_users' => \App\Models\User::whereNull('date_suppression')->count(),
                    'pending_activations' => \App\Models\User::where('activer_compte', false)->whereNull('date_suppression')->count(),
                    'active_users' => \App\Models\User::where('activer_compte', true)->whereNull('date_suppression')->count(),
                    'roles_count' => \App\Models\Role::whereNull('date_suppression')->count(),
                ],
                'recent_users' => \App\Models\User::with('role')->whereNull('date_suppression')->latest()->take(5)->get()
            ]);
        });
        
        // ===== GESTION UTILISATEURS =====
        Route::get('/users', function () {
            return response()->json(\App\Models\User::with('role')->whereNull('date_suppression')->get());
        });
        
        Route::post('/users', function (Request $request) {
            $validator = Validator::make($request->all(), [
                'nom_user' => 'required|string|max:255',
                'prenom_user' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'password' => 'nullable|string|min:8',
                'tel_user' => 'required|string|max:20',
                'adresse_user' => 'required|string|max:500',
                'role_id' => 'required|exists:roles,id'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $password = $request->password;
            $passwordGenerated = false;
            
            if (empty($password)) {
                $password = Str::random(12);
                $passwordGenerated = true;
            }

            $user = \App\Models\User::create([
                'nom_user' => $request->nom_user,
                'prenom_user' => $request->prenom_user,
                'email' => $request->email,
                'password' => Hash::make($password),
                'tel_user' => $request->tel_user,
                'adresse_user' => $request->adresse_user,
                'role_id' => $request->role_id,
                'email_verified_at' => now(),
                'activer_compte' => true
            ]);

            $response = [
                'message' => 'Utilisateur créé avec succès',
                'user' => $user->load('role')
            ];

            if ($passwordGenerated) {
                $response['generated_credentials'] = [
                    'email' => $user->email,
                    'password' => $password,
                    'role' => $user->role->libelle,
                    'message' => 'Mot de passe généré automatiquement.'
                ];
            }

            return response()->json($response, 201);
        });
        
        // ===== ACTIVATION UTILISATEUR ADMIN (API - PUT METHOD) =====
        Route::put('/users/{id}/activate', function (Request $request, $id) {
            $validator = Validator::make($request->all(), [
                'role_id' => 'required|exists:roles,id'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            try {
                DB::beginTransaction();
                
                $user = User::findOrFail($id);
                $role = \App\Models\Role::findOrFail($request->role_id);
                
                if ($user->activer_compte) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Ce compte est déjà activé',
                        'user' => $user->load('role')
                    ], 200);
                }
                
                $updates = [
                    'activer_compte' => true,
                    'role_id' => $request->role_id,
                    'email_verified_at' => $user->email_verified_at ?? now()
                ];
                
                $newPassword = null;
                
                if (empty($user->password) || strlen($user->password) < 60) {
                    $newPassword = Str::random(12) . rand(10, 99);
                    $updates['password'] = Hash::make($newPassword);
                }
                
                $user->update($updates);
                
                try {
                    $user->notify(new \App\Notifications\AccountActivatedNotification($user, $role, $newPassword));
                    $emailSent = true;
                } catch (\Exception $emailError) {
                    Log::error('Erreur envoi email activation admin', [
                        'user_id' => $user->id,
                        'error' => $emailError->getMessage()
                    ]);
                    $emailSent = false;
                }
                
                DB::commit();
                
                $response = [
                    'success' => true,
                    'message' => $emailSent 
                        ? 'Utilisateur activé avec succès et email de confirmation envoyé'
                        : 'Utilisateur activé avec succès (erreur envoi email)',
                    'user' => $user->load('role'),
                    'activation_details' => [
                        'activated_at' => now()->format('d/m/Y H:i:s'),
                        'role_assigned' => $role->libelle,
                        'email_sent' => $emailSent,
                        'login_url' => env('FRONTEND_URL', 'http://192.168.1.45:3001') . '/login'
                    ]
                ];
                
                if ($newPassword) {
                    $response['generated_credentials'] = [
                        'email' => $user->email,
                        'password' => $newPassword,
                        'role' => $role->libelle,
                        'message' => 'Nouveau mot de passe généré et envoyé par email.'
                    ];
                }
                
                return response()->json($response, 200);
                
            } catch (\Exception $e) {
                DB::rollBack();
                
                Log::error('Erreur activation compte admin', [
                    'user_id' => $id,
                    'error' => $e->getMessage()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors de l\'activation du compte',
                    'error' => $e->getMessage()
                ], 500);
            }
        });
        
        Route::post('/users/{id}/reset-password', function (Request $request, $id) {
            $user = \App\Models\User::findOrFail($id);
            
            $newPassword = Str::random(12);
            
            $user->update([
                'password' => Hash::make($newPassword),
                'email_verified_at' => now(),
                'activer_compte' => true
            ]);

            $user->tokens()->delete();

            return response()->json([
                'message' => 'Mot de passe réinitialisé avec succès',
                'user' => $user->load('role'),
                'new_credentials' => [
                    'email' => $user->email,
                    'password' => $newPassword,
                    'role' => $user->role->libelle
                ]
            ]);
        });
        
        Route::put('/users/{id}/deactivate', function ($id) {
            $user = \App\Models\User::findOrFail($id);
            $user->update(['activer_compte' => false]);
            return response()->json(['message' => 'Utilisateur désactivé avec succès']);
        });
        
        Route::put('/users/{id}/assign-role', function (Request $request, $id) {
            $validator = Validator::make($request->all(), [
                'role_id' => 'required|exists:roles,id'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $user = \App\Models\User::findOrFail($id);
            $user->update(['role_id' => $request->role_id]);
            return response()->json(['message' => 'Rôle assigné avec succès']);
        });
        
        Route::delete('/users/{id}', function ($id) {
            $user = \App\Models\User::findOrFail($id);
            $user->update(['date_suppression' => now()]);
            return response()->json(['message' => 'Utilisateur supprimé avec succès']);
        });

        // ===== GESTION DES RÔLES =====
        Route::get('/roles', function () {
            return response()->json(\App\Models\Role::whereNull('date_suppression')->get());
        });

        Route::post('/roles', function (Request $request) {
            $validator = Validator::make($request->all(), [
                'libelle' => 'required|string|max:255|unique:roles,libelle',
                'description' => 'nullable|string|max:1000'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $role = \App\Models\Role::create([
                'libelle' => $request->libelle,
                'description' => $request->description
            ]);

            return response()->json([
                'message' => 'Rôle créé avec succès',
                'role' => $role
            ], 201);
        });

        Route::put('/roles/{id}', function (Request $request, $id) {
            $role = \App\Models\Role::findOrFail($id);
            
            $validator = Validator::make($request->all(), [
                'libelle' => 'required|string|max:255|unique:roles,libelle,' . $id,
                'description' => 'nullable|string|max:1000'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $systemRoles = ['Administrateur Informatique'];
            if (in_array($role->libelle, $systemRoles) && $request->libelle !== $role->libelle) {
                return response()->json([
                    'message' => 'Impossible de modifier le nom de ce rôle système'
                ], 403);
            }

            $role->update([
                'libelle' => $request->libelle,
                'description' => $request->description
            ]);

            return response()->json([
                'message' => 'Rôle modifié avec succès',
                'role' => $role
            ]);
        });

        Route::delete('/roles/{id}', function ($id) {
            $role = \App\Models\Role::findOrFail($id);
            
            $systemRoles = ['Administrateur Informatique'];
            if (in_array($role->libelle, $systemRoles)) {
                return response()->json([
                    'message' => 'Impossible de supprimer ce rôle système'
                ], 403);
            }

            $usersWithRole = \App\Models\User::where('role_id', $id)->whereNull('date_suppression')->count();
            if ($usersWithRole > 0) {
                return response()->json([
                    'message' => 'Impossible de supprimer ce rôle car des utilisateurs l\'utilisent encore'
                ], 409);
            }

            $role->update(['date_suppression' => now()]);
            
            return response()->json(['message' => 'Rôle supprimé avec succès']);
        });

        // ===== ROUTES DICTIONARY =====
        Route::prefix('dictionary')->group(function () {
            Route::get('/security-questions', [DictionaryController::class, 'getSecurityQuestions']);
            Route::post('/security-questions', [DictionaryController::class, 'storeSecurityQuestion']);
            Route::put('/security-questions/{id}', [DictionaryController::class, 'updateSecurityQuestion']);
            Route::delete('/security-questions/{id}', [DictionaryController::class, 'deleteSecurityQuestion']);
            
            Route::get('/situations', [DictionaryController::class, 'getSituations']);
            Route::post('/situations', [DictionaryController::class, 'storeSituation']);
            Route::put('/situations/{id}', [DictionaryController::class, 'updateSituation']);
            Route::delete('/situations/{id}', [DictionaryController::class, 'deleteSituation']);

            Route::get('/nature-dones', [DictionaryController::class, 'getNatureDones']);
            Route::post('/nature-dones', [DictionaryController::class, 'storeNatureDone']);
            Route::put('/nature-dones/{id}', [DictionaryController::class, 'updateNatureDone']);
            Route::delete('/nature-dones/{id}', [DictionaryController::class, 'deleteNatureDone']);

            Route::get('/type-assistances', [DictionaryController::class, 'getTypeAssistances']);
            Route::post('/type-assistances', [DictionaryController::class, 'storeTypeAssistance']);
            Route::put('/type-assistances/{id}', [DictionaryController::class, 'updateTypeAssistance']);
            Route::delete('/type-assistances/{id}', [DictionaryController::class, 'deleteTypeAssistance']);

            // Routes pour DetailsTypeAssistance
Route::get('/details-type-assistances', [DictionaryController::class, 'getDetailsTypeAssistances']);
    
    // Routes pour DetailsTypeAssistance (déjà existantes)
    Route::get('/details-type-assistances/type/{typeAssistanceId}', [DictionaryController::class, 'getDetailsTypeAssistancesByType']);
    Route::post('/details-type-assistances', [DictionaryController::class, 'storeDetailsTypeAssistance']);
    Route::put('/details-type-assistances/{id}', [DictionaryController::class, 'updateDetailsTypeAssistance']);
    Route::delete('/details-type-assistances/{id}', [DictionaryController::class, 'deleteDetailsTypeAssistance']);
    Route::post('/details-type-assistances/{id}/restore', [DictionaryController::class, 'restoreDetailsTypeAssistance']);
               Route::get('/etat-dones', [DictionaryController::class, 'getEtatDones']);
            Route::post('/etat-dones', [DictionaryController::class, 'storeEtatDone']);
            Route::put('/etat-dones/{id}', [DictionaryController::class, 'updateEtatDone']);
            Route::delete('/etat-dones/{id}', [DictionaryController::class, 'deleteEtatDone']);

            Route::get('/type-budgets', [DictionaryController::class, 'getTypeBudgets']);
            Route::post('/type-budgets', [DictionaryController::class, 'storeTypeBudget']);
            Route::put('/type-budgets/{id}', [DictionaryController::class, 'updateTypeBudget']);
            Route::delete('/type-budgets/{id}', [DictionaryController::class, 'deleteTypeBudget']);

            Route::get('/budgets', [DictionaryController::class, 'getBudgets']);
            Route::post('/budgets', [DictionaryController::class, 'storeBudget']);
            Route::put('/budgets/{id}', [DictionaryController::class, 'updateBudget']);
            Route::delete('/budgets/{id}', [DictionaryController::class, 'deleteBudget']);
        });
    });

    // ===== ROUTES UPAS =====
    Route::middleware('auth:sanctum')->prefix('uas')->group(function () {
    

        
    /*
    |--------------------------------------------------------------------------
    | Routes Dashboard et Diagnostiques
    |--------------------------------------------------------------------------
    */
    
    // Dashboard principal
    Route::get('/dashboard', [UpasController::class, 'dashboard'])
        ->name('upas.dashboard');
    
    // Tests et diagnostiques
    Route::get('/test-connection', [UpasController::class, 'testConnection'])
        ->name('upas.test.connection');
    
    Route::get('/diagnostic/complete', [UpasController::class, 'diagnosticComplete'])
        ->name('upas.diagnostic.complete');
    
    Route::get('/diagnostic/campagnes', [UpasController::class, 'diagnosticCampagnes'])
        ->name('upas.diagnostic.campagnes');
    
    Route::get('/diagnostic/types-assistance', [UpasController::class, 'diagnosticTypesAssistance'])
        ->name('upas.diagnostic.types');
    
    // Routes de test et débogage
    Route::prefix('test')->group(function () {
        Route::get('/campagnes-connectivity', [UpasController::class, 'testCampagnesConnectivity']);
        Route::get('/campagnes-only', [UpasController::class, 'testCampagnesOnly']);
        Route::get('/campagne/{id}', [UpasController::class, 'testSpecificCampagne']);
        Route::get('/beneficiaire-creation', [UpasController::class, 'testBeneficiaireCreation']);
        Route::get('/kafala-update/{id}', [UpasController::class, 'testKafalaUpdate']);
    });
    
    // Routes de réparation automatique
    Route::prefix('repair')->group(function () {
        Route::post('/auto-fix', [UpasController::class, 'autoRepair']);
        Route::post('/fix-campagnes', [UpasController::class, 'fixCampagnesIssues']);
        Route::post('/create-test-data', [UpasController::class, 'createTestData']);
        Route::post('/quick-start', [UpasController::class, 'quickStart']);
    });

    /*
    |--------------------------------------------------------------------------
    | Routes Kafalas (Parrainages)
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('kafalas')->group(function () {
        Route::get('/', [UpasController::class, 'getKafalas']);
        Route::get('/statistics', [UpasController::class, 'getKafalaStatistics']);
        Route::get('/search', [UpasController::class, 'searchKafalas']);
        Route::post('/validate', [UpasController::class, 'validateKafalaData']);
        Route::get('/test-connection', [UpasController::class, 'testConnection']);
        
        Route::get('/{id}', [UpasController::class, 'getKafala'])->where('id', '[0-9]+');
        Route::post('/', [UpasController::class, 'storeKafala']);
        Route::put('/{id}', [UpasController::class, 'updateKafala'])->where('id', '[0-9]+');
        Route::delete('/{id}', [UpasController::class, 'deleteKafala'])->where('id', '[0-9]+');
        
        // Routes PDF avec middleware spécifique
        Route::post('/{id}/pdf', [UpasController::class, 'uploadKafalaPdf'])->where('id', '[0-9]+');
        
        // 🔥 SOLUTION PRINCIPALE : Routes PDF sans redirection vers login
        Route::get('/{id}/pdf', [UpasController::class, 'viewKafalaPdf'])
            ->where('id', '[0-9]+')
            ->withoutMiddleware(['auth:sanctum']); // Temporairement sans auth pour debug
            
        Route::get('/{id}/pdf/download', [UpasController::class, 'downloadKafalaPdf'])
            ->where('id', '[0-9]+')
            ->withoutMiddleware(['auth:sanctum']);
            
        Route::get('/{id}/pdf/exists', [UpasController::class, 'checkKafalaPdfExists'])->where('id', '[0-9]+');
        Route::delete('/{id}/pdf', [UpasController::class, 'deleteKafalaPdf'])->where('id', '[0-9]+');
    });
    /*
    |--------------------------------------------------------------------------
    | Routes Campagnes Médicales
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('campagnes')->group(function () {
        // CRUD Campagnes
        Route::get('/', [UpasController::class, 'getCampagnes'])
            ->name('upas.campagnes.index');
        
        Route::get('/actives', [UpasController::class, 'getCampagnesActives'])
            ->name('upas.campagnes.actives');
        
        Route::get('/for-select', [UpasController::class, 'getCampagnesForSelect'])
            ->name('upas.campagnes.for_select');
        
        Route::get('/with-auto-status', [UpasController::class, 'getCampagnesWithAutoStatus']);
        
        Route::get('/{id}', [UpasController::class, 'getCampagne'])
            ->where('id', '[0-9]+')
            ->name('upas.campagnes.show');
        
        Route::post('/', [UpasController::class, 'storeCampagne'])
            ->name('upas.campagnes.store');
        
        Route::put('/{id}', [UpasController::class, 'updateCampagne'])
            ->where('id', '[0-9]+')
            ->name('upas.campagnes.update');
        
        Route::delete('/{id}', [UpasController::class, 'deleteCampagne'])
            ->where('id', '[0-9]+')
            ->name('upas.campagnes.destroy');
        
        // Validation et utilitaires
        Route::post('/validate', [UpasController::class, 'validerCampagne']);
        Route::post('/force-update-status', [UpasController::class, 'forceUpdateCampaignStatus']);
        
        // Statistiques par campagne
        Route::get('/{id}/statistiques', [UpasController::class, 'getStatistiquesCampagne'])
            ->where('id', '[0-9]+');
        
        Route::get('/{id}/rapport', [UpasController::class, 'getRapportCampagne'])
            ->where('id', '[0-9]+');
        
        // Gestion des listes de bénéficiaires
        Route::get('/{id}/grouped-lists', [UpasController::class, 'getGroupedListsByCampagne'])
            ->where('id', '[0-9]+');
        
        Route::get('/{id}/lists', [UpasController::class, 'getCampagneLists'])
            ->where('id', '[0-9]+');
        
        Route::post('/{id}/update-decisions', [UpasController::class, 'updateDecisionsByCampagne'])
            ->where('id', '[0-9]+');
        
        // Participants de campagne
        Route::get('/{id}/participants', [UpasController::class, 'getParticipants'])
            ->where('id', '[0-9]+');
        
        Route::get('/{id}/participants/export', function (Request $request, $id) {
            try {
                $campagne = DB::table('campagnes_medicales')
                    ->where('id', $id)
                    ->whereNull('date_suppression')
                    ->first();

                if (!$campagne) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Campagne non trouvée'
                    ], 404);
                }

                $participants = DB::table('participants')
                    ->leftJoin('campagnes_medicales', 'participants.campagne_id', '=', 'campagnes_medicales.id')
                    ->select('participants.*', 'campagnes_medicales.nom as campagne_nom')
                    ->where('participants.campagne_id', $id)
                    ->whereNull('participants.date_suppression')
                    ->orderBy('participants.nom')
                    ->get();

                $filename = 'participants_campagne_' . str_replace(' ', '_', $campagne->nom) . '_' . date('Y-m-d_H-i-s') . '.csv';

                $headers = [
                    'Content-Type' => 'text/csv; charset=utf-8',
                    'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                ];

                $callback = function() use ($participants) {
                    $file = fopen('php://output', 'w');
                    
                    // BOM UTF-8
                    fputs($file, "\xEF\xBB\xBF");
                    
                    // En-têtes CSV
                    fputcsv($file, [
                        'ID', 'Nom', 'Prénom', 'Adresse', 'Téléphone', 'Email',
                        'Date de naissance', 'Sexe', 'CIN', 'Statut', 'Commentaire',
                        'Campagne', 'Date d\'appel', 'Date de création'
                    ]);

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
                            $participant->statut,
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
                Log::error('Erreur export participants campagne', [
                    'error' => $e->getMessage(),
                    'campagne_id' => $id
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors de l\'export : ' . $e->getMessage()
                ], 500);
            }
        })->where('id', '[0-9]+');
        
        // Présélection
        Route::get('/{id}/preselection-participants-lists', [UpasController::class, 'getPreselectionParticipantsLists'])
            ->where('id', '[0-9]+');
        
        Route::get('/{id}/preselection-participants', [UpasController::class, 'getPreselectionParticipants'])
            ->where('id', '[0-9]+');
        
        Route::get('/{id}/preselection-statistics', [UpasController::class, 'getPreselectionStatistics'])
            ->where('id', '[0-9]+');
        
        Route::post('/{id}/export-preselection', [UpasController::class, 'exportPreselectionParticipants'])
            ->where('id', '[0-9]+');
        
        // Import/Export
        Route::post('/{id}/import-participants', [UpasController::class, 'importParticipants'])
            ->where('id', '[0-9]+');
    });

    /*
    |--------------------------------------------------------------------------
    | Routes Bénéficiaires
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('beneficiaires')->group(function () {
        
        Route::post('/import', [UpasController::class, 'importBeneficiaires']);
        // CRUD Bénéficiaires
        Route::get('/', [UpasController::class, 'getBeneficiaires'])
            ->name('upas.beneficiaires.index');
        
        Route::get('/{id}', [UpasController::class, 'getBeneficiaire'])
            ->where('id', '[0-9]+')
            ->name('upas.beneficiaires.show');
        
        Route::post('/', [UpasController::class, 'storeBeneficiaire'])
            ->name('upas.beneficiaires.store');
        
        Route::put('/{id}', [UpasController::class, 'updateBeneficiaire'])
            ->where('id', '[0-9]+')
            ->name('upas.beneficiaires.update');
        
        Route::delete('/{id}', [UpasController::class, 'deleteBeneficiaire'])
            ->where('id', '[0-9]+')
            ->name('upas.beneficiaires.destroy');
        
        Route::post('/{id}/restore', [UpasController::class, 'restoreBeneficiaire'])
            ->where('id', '[0-9]+');
        
        // Actions en masse
        Route::post('/batch-action', [UpasController::class, 'actionMasseBeneficiaires']);
        
        // Statistiques
        Route::get('/statistiques', [UpasController::class, 'getStatistiquesBeneficiaires']);
        Route::prefix('beneficiaires')->group(function () {
        
        // ===== ROUTES D'IMPORT CORRIGÉES =====
        
        /**
         * ✅ VALIDATION DE FICHIER UNIQUEMENT (SANS SAUVEGARDE)
         * POST /api/upas/beneficiaires/import/validate
         * 
         * Cette route valide le fichier sans enregistrer en base
         * Paramètres: file (fichier), campagne_id (integer)
         * Retourne: validation results sans sauvegarde
         */
        Route::post('/import/validate', [UpasController::class, 'validateImportFile'])
            ->name('upas.beneficiaires.import.validate');
        
        /**
         * ✅ IMPORT RÉEL AVEC SAUVEGARDE EN BASE
         * POST /api/upas/beneficiaires/import
         * 
         * Cette route importe et sauvegarde réellement en base
         * Paramètres: file (fichier), campagne_id (integer), ignore_doublons (boolean), force_import (boolean)
         * Retourne: résultats d'import avec count des enregistrements sauvegardés
         */
        Route::post('/import', [UpasController::class, 'importBeneficiaires'])
            ->name('upas.beneficiaires.import.real');
        
        /**
         * ✅ VALIDATION SIMPLE POUR TESTS
         * POST /api/upas/beneficiaires/import/validate-simple
         */
        Route::post('/import/validate-simple', [UpasController::class, 'validateImportFileSimple'])
            ->name('upas.beneficiaires.import.validate.simple');
        
        // ===== AUTRES ROUTES D'IMPORT =====
        
        /**
         * Validation des headers de fichier
         */
        Route::post('/import/validate-headers', [UpasController::class, 'validateImportHeaders'])
            ->name('upas.beneficiaires.import.validate.headers');
        
        /**
         * Validation des données spécifiques
         */
        Route::post('/import/validate-data', [UpasController::class, 'validateImportData'])
            ->name('upas.beneficiaires.import.validate.data');
        
        /**
         * Import optimisé (version alternative)
         */
        Route::post('/import-optimized', [UpasController::class, 'importBeneficiairesOptimized'])
            ->name('upas.beneficiaires.import.optimized');
        
        // ===== ROUTES DE DIAGNOSTIC IMPORT =====
        
        /**
         * Diagnostic d'import pour une campagne
         */
        Route::get('/diagnostic/{campagneId}', [UpasController::class, 'diagnosticImport'])
            ->where('campagneId', '[0-9]+')
            ->name('upas.beneficiaires.diagnostic');
        
        /**
         * Statistiques d'import pour une campagne
         */
        Route::get('/import-stats/{campagneId}', [UpasController::class, 'getImportStats'])
            ->where('campagneId', '[0-9]+')
            ->name('upas.beneficiaires.import.stats');
        
        /**
         * Debug du statut d'import
         */
        Route::get('/debug-import-state', [UpasController::class, 'debugImportState'])
            ->name('upas.beneficiaires.debug.import');
        
        // ===== ROUTES DE NETTOYAGE =====
        
        /**
         * Nettoyage des données d'import
         */
        Route::post('/{campagneId}/clean', [UpasController::class, 'cleanImportData'])
            ->where('campagneId', '[0-9]+')
            ->name('upas.beneficiaires.clean');
        
        /**
         * Nettoyage des doublons de téléphone
         */
        Route::post('/clean-duplicates', [UpasController::class, 'cleanPhoneDuplicates'])
            ->name('upas.beneficiaires.clean.duplicates');
        
        // ===== ROUTES DE TEMPLATE =====
        
        /**
         * Template pour les lunettes
         */
        Route::get('/template/lunettes', [UpasController::class, 'getTemplateLunettes'])
            ->name('upas.beneficiaires.template.lunettes');
        
        /**
         * Template pour les appareils auditifs
         */
        Route::get('/template/auditifs', [UpasController::class, 'getTemplateAuditifs'])
            ->name('upas.beneficiaires.template.auditifs');
        
        /**
         * Règles de validation par type
         */
        Route::get('/validation-rules/{type}', [UpasController::class, 'getReglesValidation'])
            ->name('upas.beneficiaires.validation.rules');
        
        // ===== CRUD STANDARD DES BÉNÉFICIAIRES =====
        
        /**
         * Lister les bénéficiaires avec filtres et pagination
         */
        Route::get('/', [UpasController::class, 'getBeneficiaires'])
            ->name('upas.beneficiaires.index');
        
        /**
         * Afficher un bénéficiaire spécifique
         */
        Route::get('/{id}', [UpasController::class, 'getBeneficiaire'])
            ->where('id', '[0-9]+')
            ->name('upas.beneficiaires.show');
        
        /**
         * Créer un nouveau bénéficiaire
         */
        Route::post('/', [UpasController::class, 'storeBeneficiaire'])
            ->name('upas.beneficiaires.store');
        
        /**
         * Mettre à jour un bénéficiaire
         */
        Route::put('/{id}', [UpasController::class, 'updateBeneficiaire'])
            ->where('id', '[0-9]+')
            ->name('upas.beneficiaires.update');
        
        /**
         * Supprimer un bénéficiaire (soft delete)
         */
        Route::delete('/{id}', [UpasController::class, 'deleteBeneficiaire'])
            ->where('id', '[0-9]+')
            ->name('upas.beneficiaires.destroy');
        
        /**
         * Restaurer un bénéficiaire supprimé
         */
        Route::post('/{id}/restore', [UpasController::class, 'restoreBeneficiaire'])
            ->where('id', '[0-9]+')
            ->name('upas.beneficiaires.restore');
        
        // ===== ACTIONS EN MASSE =====
        
        /**
         * Actions en masse sur les bénéficiaires
         */
        Route::post('/batch-action', [UpasController::class, 'actionMasseBeneficiaires'])
            ->name('upas.beneficiaires.batch');
        
        // ===== STATISTIQUES =====
        
        /**
         * Statistiques générales des bénéficiaires
         */
        Route::get('/statistiques', [UpasController::class, 'getStatistiquesBeneficiaires'])
            ->name('upas.beneficiaires.stats');
        
        // ===== EXPORT =====
        
        /**
         * Export des bénéficiaires
         */
        Route::post('/export', [UpasController::class, 'exportBeneficiaires'])
            ->name('upas.beneficiaires.export');
    });
    
    // ===== ROUTES DES CAMPAGNES AVEC EXPORT =====
    
    Route::prefix('campagnes')->group(function () {
        /**
         * Export Excel des bénéficiaires d'une campagne
         */
        Route::get('/{campagneId}/export-beneficiaires-excel', [UpasController::class, 'exportBeneficiairesExcel'])
            ->where('campagneId', '[0-9]+')
            ->name('upas.campagnes.export.xlsx');
    });
    
    // ===== ROUTES EXPORT GLOBALES =====
    
    Route::prefix('export')->group(function () {
        /**
         * Template d'import pour une campagne
         */
        Route::get('/template/{campagneId}', [UpasController::class, 'exportBeneficiairesTemplate'])
            ->where('campagneId', '[0-9]+')
            ->name('upas.export.template');
        
        /**
         * Export de données générique
         */
        Route::post('/data', [UpasController::class, 'exportData'])
            ->name('upas.export.data');
    });
    
    // ===== ROUTES DE TEST POUR L'IMPORT =====
    
    Route::prefix('test')->group(function () {
        /**
         * Test de création de bénéficiaire
         */
        Route::get('/beneficiaire-creation', [UpasController::class, 'testBeneficiaireCreation'])
            ->name('upas.test.beneficiaire.creation');
        
        /**
         * Debug de validation d'import
         */
        Route::post('/debug-import-validation', [UpasController::class, 'debugImportValidation'])
            ->name('upas.test.debug.import.validation');
    });
        // Import/Export
        Route::post('/import/validate', [UpasController::class, 'validateImportFile']);
        Route::post('/import/validate-headers', [UpasController::class, 'validateImportHeaders']);
        Route::post('/import/validate-data', [UpasController::class, 'validateImportData']);
        Route::post('/import', [UpasController::class, 'importBeneficiaires']);
        Route::post('/import-optimized', [UpasController::class, 'importBeneficiairesOptimized']);
        Route::post('/export', [UpasController::class, 'exportBeneficiaires']);
        
        // Templates d'import
        Route::get('/template/lunettes', [UpasController::class, 'getTemplateLunettes']);
        Route::get('/template/auditifs', [UpasController::class, 'getTemplateAuditifs']);
        Route::get('/validation-rules/{type}', [UpasController::class, 'getReglesValidation']);
        
        // Nettoyage des données
        Route::post('/clean-duplicates', [UpasController::class, 'cleanPhoneDuplicates']);
        Route::post('/{campagneId}/clean', [UpasController::class, 'cleanImportData'])
            ->where('campagneId', '[0-9]+');
        
        // Diagnostiques d'import
        Route::get('/diagnostic/{campagneId}', [UpasController::class, 'diagnosticImport'])
            ->where('campagneId', '[0-9]+');
        
        Route::get('/import-stats/{campagneId}', [UpasController::class, 'getImportStats'])
            ->where('campagneId', '[0-9]+');
        
Route::post('/export', [UpasController::class, 'exportBeneficiaires']);

    });
    
    Route::get('{campagneId}/export-beneficiaires-excel',
        [UpasController::class, 'exportBeneficiairesExcel']
    )->whereNumber('campagneId')->name('upas.campagnes.export.xlsx');

Route::prefix('campagnes')->group(function () {
        Route::get('{campagneId}/export-beneficiaires-excel',
            [UpasController::class, 'exportBeneficiairesExcel']
        )->whereNumber('campagneId')->name('upas.campagnes.export.xlsx');
    });
    /*
    |--------------------------------------------------------------------------
    | Routes Participants (Réception)
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('participants')->group(function () {
        // Affichage et filtrage des participants
        Route::get('/', [UpasController::class, 'getParticipants'])
            ->name('upas.participants.index');
        
        Route::get('/{id}', [UpasController::class, 'getParticipant'])
            ->where('id', '[0-9]+')
            ->name('upas.participants.show');
        
        // Création et mise à jour des participants
        Route::post('/', [UpasController::class, 'storeParticipant'])
            ->name('upas.participants.store');
        
        Route::put('/{id}', [UpasController::class, 'updateParticipant'])
            ->where('id', '[0-9]+')
            ->name('upas.participants.update');
        
        Route::put('/{id}/statut', [UpasController::class, 'changerStatutParticipant'])
            ->where('id', '[0-9]+')
            ->name('upas.participants.update_statut');
        
        Route::delete('/{id}', [UpasController::class, 'deleteParticipant'])
            ->where('id', '[0-9]+')
            ->name('upas.participants.destroy');
        
        // Présélection
        Route::put('/{id}/preselection-status', [UpasController::class, 'updatePreselectionStatus'])
            ->where('id', '[0-9]+');
        
        Route::post('/mass-preselection-status', [UpasController::class, 'updateMassPreselectionStatus']);
        
        // Statistiques des participants
        Route::get('/campagne/{campagneId}/statistiques', [UpasController::class, 'getStatistiquesParticipants'])
            ->where('campagneId', '[0-9]+');
    });

    /*
    |--------------------------------------------------------------------------
    | Routes Assistances Médicales
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('assistances')->group(function () {
    // Routes existantes...
    Route::get('/', [UpasController::class, 'getAssistances'])
        ->name('upas.assistances.index');
    
    Route::get('/all', [UpasController::class, 'getAssistances']);
    
    Route::get('/{id}', [UpasController::class, 'getAssistanceMedicale'])
        ->where('id', '[0-9]+')
        ->name('upas.assistances.show');
    
    Route::post('/', [UpasController::class, 'storeAssistanceMedicale'])
        ->name('upas.assistances.store');
    
    Route::put('/{id}', [UpasController::class, 'updateAssistanceMedicale'])
        ->where('id', '[0-9]+')
        ->name('upas.assistances.update');
    
    Route::delete('/{id}', [UpasController::class, 'deleteAssistanceMedicale'])
        ->where('id', '[0-9]+')
        ->name('upas.assistances.destroy');

    // ===== NOUVELLES ROUTES POUR LES PRÊTS =====
    
    /**
     * Marquer un prêt comme retourné
     * POST /api/upas/assistances/{id}/retour
     */
    Route::post('/{id}/retour', [UpasController::class, 'marquerRetourPret'])
        ->where('id', '[0-9]+')
        ->name('upas.assistances.marquer_retour');
    
    /**
     * Obtenir les prêts en cours
     * GET /api/upas/assistances/prets/en-cours
     */
    Route::get('/prets/en-cours', function(Request $request) {
        try {
            $today = Carbon::now()->toDateString();
            
            $query = DB::table('assistance_medicales')
                ->leftJoin('beneficiaires', 'assistance_medicales.beneficiaire_id', '=', 'beneficiaires.id')
                ->leftJoin('nature_dones', 'assistance_medicales.nature_done_id', '=', 'nature_dones.id')
                ->leftJoin('types_assistance', 'assistance_medicales.type_assistance_id', '=', 'types_assistance.id')
                ->select(
                    'assistance_medicales.id',
                    'assistance_medicales.numero_assistance',
                    'assistance_medicales.date_assistance',
                    'assistance_medicales.date_fin_prevue',
                    'assistance_medicales.duree_utilisation',
                    'beneficiaires.nom',
                    'beneficiaires.prenom',
                    'beneficiaires.telephone',
                    'nature_dones.libelle as nature_done',
                    'types_assistance.libelle as type_assistance',
                    DB::raw("DATEDIFF(CURDATE(), assistance_medicales.date_fin_prevue) as jours_retard")
                )
                ->whereNull('assistance_medicales.date_suppression')
                ->whereNotNull('assistance_medicales.date_fin_prevue')
                ->where('assistance_medicales.retour_effectue', false)
                ->where('assistance_medicales.date_fin_prevue', '<', $today)
                ->orderBy('jours_retard', 'desc');

            $pretsEnRetard = $query->get();

            return response()->json([
                'success' => true,
                'data' => $pretsEnRetard,
                'total' => $pretsEnRetard->count()
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur: ' . $e->getMessage()
            ], 500);
        }
    })->name('upas.assistances.prets.en_retard');
    
    /**
     * Obtenir les statistiques des prêts
     * GET /api/upas/assistances/prets/statistiques
     */
    Route::get('/prets/statistiques', [UpasController::class, 'getStatistiquesPrets'])
        ->name('upas.assistances.prets.statistiques');

    // Routes existantes pour appareillages (conservées pour compatibilité)
    Route::post('/{id}/marquer-retour', [UpasController::class, 'marquerRetourAppareillage'])
        ->where('id', '[0-9]+');
    
    Route::get('/appareillages/en-retard', [UpasController::class, 'getAppareillagesEnRetard']);
    Route::get('/appareillages/a-retourner', [UpasController::class, 'getAppareillagesARetournerProchainement']);
    Route::get('/appareillages/statistiques', [UpasController::class, 'getStatistiquesAppareillages']);
    
    // Statistiques générales
    Route::get('/statistiques', [UpasController::class, 'getStatistiquesAssistances']);
    
    // Export
    Route::post('/export', [UpasController::class, 'exportAssistances']);
});

    /*
    |--------------------------------------------------------------------------
    | Routes Types d'Assistance
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('types-assistance')->group(function () {
        Route::get('/', [UpasController::class, 'getTypesAssistance'])
            ->name('upas.types_assistance.index');
        
        Route::get('/simple', [UpasController::class, 'getTypesAssistanceSimple']);
        
        Route::post('/', [UpasController::class, 'storeTypeAssistance'])
            ->name('upas.types_assistance.store');
        
        Route::put('/{id}', [UpasController::class, 'updateTypeAssistance'])
            ->where('id', '[0-9]+')
            ->name('upas.types_assistance.update');
        
        Route::delete('/{id}', [UpasController::class, 'deleteTypeAssistance'])
            ->where('id', '[0-9]+')
            ->name('upas.types_assistance.destroy');
        
        Route::post('/create-default', [UpasController::class, 'createDefaultTypesAssistance']);
    });

    /*
    |--------------------------------------------------------------------------
    | Routes Options de Formulaires et Données de Base
    |--------------------------------------------------------------------------
    */
    
    // Options pour formulaires
    Route::get('/form-options', [UpasController::class, 'getFormOptions'])
        ->name('upas.form_options');
    
    Route::get('/form-options/all', [UpasController::class, 'getAllFormOptions'])
        ->name('upas.form_options.all');
    
    Route::get('/form-options/diagnostic', [UpasController::class, 'diagnosticFormOptions']);

    /*
    |--------------------------------------------------------------------------
    | Routes Statistiques et Rapports
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('statistics')->group(function () {
        
        // Statistiques générales du système
        Route::get('/dashboard', [UpasController::class, 'getDashboardStats'])
            ->name('upas.statistics.dashboard');
        
        // Statistiques des campagnes médicales
        Route::get('/campaigns', [UpasController::class, 'getCampaigns'])
            ->name('upas.statistics.campaigns');
        
        Route::get('/campaigns/{campaignId}/stats', [UpasController::class, 'getStats'])
            ->where('campaignId', '[0-9]+')
            ->name('upas.statistics.campaign_stats');
        
        // Statistiques détaillées par type d'assistance
        Route::get('/campaigns/{campaignId}/participants', [UpasController::class, 'getParticipantsStats'])
            ->where('campaignId', '[0-9]+')
            ->name('upas.statistics.participants');
        
        Route::get('/campaigns/{campaignId}/beneficiaires', [UpasController::class, 'getBeneficiairesStats'])
            ->where('campaignId', '[0-9]+')
            ->name('upas.statistics.beneficiaires');
        
        Route::get('/campaigns/{campaignId}/auditifs', [UpasController::class, 'getAuditifStats'])
            ->where('campaignId', '[0-9]+')
            ->name('upas.statistics.auditifs');
        
        // Statistiques comparatives
        Route::get('/campaigns/comparison', [UpasController::class, 'getCampaignsComparison'])
            ->name('upas.statistics.campaigns_comparison');
        
        // Indicateurs de performance
        Route::get('/campaigns/{campaignId}/indicators', [UpasController::class, 'getCampaignIndicators'])
            ->where('campaignId', '[0-9]+')
            ->name('upas.statistics.indicators');
        
        // Exportation des statistiques
        Route::get('/campaigns/{campaignId}/export', [UpasController::class, 'exportCampaignStats'])
            ->where('campaignId', '[0-9]+')
            ->name('upas.statistics.export');
        
        Route::get('/export/all-campaigns', [UpasController::class, 'exportAllCampaignsStats'])
            ->name('upas.statistics.export_all');
        
        // Rapports statistiques par période
        Route::get('/reports/monthly', [UpasController::class, 'getMonthlyReport'])
            ->name('upas.statistics.monthly_report');
        
        Route::get('/reports/yearly', [UpasController::class, 'getYearlyReport'])
            ->name('upas.statistics.yearly_report');
        
        Route::get('/reports/custom', [UpasController::class, 'getCustomReport'])
            ->name('upas.statistics.custom_report');
        
        // Statistiques par région/délégation
        Route::get('/regions', [UpasController::class, 'getRegionalStats'])
            ->name('upas.statistics.regions');
        
        Route::get('/delegations', [UpasController::class, 'getDelegationStats'])
            ->name('upas.statistics.delegations');
        
        // Tendances et analyses
        Route::get('/trends/campaigns', [UpasController::class, 'getCampaignTrends'])
            ->name('upas.statistics.trends');
        
        Route::get('/analytics/performance', [UpasController::class, 'getPerformanceAnalytics'])
            ->name('upas.statistics.performance');
        
        // Statistiques en temps réel
        Route::get('/realtime/active-campaigns', [UpasController::class, 'getRealtimeActiveCampaigns'])
            ->name('upas.statistics.realtime_active');
        
        Route::get('/realtime/daily-progress', [UpasController::class, 'getDailyProgress'])
            ->name('upas.statistics.daily_progress');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Routes Rapports et Exports
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('rapports')->group(function () {
        
        // Rapport comparatif entre campagnes
        Route::post('/comparatif-campagnes', [UpasController::class, 'getRapportComparatifCampagnes'])
            ->name('upas.rapports.comparatif.campagnes');
        
        // Rapport de performance par période
        Route::post('/performance-periode', [UpasController::class, 'getRapportPerformancePeriode'])
            ->name('upas.rapports.performance.periode');
        
        // Rapport financier détaillé
        Route::post('/financier', [UpasController::class, 'getRapportFinancier'])
            ->name('upas.rapports.financier');
        
        // Rapport d'activité mensuel/trimestriel
        Route::post('/activite', [UpasController::class, 'getRapportActivite'])
            ->name('upas.rapports.activite');
        
        // Rapport exécutif (synthèse)
        Route::post('/executif', [UpasController::class, 'getRapportExecutif'])
            ->name('upas.rapports.executif');
        
        // Rapport personnalisé
        Route::post('/personnalise', [UpasController::class, 'getRapportPersonnalise'])
            ->name('upas.rapports.personnalise');
        
        // Génération de rapport automatique
        Route::post('/generer', [UpasController::class, 'genererRapport'])
            ->name('upas.rapports.generer');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Routes Export de Statistiques
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('export')->group(function () {
        
        // Export des statistiques générales
        Route::post('/statistiques', [UpasController::class, 'exportStatistiques'])
            ->name('upas.export.statistiques');
        
        // Export des données de campagne
        Route::post('/campagne/{id}/statistiques', [UpasController::class, 'exportStatistiquesCampagne'])
            ->where('id', '[0-9]+')
            ->name('upas.export.campagne.statistiques');
        
        // Export du dashboard
        Route::post('/dashboard', [UpasController::class, 'exportDashboard'])
            ->name('upas.export.dashboard');
        
        // Export des rapports
        Route::post('/rapport/{type}', [UpasController::class, 'exportRapport'])
            ->name('upas.export.rapport');
        
        // Export personnalisé avec filtres
        Route::post('/personnalise', [UpasController::class, 'exportPersonnalise'])
            ->name('upas.export.personnalise');
        
        // Export des KPI
        Route::post('/kpi', [UpasController::class, 'exportKPI'])
            ->name('upas.export.kpi');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Routes Analytics en Temps Réel
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('analytics')->group(function () {
        
        // Données en temps réel pour le dashboard
        Route::get('/real-time', [UpasController::class, 'getAnalyticsRealTime'])
            ->name('upas.analytics.realtime');
        
        // Métriques de performance instantanées
        Route::get('/metrics', [UpasController::class, 'getMetriques'])
            ->name('upas.analytics.metrics');
        
        // Alertes et notifications statistiques
        Route::get('/alertes', [UpasController::class, 'getAlertesStatistiques'])
            ->name('upas.analytics.alertes');
        
        // Données pour graphiques dynamiques
        Route::get('/charts-data', [UpasController::class, 'getChartsData'])
            ->name('upas.analytics.charts');
        
        // Données pour widgets dashboard
        Route::get('/widgets', [UpasController::class, 'getWidgetsData'])
            ->name('upas.analytics.widgets');
    });
    
    /*
    |--------------------------------------------------------------------------
    | Routes Utilitaires pour Statistiques
    |--------------------------------------------------------------------------
    */
    
    // Validation des filtres de statistiques
    Route::post('/statistiques/validate-filters', [UpasController::class, 'validateStatisticsFilters'])
        ->name('upas.statistiques.validate_filters');
    
    // Suggestions de filtres intelligents
    Route::get('/statistiques/suggested-filters', [UpasController::class, 'getSuggestedFilters'])
        ->name('upas.statistiques.suggested_filters');
    
    // Cache des statistiques
    Route::prefix('cache')->group(function () {
        Route::post('/clear-statistics', [UpasController::class, 'clearStatisticsCache'])
            ->name('upas.cache.clear.statistics');
        
        Route::post('/warm-up-statistics', [UpasController::class, 'warmUpStatisticsCache'])
            ->name('upas.cache.warmup.statistics');
        
        Route::get('/statistics-status', [UpasController::class, 'getStatisticsCacheStatus'])
            ->name('upas.cache.status.statistics');
    });
    /*
    |--------------------------------------------------------------------------
    | Routes Recherche et Utilitaires
    |--------------------------------------------------------------------------
    */
    
    Route::post('/recherche', [UpasController::class, 'rechercheGlobale'])
        ->name('upas.recherche');

    /*
    |--------------------------------------------------------------------------
    | Routes Maintenance et Nettoyage
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('maintenance')->group(function () {
        Route::post('/synchroniser-donnees', [UpasController::class, 'synchroniserDonnees']);
        Route::post('/verifier-integrite', [UpasController::class, 'verifierIntegrite']);
        Route::post('/nettoyage-automatique', [UpasController::class, 'nettoyageAutomatique']);
    });

    /*
    |--------------------------------------------------------------------------
    | Routes Export/Import Globales
    |--------------------------------------------------------------------------
    */
    
    Route::prefix('export')->group(function () {
        Route::post('/data', [UpasController::class, 'exportData']);
        Route::get('/template/{campagneId}', [UpasController::class, 'exportBeneficiairesTemplate'])
            ->where('campagneId', '[0-9]+');
    });

    /*
    |--------------------------------------------------------------------------
    | Routes Sans Authentification (Accès Public Contrôlé)
    |--------------------------------------------------------------------------
    */
});
Route::middleware('auth:sanctum')->prefix('upas/integration')->group(function () {
    
    // Webhook pour notifications de nouvelles données
    Route::post('/webhook/statistics-update', [UpasController::class, 'webhookStatisticsUpdate'])
        ->name('upas.webhook.statistics');
    
    // API pour systèmes tiers
    Route::get('/api/summary', [UpasController::class, 'getAPISummary'])
        ->name('upas.api.summary');
    
    // Feed RSS pour rapports automatiques
    Route::get('/feed/reports', [UpasController::class, 'getReportsFeed'])
        ->name('upas.feed.reports');
});
    // ===== ROUTES RÉCEPTION =====
    Route::prefix('reception')->group(function () {
        Route::get('/test-connection', [ReceptionController::class, 'testConnection']);
        Route::get('/dashboard', [ReceptionController::class, 'dashboard']);
        // Dans la section Route::prefix('reception')->group(function () {

        Route::get('/beneficiaires-en-attente-last-campagne', [ReceptionController::class, 'getBeneficiairesEnAttenteLastCampagne']);
        Route::get('/participants-en-attente-last-campagne', [ReceptionController::class, 'getParticipantsEnAttenteLastCampagne']);
        Route::prefix('campagnes')->group(function () {
            Route::get('/', [ReceptionController::class, 'getCampagnes']);
            Route::post('/', [ReceptionController::class, 'createCampagne']);
            Route::get('/{id}', [ReceptionController::class, 'getCampagne'])->where('id', '[0-9]+');
            Route::put('/{id}', [ReceptionController::class, 'updateCampagne'])->where('id', '[0-9]+');
            Route::delete('/{id}', [ReceptionController::class, 'deleteCampagne'])->where('id', '[0-9]+');
            Route::get('/{id}/statistiques', [ReceptionController::class, 'getStatistiquesCampagne'])->where('id', '[0-9]+');
        });
        
        Route::prefix('participants')->group(function () {
            Route::get('/', [ReceptionController::class, 'getParticipants']);
            Route::post('/', [ReceptionController::class, 'createParticipant']);
            Route::get('/{id}', [ReceptionController::class, 'getParticipant'])->where('id', '[0-9]+');
            Route::put('/{id}/statut', [ReceptionController::class, 'updateStatutParticipant'])->where('id', '[0-9]+');
            Route::delete('/{id}', [ReceptionController::class, 'supprimerParticipant'])->where('id', '[0-9]+');
        });
        
        Route::post('/import-excel', [ReceptionController::class, 'importExcel']);
        Route::get('/export-csv', [ReceptionController::class, 'exportCSV']);
        Route::get('/types-assistance', [ReceptionController::class, 'getTypesAssistance']);
        Route::get('/initial-data', [ReceptionController::class, 'getInitialData']);
    });

    // ===== OPTIONS DE FORMULAIRE (COMMUNES) =====
    Route::get('/form-options', function() {
        try {
            $data = [
                'roles' => DB::table('roles')->whereNull('date_suppression')->orderBy('libelle')->get(['id', 'libelle']),
                'types_assistance' => DB::table('type_assistances')->whereNull('date_suppression')->orderBy('libelle')->get(['id', 'libelle']),
                'campagnes_actives' => DB::table('campagnes_medicales')->whereNull('date_suppression')->where('statut', 'Active')->orderBy('nom')->get(['id', 'nom']),
                'etat_dones' => DB::table('etat_dones')->whereNull('date_suppression')->orderBy('libelle')->get(['id', 'libelle']),
                'nature_dones' => DB::table('nature_dones')->whereNull('date_suppression')->orderBy('libelle')->get(['id', 'libelle']),
                'situations' => DB::table('situations')->whereNull('date_suppression')->orderBy('libelle')->get(['id', 'libelle']),
                'sexes' => [
                    ['value' => 'M', 'label' => 'Masculin'],
                    ['value' => 'F', 'label' => 'Féminin']
                ],
                'decisions' => [
                    ['value' => 'accepté', 'label' => 'Accepté'],
                    ['value' => 'en_attente', 'label' => 'En attente'],
                    ['value' => 'refusé', 'label' => 'Refusé']
                ],
                'statuts_campagne' => [
                    ['value' => 'Active', 'label' => 'Active'],
                    ['value' => 'Inactive', 'label' => 'Inactive'],
                    ['value' => 'En cours', 'label' => 'En cours'],
                    ['value' => 'Terminée', 'label' => 'Terminée'],
                    ['value' => 'Annulée', 'label' => 'Annulée']
                ]
            ];
            
            return response()->json([
                'success' => true,
                'data' => $data
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des options: ' . $e->getMessage()
            ], 500);
        }
    });
    
    // ===== DEBUG =====
    Route::get('/debug-user', function (Request $request) {
        $user = Auth::user();
        return response()->json([
            'authenticated' => Auth::check(),
            'user_id' => optional(auth())->id(),
            'user' => $user,
            'role' => $user ? $user->role : null,
            'compte_active' => $user ? $user->activer_compte : null,
            'email_verified' => $user && method_exists($user, 'hasVerifiedEmail') ? $user->hasVerifiedEmail() : null
        ]);
    });
});

// ===== ROUTES DE FALLBACK =====
Route::fallback(function() {
    return response()->json([
        'success' => false,
        'message' => 'Route API non trouvée',
        'available_endpoints' => [
            'auth' => '/api/login, /api/register, /api/logout',
            'admin' => '/api/admin/*',
            'upas' => '/api/upas/*',
            'reception' => '/api/reception/*',
            'public' => '/api/test, /api/form-options'
        ]
    ], 404);
});

Route::get('/test-import-debug', function() {
    return response()->json([
        'message' => 'Routes d\'import configurées',
        'timestamp' => now(),
        'routes_disponibles' => [
            'validation' => 'POST /api/upas/beneficiaires/import/validate',
            'import_real' => 'POST /api/upas/beneficiaires/import',
            'diagnostic' => 'GET /api/upas/beneficiaires/diagnostic/{campagneId}',
            'stats' => 'GET /api/upas/beneficiaires/import-stats/{campagneId}',
            'template' => 'GET /api/upas/export/template/{campagneId}'
        ],
        'notes' => [
            'La route /validate fait uniquement la validation (pas de sauvegarde)',
            'La route /import fait la sauvegarde réelle en base de données',
            'Toutes les routes nécessitent une authentification sauf celle-ci'
        ]
    ]);
});