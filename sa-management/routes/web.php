<?php
// routes/web.php - Version corrigée avec gestion du fichier statique

use Illuminate\Support\Facades\Route;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| Routes Web - SOLUTION POUR SPA
|--------------------------------------------------------------------------
*/

// ===== ROUTE LOGIN CRITIQUE (RÉSOUT L'ERREUR) =====
Route::get('/login', function (Request $request) {
    Log::info('Accès à la route login web', [
        'ip' => $request->ip(),
        'user_agent' => $request->userAgent(),
        'expects_json' => $request->expectsJson()
    ]);
    
    // Si c'est une requête API ou JSON, retourner une réponse JSON
    if ($request->expectsJson() || $request->is('api/*')) {
        return response()->json([
            'success' => false,
            'message' => 'Authentification requise',
            'login_url' => env('FRONTEND_URL', 'http://localhost:3000') . '/login',
            'api_login' => url('/api/login'),
            'redirect_needed' => true
        ], 401);
    }
    
    // Pour les requêtes web normales, rediriger vers le frontend
    $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
    $redirectUrl = $frontendUrl . '/login';
    
    // Préserver les paramètres de requête si présents
    if ($request->getQueryString()) {
        $redirectUrl .= '?' . $request->getQueryString();
    }
    
    Log::info('Redirection vers le frontend login', ['redirect_url' => $redirectUrl]);
    
    return redirect($redirectUrl);
})->name('login'); // NOM CRITIQUE pour Sanctum

// ===== ROUTES SPÉCIFIQUES (AVANT le fallback) =====

// Route d'activation directe
Route::get('/admin/users/{id}/activate', function ($id) {
    try {
        Log::info('Accès à la page d\'activation web', ['user_id' => $id]);
        
        $user = User::findOrFail($id);
        
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        
        if (!$user->hasVerifiedEmail()) {
            $redirectUrl = $frontendUrl . '/activation-error?' . http_build_query([
                'error' => 'email_not_verified',
                'message' => 'L\'utilisateur doit d\'abord vérifier son adresse email.'
            ]);
            
            return redirect($redirectUrl);
        }
        
        if ($user->activer_compte) {
            $redirectUrl = $frontendUrl . '/admin/users?' . http_build_query([
                'status' => 'already_activated',
                'message' => 'Cet utilisateur est déjà activé.',
                'user_id' => $id
            ]);
            
            return redirect($redirectUrl);
        }
        
        $redirectUrl = $frontendUrl . '/admin/users/' . $id . '/activate';
        return redirect($redirectUrl);
        
    } catch (\Exception $e) {
        Log::error('Erreur activation', ['user_id' => $id, 'error' => $e->getMessage()]);
        
        $redirectUrl = env('FRONTEND_URL', 'http://localhost:3000') . '/activation-error?' . http_build_query([
            'error' => 'server_error',
            'message' => 'Erreur serveur.'
        ]);
        
        return redirect($redirectUrl);
    }
})->name('admin.users.activate');

// Route de test
Route::get('/test-web', function () {
    return response()->json([
        'success' => true,
        'message' => 'Routes web fonctionnelles',
        'timestamp' => now()
    ]);
});

// Route de santé
Route::get('/health', function () {
    try {
        $dbStatus = \Illuminate\Support\Facades\DB::connection()->getPdo() ? 'OK' : 'ERROR';
        
        return response()->json([
            'status' => 'OK',
            'database' => $dbStatus,
            'timestamp' => now(),
            'server_info' => [
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB'
            ]
        ]);
    } catch (\Exception $e) {
        Log::error('Health check error: ' . $e->getMessage());
        return response()->json([
            'status' => 'ERROR',
            'error' => $e->getMessage(),
            'timestamp' => now()
        ], 500);
    }
});

// Route racine pour éviter les erreurs 404
Route::get('/', function () {
    return response()->json([
        'message' => 'API UPAS - Serveur Laravel fonctionnel',
        'version' => '1.0.0',
        'timestamp' => now()->format('Y-m-d H:i:s'),
        'status' => 'operational',
        'endpoints' => [
            'api_test' => '/api/test',
            'api_auth' => '/api/login',
            'health' => '/health',
            'frontend' => env('FRONTEND_URL', 'http://localhost:3000')
        ]
    ]);
});

// Route pour les assets statiques (optionnel)
Route::get('/assets/{path}', function ($path) {
    $filePath = public_path("assets/{$path}");
    
    if (file_exists($filePath)) {
        return response()->file($filePath);
    }
    
    abort(404);
})->where('path', '.*');

// ===== FALLBACK POUR SPA (EN DERNIER) =====
Route::get('/{any}', function (Request $request) {
    // Vérifier si c'est une route API
    if ($request->is('api/*')) {
        return response()->json([
            'error' => 'Route API non trouvée',
            'path' => $request->path(),
            'available_api_routes' => [
                '/api/test',
                '/api/login',
                '/api/register',
                '/api/admin/*'
            ]
        ], 404);
    }
    
    // Log pour debug
    Log::info('SPA Fallback route accessed', [
        'path' => $request->path(),
        'full_url' => $request->fullUrl()
    ]);
    
    // Option 1: Servir le fichier HTML statique (build React/Vue)
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        Log::info('Serving static index.html');
        return response()->file($indexPath);
    }
    
    // Option 2: Servir la vue Blade
    if (view()->exists('app')) {
        Log::info('Serving Blade view app');
        return view('app');
    }
    
    // Option 3: Redirection vers le frontend externe
    $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
    $redirectUrl = $frontendUrl . $request->getPathInfo();
    
    // Préserver les paramètres de requête
    if ($request->getQueryString()) {
        $redirectUrl .= '?' . $request->getQueryString();
    }
    
    Log::info('Redirecting to frontend', ['redirect_url' => $redirectUrl]);
    return redirect($redirectUrl);
    
})->where('any', '.*')->name('spa.fallback');
Route::get('/warmup', fn() => 'ok');
