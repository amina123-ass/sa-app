<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Routes additionnelles si nécessaire
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Middleware global
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // Alias de middleware
        $middleware->alias([
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
        ]);

        // CORS - Configuration pour permettre les requêtes cross-origin
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Configuration des exceptions personnalisées pour l'API
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non authentifié. Veuillez vous connecter.',
                    'error' => 'Unauthenticated'
                ], 401);
            }
            
            // Pour les requêtes web, redirection vers login si la route existe
            try {
                return redirect()->guest(route('login'));
            } catch (\Exception $routeException) {
                // Si la route login n'existe pas, retourner JSON même pour le web
                return response()->json([
                    'success' => false,
                    'message' => 'Non authentifié. Route de login non configurée.',
                    'error' => 'Unauthenticated',
                    'redirect_needed' => true
                ], 401);
            }
        });

        // Gestion des erreurs de validation
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données de validation invalides',
                    'errors' => $e->errors()
                ], 422);
            }
        });

        // Gestion des erreurs de modèle non trouvé
        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ressource non trouvée',
                    'error' => 'Not Found'
                ], 404);
            }
        });

        // Gestion des erreurs de route non trouvée
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Route non trouvée',
                    'error' => 'Route Not Found',
                    'requested_url' => $request->url()
                ], 404);
            }
        });

        // Gestion des erreurs de serveur
        $exceptions->render(function (\Throwable $e, Request $request) {
            // Log l'erreur
            \Illuminate\Support\Facades\Log::error('Erreur serveur', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'url' => $request->url(),
                'method' => $request->method(),
                'ip' => $request->ip()
            ]);

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => config('app.debug') ? $e->getMessage() : 'Erreur serveur interne',
                    'error' => 'Internal Server Error',
                    'debug' => config('app.debug') ? [
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                        'trace' => $e->getTraceAsString()
                    ] : null
                ], 500);
            }
        });
    })
    ->create();