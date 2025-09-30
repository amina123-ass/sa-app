<?php
// app/Http/Controllers/NotificationController.php - Version corrigée avec gestion d'erreurs robuste

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Database\QueryException;
use Carbon\Carbon;

class NotificationController extends Controller
{
    /**
     * Récupérer les notifications avec gestion d'erreurs robuste
     */
    public function index(Request $request)
    {
        try {
            $user = auth()->user();
            
            if (!$user) {
                Log::warning('Tentative d\'accès notifications sans authentification', [
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Authentification requise'
                ], 401);
            }

            // Rate limiting avec gestion d'erreur
            $rateLimitKey = 'notifications_' . $user->id;
            
            try {
                if (RateLimiter::tooManyAttempts($rateLimitKey, 10)) {
                    $seconds = RateLimiter::availableIn($rateLimitKey);
                    
                    Log::info('Rate limit notifications atteint', [
                        'user_id' => $user->id,
                        'retry_after' => $seconds
                    ]);
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'Trop de requêtes. Réessayez dans ' . $seconds . ' secondes.',
                        'retry_after' => $seconds
                    ], 429);
                }
                
                RateLimiter::hit($rateLimitKey, 60);
            } catch (\Exception $rateLimitError) {
                // Si le rate limiting échoue, continuer sans bloquer
                Log::warning('Erreur rate limiting notifications', [
                    'user_id' => $user->id,
                    'error' => $rateLimitError->getMessage()
                ]);
            }

            // Tentative de récupération avec cache
            $cacheKey = "notifications_user_{$user->id}";
            $unreadCountKey = "notifications_unread_count_{$user->id}";
            
            try {
                // Essayer le cache d'abord
                $cachedNotifications = Cache::get($cacheKey);
                $cachedUnreadCount = Cache::get($unreadCountKey);
                
                if ($cachedNotifications !== null && $cachedUnreadCount !== null) {
                    Log::debug('Notifications servies depuis le cache', [
                        'user_id' => $user->id,
                        'count' => count($cachedNotifications)
                    ]);
                    
                    return response()->json([
                        'success' => true,
                        'data' => $cachedNotifications,
                        'unread_count' => $cachedUnreadCount,
                        'cached' => true,
                        'timestamp' => now()->toISOString()
                    ]);
                }
            } catch (\Exception $cacheError) {
                Log::warning('Erreur cache notifications', [
                    'user_id' => $user->id,
                    'error' => $cacheError->getMessage()
                ]);
                // Continuer sans cache
            }

