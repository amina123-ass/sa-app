<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Headers CORS à ajouter
        $headers = [
            'Access-Control-Allow-Origin' => $this->getAllowedOrigin($request),
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token, X-Sanctum-Token',
            'Access-Control-Allow-Credentials' => 'true',
            'Access-Control-Max-Age' => '86400', // 24 heures
        ];

        // Gérer les requêtes OPTIONS (preflight)
        if ($request->getMethod() === "OPTIONS") {
            return response('', 200, $headers);
        }

        // Traiter la requête
        $response = $next($request);

        // Ajouter les headers CORS à la réponse
        foreach ($headers as $key => $value) {
            $response->headers->set($key, $value);
        }

        return $response;
    }

    /**
     * Déterminer l'origine autorisée basée sur la requête
     */
    private function getAllowedOrigin(Request $request): string
    {
        $origin = $request->headers->get('Origin');
        
        // Liste des origines autorisées
        $allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'https://localhost:3000', // HTTPS pour le développement
            // Ajoutez vos domaines de production ici
            // 'https://votre-domaine.com',
        ];

        // Si l'origine est dans la liste, la retourner
        if (in_array($origin, $allowedOrigins)) {
            return $origin;
        }

        // Pour le développement, accepter localhost sur n'importe quel port
        if (app()->environment('local') && $origin && 
            (str_starts_with($origin, 'http://localhost:') || 
             str_starts_with($origin, 'http://127.0.0.1:'))) {
            return $origin;
        }

        // Valeur par défaut
        return 'http://localhost:3000';
    }
}