<?php
// app/Http/Middleware/EnsureAccountActivated.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EnsureAccountActivated
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'message' => 'Non authentifié'
            ], 401);
        }
        
        // Vérifier si l'email est vérifié
        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Veuillez vérifier votre adresse email avant d\'accéder au système',
                'code' => 'EMAIL_NOT_VERIFIED',
                'user_status' => [
                    'email_verified' => false,
                    'account_activated' => $user->activer_compte
                ]
            ], 403);
        }
        
        // Vérifier si le compte est activé
        if (!$user->activer_compte) {
            return response()->json([
                'message' => 'Votre compte est en attente d\'activation par un administrateur. Vous recevrez un email dès que votre compte sera activé.',
                'code' => 'ACCOUNT_NOT_ACTIVATED',
                'user_status' => [
                    'email_verified' => true,
                    'account_activated' => false,
                    'verified_at' => $user->email_verified_at
                ]
            ], 403);
        }
        
        // Vérifier si l'utilisateur peut se connecter (autres vérifications)
        if (!$user->canLogin()) {
            return response()->json([
                'message' => 'Votre compte n\'est pas autorisé à accéder au système. Contactez l\'administrateur.',
                'code' => 'ACCOUNT_RESTRICTED',
                'user_status' => [
                    'email_verified' => $user->hasVerifiedEmail(),
                    'account_activated' => $user->activer_compte,
                    'has_role' => $user->role_id ? true : false,
                    'is_deleted' => $user->date_suppression ? true : false
                ]
            ], 403);
        }
        
        return $next($request);
    }
}

//=========================================================================

// app/Http/Kernel.php - Enregistrer le middleware


//=========================================================================

// app/Http/Controllers/UserStatusController.php - Contrôleur pour vérifier le statut


//=========================================================================

// routes/api.php - Ajouter ces routes de statut


//=========================================================================

// app/Events/UserEmailVerified.php - Event personnalisé (optionnel)


//=========================================================================
