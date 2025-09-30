<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public static function userRegistered(User $user)
    {
        $notification = Notification::createNotification(
            'user_registered',
            'Nouvel utilisateur inscrit',
            "L'utilisateur {$user->prenom_user} {$user->nom_user} s'est inscrit",
            [
                'user_email' => $user->email,
                'user_phone' => $user->tel_user,
                'registration_date' => $user->created_at->format('d/m/Y H:i'),
                'needs_activation' => !$user->activer_compte
            ],
            $user->id,
            null
        );

        self::broadcastNotification($notification);
        return $notification;
    }

    public static function userActivated(User $user, User $activatedBy)
    {
        $roleName = $user->role ? $user->role->libelle : 'Aucun rôle';
        
        $notification = Notification::createNotification(
            'user_activated',
            'Compte utilisateur activé',
            "Le compte de {$user->prenom_user} {$user->nom_user} a été activé avec le rôle {$roleName}",
            [
                'user_email' => $user->email,
                'role_name' => $roleName,
                'role_id' => $user->role_id,
                'activated_by' => $activatedBy->prenom_user . ' ' . $activatedBy->nom_user,
                'activation_date' => now()->format('d/m/Y H:i')
            ],
            $user->id,
            $activatedBy->id
        );

        self::broadcastNotification($notification);
        return $notification;
    }

    public static function roleAssigned(User $user, $oldRole, $newRole, User $assignedBy)
    {
        $oldRoleName = $oldRole ? $oldRole->libelle : 'Aucun rôle';
        $newRoleName = $newRole ? $newRole->libelle : 'Aucun rôle';

        $notification = Notification::createNotification(
            'role_assigned',
            'Rôle modifié',
            "Le rôle de {$user->prenom_user} {$user->nom_user} a été changé de '{$oldRoleName}' vers '{$newRoleName}'",
            [
                'user_email' => $user->email,
                'old_role' => $oldRoleName,
                'new_role' => $newRoleName,
                'old_role_id' => $oldRole ? $oldRole->id : null,
                'new_role_id' => $newRole ? $newRole->id : null,
                'assigned_by' => $assignedBy->prenom_user . ' ' . $assignedBy->nom_user,
                'assignment_date' => now()->format('d/m/Y H:i')
            ],
            $user->id,
            $assignedBy->id
        );

        self::broadcastNotification($notification);
        return $notification;
    }

    public static function userDeactivated(User $user, User $deactivatedBy)
    {
        $notification = Notification::createNotification(
            'user_deactivated',
            'Compte utilisateur désactivé',
            "Le compte de {$user->prenom_user} {$user->nom_user} a été désactivé",
            [
                'user_email' => $user->email,
                'deactivated_by' => $deactivatedBy->prenom_user . ' ' . $deactivatedBy->nom_user,
                'deactivation_date' => now()->format('d/m/Y H:i')
            ],
            $user->id,
            $deactivatedBy->id
        );

        self::broadcastNotification($notification);
        return $notification;
    }

    public static function passwordReset(User $user, User $resetBy)
    {
        $notification = Notification::createNotification(
            'password_reset',
            'Mot de passe réinitialisé',
            "Le mot de passe de {$user->prenom_user} {$user->nom_user} a été réinitialisé",
            [
                'user_email' => $user->email,
                'reset_by' => $resetBy->prenom_user . ' ' . $resetBy->nom_user,
                'reset_date' => now()->format('d/m/Y H:i')
            ],
            $user->id,
            $resetBy->id
        );

        self::broadcastNotification($notification);
        return $notification;
    }

    private static function broadcastNotification(Notification $notification)
    {
        try {
            // Charger les relations pour l'envoi
            $notification->load(['user', 'triggeredBy']);
            
            // Écrire dans le cache pour SSE
            $cacheKey = 'notifications_stream';
            $existingData = cache()->get($cacheKey, []);
            
            $notificationData = [
                'id' => $notification->id,
                'type' => $notification->type,
                'title' => $notification->title,
                'message' => $notification->message,
                'data' => $notification->data,
                'user' => $notification->user ? [
                    'id' => $notification->user->id,
                    'name' => $notification->user->prenom_user . ' ' . $notification->user->nom_user,
                    'email' => $notification->user->email
                ] : null,
                'triggered_by' => $notification->triggeredBy ? [
                    'id' => $notification->triggeredBy->id,
                    'name' => $notification->triggeredBy->prenom_user . ' ' . $notification->triggeredBy->nom_user
                ] : null,
                'created_at' => $notification->created_at->toISOString(),
                'time_ago' => $notification->time_ago
            ];

            // Ajouter la nouvelle notification au début
            array_unshift($existingData, $notificationData);
            
            // Garder seulement les 50 dernières notifications
            $existingData = array_slice($existingData, 0, 50);
            
            // Mettre en cache pour 1 heure
            cache()->put($cacheKey, $existingData, 3600);

            Log::info('Notification diffusée via SSE', [
                'notification_id' => $notification->id,
                'type' => $notification->type
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la diffusion de notification', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    public static function getRecentNotifications($limit = 20)
    {
        return Notification::with(['user', 'triggeredBy'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'data' => $notification->data,
                    'is_read' => $notification->is_read,
                    'user' => $notification->user ? [
                        'id' => $notification->user->id,
                        'name' => $notification->user->prenom_user . ' ' . $notification->user->nom_user,
                        'email' => $notification->user->email
                    ] : null,
                    'triggered_by' => $notification->triggeredBy ? [
                        'id' => $notification->triggeredBy->id,
                        'name' => $notification->triggeredBy->prenom_user . ' ' . $notification->triggeredBy->nom_user
                    ] : null,
                    'created_at' => $notification->created_at->toISOString(),
                    'time_ago' => $notification->time_ago
                ];
            });
    }

    public static function markAllAsRead()
    {
        return Notification::unread()->update([
            'is_read' => true,
            'read_at' => now()
        ]);
    }

    public static function getUnreadCount()
    {
        return Notification::unread()->count();
    }
}