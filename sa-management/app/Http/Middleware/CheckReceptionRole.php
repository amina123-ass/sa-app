<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckReceptionRole
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'Non authentifié'], 401);
        }

        $allowedRoles = ['Reception', 'Réception', 'reception', 'Administrateur Informatique'];
        
        if (!$user->role || !in_array($user->role->libelle, $allowedRoles)) {
            return response()->json([
                'message' => 'Accès refusé. Rôle Réception requis.'
            ], 403);
        }

        return $next($request);
    }
}