            // Récupération depuis la base de données avec protection
            try {
                // Vérifier si la table notifications existe
                if (!\Schema::hasTable('notifications')) {
                    Log::error('Table notifications n\'existe pas');
                    
                    return response()->json([
                        'success' => true,
                        'data' => [],
                        'unread_count' => 0,
                        'message' => 'Système de notifications non configuré'
                    ]);
                }

                // Récupérer les notifications avec une requête sécurisée
                $notifications = $user->notifications()
                    ->latest()
                    ->take(50)
                    ->get()
                    ->map(function ($notification) {
                        try {
                            return [
                                'id' => $notification->id,
                                'type' => $notification->type ?? 'info',
                                'data' => $notification->data ?? [],
                                'read_at' => $notification->read_at,
                                'created_at' => $notification->created_at,
                                'is_read' => !is_null($notification->read_at),
                                'title' => $notification->data['title'] ?? 'Notification',
                                'message' => $notification->data['message'] ?? '',
                                'time_ago' => $notification->created_at->diffForHumans()
                            ];
                        } catch (\Exception $e) {
                            Log::warning('Erreur formatage notification', [
                                'notification_id' => $notification->id,
                                'error' => $e->getMessage()
                            ]);
                            
                            return [
                                'id' => $notification->id,
                                'type' => 'info',
                                'title' => 'Notification',
                                'message' => 'Contenu non disponible',
                                'is_read' => true,
                                'created_at' => $notification->created_at
                            ];
                        }
                    });

                // Compter les non lues de manière sécurisée
                $unreadCount = 0;
                try {
                    $unreadCount = $user->unreadNotifications()->count();
                } catch (\Exception $countError) {
                    Log::warning('Erreur comptage notifications non lues', [
                        'user_id' => $user->id,
                        'error' => $countError->getMessage()
                    ]);
                }

                // Mettre en cache le résultat (avec gestion d'erreur)
                try {
                    Cache::put($cacheKey, $notifications, 30); // 30 secondes
                    Cache::put($unreadCountKey, $unreadCount, 15); // 15 secondes
                } catch (\Exception $cacheStoreError) {
                    Log::warning('Erreur stockage cache notifications', [
                        'user_id' => $user->id,
                        'error' => $cacheStoreError->getMessage()
                    ]);
                }

                Log::info('Notifications récupérées depuis BDD', [
                    'user_id' => $user->id,
                    'count' => $notifications->count(),
                    'unread_count' => $unreadCount
                ]);

                return response()->json([
                    'success' => true,
                    'data' => $notifications,
                    'unread_count' => $unreadCount,
                    'cached' => false,
                    'timestamp' => now()->toISOString()
                ]);

            } catch (QueryException $dbError) {
                Log::error('Erreur base de données notifications', [
                    'user_id' => $user->id,
                    'error' => $dbError->getMessage(),
                    'code' => $dbError->getCode()
                ]);

                // Retourner un résultat vide plutôt qu'une erreur
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'unread_count' => 0,
                    'message' => 'Service temporairement indisponible',
                    'fallback' => true
                ]);

            } catch (\Exception $dbError) {
                Log::error('Erreur générale base de données notifications', [
                    'user_id' => $user->id,
                    'error' => $dbError->getMessage(),
                    'trace' => $dbError->getTraceAsString()
                ]);

                return response()->json([
                    'success' => true,
                    'data' => [],
                    'unread_count' => 0,
                    'message' => 'Erreur temporaire',
                    'fallback' => true
                ]);
            }
            
        } catch (\Exception $e) {
            Log::error('Erreur critique notifications', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            
            // Même en cas d'erreur critique, renvoyer une réponse valide
            return response()->json([
                'success' => false,
                'message' => 'Service temporairement indisponible',
                'data' => [],
                'unread_count' => 0,
                'error_code' => 'NOTIFICATIONS_SERVICE_ERROR'
            ], 503); // Service Unavailable au lieu de 500
        }
    }
    
    /**
     * Marquer toutes les notifications comme lues
     */
    public function markAllAsRead(Request $request)
    {
        try {
            $user = auth()->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentification requise'
                ], 401);
            }

            // Vérifier si la table existe
            if (!\Schema::hasTable('notifications')) {
                return response()->json([
                    'success' => true,
                    'message' => 'Aucune notification à marquer',
                    'updated_count' => 0
                ]);
            }

            // Marquer comme lues avec gestion d'erreur
            $updated = 0;
            
            try {
                $updated = $user->unreadNotifications()->update([
                    'read_at' => now()
                ]);
            } catch (QueryException $e) {
                Log::error('Erreur marquage notifications lues', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors du marquage des notifications'
                ], 500);
            }

            // Nettoyer le cache
            $this->clearNotificationCache($user->id);

            Log::info('Notifications marquées comme lues', [
                'user_id' => $user->id,
                'updated_count' => $updated
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notifications marquées comme lues',
                'updated_count' => $updated
            ]);
            
        } catch (\Exception $e) {
            Log::error('Erreur critique marquage notifications', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du marquage des notifications'
            ], 500);
        }
    }
    
    /**
     * Obtenir seulement le nombre de notifications non lues
     */
    public function getUnreadCount(Request $request)
    {
        try {
            $user = auth()->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentification requise'
                ], 401);
            }

            // Vérifier si la table existe
            if (!\Schema::hasTable('notifications')) {
                return response()->json([
                    'success' => true,
                    'unread_count' => 0
                ]);
            }

            // Cache du compteur pour 15 secondes
            $cacheKey = "notifications_unread_count_{$user->id}";
            
            try {
                $unreadCount = Cache::remember($cacheKey, 15, function () use ($user) {
                    try {
                        return $user->unreadNotifications()->count();
                    } catch (QueryException $e) {
                        Log::warning('Erreur comptage BDD notifications', [
                            'user_id' => $user->id,
                            'error' => $e->getMessage()
                        ]);
                        return 0;
                    }
                });
            } catch (\Exception $cacheError) {
                Log::warning('Erreur cache compteur notifications', [
                    'user_id' => $user->id,
                    'error' => $cacheError->getMessage()
                ]);
                
                // Fallback direct à la BDD
                try {
                    $unreadCount = $user->unreadNotifications()->count();
                } catch (\Exception $dbError) {
                    $unreadCount = 0;
                }
            }

            return response()->json([
                'success' => true,
                'unread_count' => $unreadCount,
                'cached' => Cache::has($cacheKey)
            ]);
            
        } catch (\Exception $e) {
            Log::error('Erreur critique compteur notifications', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => true,
                'unread_count' => 0,
                'fallback' => true
            ]);
        }
    }
    
    /**
     * Stream SSE pour les notifications (version sécurisée)
     */
    public function stream(Request $request)
    {
        // Vérifier l'authentification
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentification requise'
            ], 401);
        }

        // Vérifier si les notifications sont disponibles
        if (!\Schema::hasTable('notifications')) {
            return response()->json([
                'success' => false,
                'message' => 'Service de notifications non disponible'
            ], 503);
        }

        // Désactiver les timeouts et buffers
        set_time_limit(0);
        ignore_user_abort(false);
        
        return response()->stream(function () use ($user) {
            $lastCheck = now();
            $heartbeatInterval = 30; // 30 secondes
            $lastHeartbeat = time();
            
            // En-têtes SSE
            echo "retry: 10000\n";
            echo "data: " . json_encode(['type' => 'connected', 'user_id' => $user->id]) . "\n\n";
            
            while (true) {
                // Vérifier si la connexion est toujours active
                if (connection_aborted()) {
                    Log::info('Connexion SSE fermée', ['user_id' => $user->id]);
                    break;
                }

                try {
                    // Heartbeat périodique
                    if (time() - $lastHeartbeat >= $heartbeatInterval) {
                        $unreadCount = 0;
                        try {
                            $unreadCount = $user->unreadNotifications()->count();
                        } catch (\Exception $e) {
                            Log::warning('Erreur comptage heartbeat SSE', [
                                'user_id' => $user->id,
                                'error' => $e->getMessage()
                            ]);
                        }
                        
                        echo "event: heartbeat\n";
                        echo "data: " . json_encode([
                            'type' => 'heartbeat',
                            'timestamp' => now()->toISOString(),
                            'unread_count' => $unreadCount
                        ]) . "\n\n";
                        
                        $lastHeartbeat = time();
                    }

                    // Vérifier les nouvelles notifications
                    try {
                        $newNotifications = $user->notifications()
                            ->where('created_at', '>', $lastCheck)
                            ->latest()
                            ->get();

                        if ($newNotifications->count() > 0) {
                            foreach ($newNotifications as $notification) {
                                echo "event: notification\n";
                                echo "data: " . json_encode([
                                    'type' => 'notification',
                                    'notification' => [
                                        'id' => $notification->id,
                                        'type' => $notification->type,
                                        'data' => $notification->data,
                                        'created_at' => $notification->created_at,
                                        'is_read' => false
                                    ]
                                ]) . "\n\n";
                            }
                            
                            $lastCheck = now();
                        }
                    } catch (\Exception $e) {
                        Log::error('Erreur vérification nouvelles notifications SSE', [
                            'user_id' => $user->id,
                            'error' => $e->getMessage()
                        ]);
                    }

                    ob_flush();
                    flush();
                    
                } catch (\Exception $e) {
                    Log::error('Erreur dans la boucle SSE', [
                        'user_id' => $user->id,
                        'error' => $e->getMessage()
                    ]);
                    break;
                }

                // Attendre avant la prochaine vérification
                sleep(5);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no', // Pour nginx
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Headers' => 'Cache-Control'
        ]);
    }
    
    /**
     * Nettoyer le cache des notifications pour un utilisateur
     */
    private function clearNotificationCache($userId)
    {
        try {
            Cache::forget("notifications_user_{$userId}");
            Cache::forget("notifications_unread_count_{$userId}");
        } catch (\Exception $e) {
            Log::warning('Erreur nettoyage cache notifications', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Diagnostic du système de notifications
     */
    public function diagnostic(Request $request)
    {
        try {
            $user = auth()->user();
            
            $diagnostic = [
                'timestamp' => now()->toISOString(),
                'user_id' => $user ? $user->id : null,
                'authenticated' => !is_null($user),
                'tables' => [
                    'notifications' => \Schema::hasTable('notifications'),
                    'users' => \Schema::hasTable('users')
                ],
                'cache' => [
                    'available' => Cache::getStore() !== null,
                    'driver' => config('cache.default')
                ],
                'database' => [
                    'connection' => 'unknown'
                ]
            ];

            // Tester la connexion base de données
            try {
                \DB::connection()->getPdo();
                $diagnostic['database']['connection'] = 'ok';
            } catch (\Exception $e) {
                $diagnostic['database']['connection'] = 'error';
                $diagnostic['database']['error'] = $e->getMessage();
            }

            // Statistiques notifications si utilisateur connecté
            if ($user && $diagnostic['tables']['notifications']) {
                try {
                    $diagnostic['notifications'] = [
                        'total' => $user->notifications()->count(),
                        'unread' => $user->unreadNotifications()->count(),
                        'last_created' => $user->notifications()->latest()->first()?->created_at
                    ];
                } catch (\Exception $e) {
                    $diagnostic['notifications'] = [
                        'error' => $e->getMessage()
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'diagnostic' => $diagnostic
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'diagnostic' => [
                    'timestamp' => now()->toISOString(),
                    'critical_error' => true
                ]
            ], 500);
        }
    }
    
    /**
     * Nettoyage d'urgence des notifications
     */
    public function emergencyCleanup(Request $request)
    {
        try {
            Log::info('Nettoyage d\'urgence notifications déclenché', [
                'user_id' => auth()->id(),
                'ip' => $request->ip()
            ]);

            // Nettoyer tous les caches de notifications
            $cacheKeys = [
                'notifications_user_*',
                'notifications_unread_count_*'
            ];
            
            foreach ($cacheKeys as $pattern) {
                try {
                    // Note: Cette méthode dépend du driver de cache utilisé
                    Cache::flush(); // Nettoyage global pour simplifier
                } catch (\Exception $e) {
                    Log::warning('Erreur nettoyage cache pattern', [
                        'pattern' => $pattern,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Statistiques après nettoyage
            $stats = [
                'cache_cleared' => true,
                'timestamp' => now()->toISOString()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Nettoyage d\'urgence terminé',
                'stats' => $stats
            ]);
            
        } catch (\Exception $e) {
            Log::error('Erreur nettoyage d\'urgence notifications', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du nettoyage d\'urgence'
            ], 500);
        }
    }
}