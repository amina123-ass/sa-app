<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        // Vérifier que l'utilisateur est authentifié
        if (!auth()->check()) {
            return response()->json(['message' => 'Non authentifié'], 401);
        }

        $user = auth()->user();
        
        // Vérifier que l'utilisateur peut se connecter
        if (!$user->canLogin()) {
            return response()->json(['message' => 'Compte non activé ou rôle non assigné'], 403);
        }

        // Si aucun rôle spécifique requis, laisser passer
        if (empty($roles)) {
            return $next($request);
        }

        // Vérifier que l'utilisateur a le bon rôle
        $userRole = $user->role->libelle ?? null;
        
        if (!$userRole || !in_array($userRole, $roles)) {
            return response()->json([
                'message' => 'Accès refusé. Rôle requis: ' . implode(' ou ', $roles) . '. Votre rôle: ' . ($userRole ?? 'Aucun')
            ], 403);
        }

        return $next($request);
    }
}