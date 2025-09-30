<?php
// app/Notifications/AdminUserEmailVerified.php - VERSION CORRIGÉE

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\User;

// SUPPRESSION TEMPORAIRE DE ShouldQueue pour tester
class AdminUserEmailVerified extends Notification // implements ShouldQueue
{
    use Queueable;

    protected $user;

    public function __construct(User $user)
    {
        $this->user = $user;
        // Configuration queue si nécessaire
        $this->delay(now()->addSeconds(5)); // Délai de 5 secondes
    }

    public function via($notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('🔔 Nouvel utilisateur - Email vérifié - Action requise')
            ->greeting('Bonjour Administrateur,')
            ->line('Un nouvel utilisateur a vérifié son adresse email et attend l\'activation de son compte.')
            ->line('**Détails de l\'utilisateur :**')
            ->line('• **Nom :** ' . $this->user->nom_user)
            ->line('• **Prénom :** ' . $this->user->prenom_user)
            ->line('• **Email :** ' . $this->user->email)
            ->line('• **Téléphone :** ' . ($this->user->tel_user ?: 'Non renseigné'))
            ->line('• **Adresse :** ' . ($this->user->adresse_user ?: 'Non renseignée'))
            ->line('• **Date d\'inscription :** ' . $this->user->created_at->format('d/m/Y à H:i'))
            ->line('• **Email vérifié le :** ' . $this->user->email_verified_at->format('d/m/Y à H:i'))
            ->line('')
            ->line('⚠️ **Action requise :** Vous devez activer manuellement ce compte pour permettre à l\'utilisateur de se connecter.')
            ->action('Activer le compte', url('/admin/users/' . $this->user->id . '/activate'))
            ->line('Vous pouvez également vous connecter à l\'interface d\'administration pour gérer cet utilisateur.')
            ->line('Merci de traiter cette demande dans les plus brefs délais.')
            ->salutation('Cordialement,<br>Système SA Management');
    }

    public function toArray($notifiable): array
    {
        return [
            'type' => 'user_email_verified',
            'user_id' => $this->user->id,
            'user_name' => $this->user->nom_user . ' ' . $this->user->prenom_user,
            'user_email' => $this->user->email,
            'user_phone' => $this->user->tel_user,
            'verified_at' => $this->user->email_verified_at,
            'message' => 'Nouvel utilisateur avec email vérifié - Activation requise',
            'action_url' => url('/admin/users/' . $this->user->id . '/activate')
        ];
    }
}

// =================================================================
// app/Models/User.php - MÉTHODE CORRIGÉE

// =================================================================
// COMMANDES À EXÉCUTER POUR CORRIGER LES PROBLÈMES

/*
1. Vider la cache de configuration :
php artisan config:clear
php artisan config:cache

2. Créer les tables de queue si elles n'existent pas :
php artisan queue:table
php artisan migrate

3. Tester l'envoi d'email :
php artisan tinker
>>> Mail::raw('Test email', function($msg) { $msg->to('aminatitoua342@gmail.com')->subject('Test'); });

4. Traiter la queue (dans un terminal séparé) :
php artisan queue:work --verbose

5. Vérifier les logs :
tail -f storage/logs/laravel.log

6. Test rapide de notification :
php artisan tinker
>>> $user = App\Models\User::first();
>>> $user->notify(new App\Notifications\AdminUserEmailVerified($user));
*/