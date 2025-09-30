<?php
// =================================================================
// FICHIER : app/Notifications/AccountActivatedNotification.php
// =================================================================

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Log;

class AccountActivatedNotification extends Notification // Retirer ShouldQueue temporairement pour test
{
    use Queueable;

    protected $user;
    protected $role;
    protected $generatedPassword;

    public function __construct(User $user, Role $role, $generatedPassword = null)
    {
        $this->user = $user;
        $this->role = $role;
        $this->generatedPassword = $generatedPassword;
        
        Log::info('AccountActivatedNotification créée', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'role' => $role->libelle,
            'has_password' => $generatedPassword ? true : false
        ]);
    }

    public function via($notifiable): array
    {
        return ['mail']; // Seulement mail pour le moment, ajouter 'database' après test
    }

    public function toMail($notifiable): MailMessage
    {
        Log::info('Génération du mail d\'activation', [
            'user_id' => $this->user->id,
            'user_email' => $this->user->email
        ]);
        
        $loginUrl = env('FRONTEND_URL', 'http://localhost:3000') . '/login';
        
        $message = (new MailMessage)
            ->subject('🎉 Votre compte UPAS a été activé !')
            ->greeting('Bonjour ' . $this->user->prenom_user . ' ' . $this->user->nom_user . ',')
            ->line('Excellente nouvelle ! Votre compte sur le système UPAS a été activé par un administrateur.')
            ->line('')
            ->line('**📋 Détails de votre compte :**')
            ->line('• **Email :** ' . $this->user->email)
            ->line('• **Rôle assigné :** ' . $this->role->libelle)
            ->line('• **Date d\'activation :** ' . now()->format('d/m/Y à H:i'));

        if ($this->generatedPassword) {
            $message->line('')
                ->line('🔐 **Vos identifiants de connexion :**')
                ->line('• **Email :** ' . $this->user->email)
                ->line('• **Mot de passe temporaire :** ' . $this->generatedPassword)
                ->line('')
                ->line('⚠️ **Important :** Pour votre sécurité, nous vous recommandons fortement de changer ce mot de passe temporaire lors de votre première connexion.');
        }

        $message->line('')
            ->action('🚀 Se connecter maintenant', $loginUrl)
            ->line('')
            ->line('✅ **Vous pouvez maintenant :**')
            ->line('• Accéder à toutes les fonctionnalités correspondant à votre rôle')
            ->line('• Consulter et modifier votre profil')
            ->line('• Utiliser tous les modules du système UPAS')
            ->line('')
            ->line('Si vous avez des questions ou rencontrez des difficultés, n\'hésitez pas à contacter l\'équipe support.')
            ->line('')
            ->line('**Bienvenue dans le système UPAS !** 🎊')
            ->salutation('Cordialement,<br>L\'équipe UPAS');

        return $message;
    }

    public function toArray($notifiable): array
    {
        return [
            'type' => 'account_activated',
            'user_id' => $this->user->id,
            'role' => $this->role->libelle,
            'message' => 'Votre compte a été activé et vous pouvez maintenant vous connecter',
            'password_generated' => $this->generatedPassword ? true : false,
            'activated_at' => now(),
            'login_url' => env('FRONTEND_URL', 'http://localhost:3000') . '/login'
        ];
    }
}