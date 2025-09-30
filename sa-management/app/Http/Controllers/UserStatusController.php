<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserStatusController extends Controller
{
    /**
     * Vérifier le statut complet de l'utilisateur connecté
     */
    public function checkStatus(Request $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'authenticated' => false,
                'message' => 'Utilisateur non authentifié'
            ], 401);
        }
        
        $status = [
            'authenticated' => true,
            'user_id' => $user->id,
            'email' => $user->email,
            'full_name' => $user->prenom_user . ' ' . $user->nom_user,
            'email_verified' => $user->hasVerifiedEmail(),
            'account_activated' => $user->activer_compte,
            'can_login' => $user->canLogin(),
            'role' => $user->role ? $user->role->libelle : null,
            'permissions' => $this->getUserPermissions($user),
            'status_details' => $this->getStatusDetails($user)
        ];
        
        return response()->json($status);
    }
    
    /**
     * Obtenir les permissions de l'utilisateur
     */
    private function getUserPermissions($user)
    {
        if (!$user->role) {
            return [];
        }
        
        return [
            'can_access_admin' => in_array($user->role->libelle, [
                'Administrateur Informatique'
            ]),
            'can_access_upas' => in_array($user->role->libelle, [
                'Responsable UPAS',
                'Administrateur UPAS', 
                'Coordinateur UPAS',
                'Administrateur Informatique'
            ]),
            'can_access_reception' => in_array($user->role->libelle, [
                'Réceptionniste',
                'Agent d\'accueil',
                'Administrateur Informatique'
            ])
        ];
    }
    
    /**
     * Obtenir les détails du statut
     */
    private function getStatusDetails($user)
    {
        $details = [
            'registration_date' => $user->created_at,
            'email_verified_at' => $user->email_verified_at,
            'last_login' => $user->last_login_at ?? null
        ];
        
        if (!$user->hasVerifiedEmail()) {
            $details['next_step'] = 'verify_email';
            $details['next_step_message'] = 'Vérifiez votre adresse email';
        } elseif (!$user->activer_compte) {
            $details['next_step'] = 'wait_activation';
            $details['next_step_message'] = 'Attendre l\'activation par un administrateur';
            $details['pending_since'] = $user->email_verified_at;
        } elseif (!$user->role_id) {
            $details['next_step'] = 'role_assignment';
            $details['next_step_message'] = 'Attribution d\'un rôle en cours';
        } else {
            $details['next_step'] = 'complete';
            $details['next_step_message'] = 'Compte entièrement configuré';
        }
        
        return $details;
    }
    
    /**
     * Renvoyer l'email de vérification
     */
    public function resendVerificationEmail(Request $request)
    {
        $user = Auth::user();
        
        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Votre email est déjà vérifié'
            ], 400);
        }
        
        $user->sendEmailVerificationNotification();
        
        return response()->json([
            'message' => 'Email de vérification renvoyé avec succès'
        ]);
    }
}
