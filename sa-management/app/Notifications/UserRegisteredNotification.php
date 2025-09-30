<?php
// app/Notifications/UserRegisteredNotification.php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use App\Models\User;

class UserRegisteredNotification extends Notification
{
    use Queueable;

    private $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        // Générer le token sécurisé pour l'activation
        $token = sha1($this->user->email . $this->user->created_at . config('app.key'));
        
        // URL d'activation publique (ne nécessite pas de connexion)
        $activationUrl = env('APP_URL', 'http://localhost:8000') . '/api/users/' . $this->user->id . '/activate/' . $token;
        
        return (new MailMessage)
            ->subject('🎉 Bienvenue dans le système UPAS - Activez votre compte')
            ->greeting('Bonjour ' . $this->user->prenom_user . ' ' . $this->user->nom_user . ',')
            ->line('🎊 Félicitations ! Votre compte UPAS a été créé avec succès.')
            ->line('📧 Votre adresse email a été vérifiée.')
            ->line('')
            ->line('🔑 **Dernière étape** : Pour finaliser l\'activation de votre compte et accéder au système, cliquez sur le bouton ci-dessous :')
            ->action('🚀 Activer mon compte maintenant', $activationUrl)
            ->line('')
            ->line('✅ **Ce que cette activation vous permettra :**')
            ->line('• Choisir votre rôle dans le système')
            ->line('• Recevoir vos identifiants de connexion')
            ->line('• Accéder immédiatement au système UPAS')
            ->line('')
            ->line('🔗 **Lien direct (si le bouton ne fonctionne pas) :**')
            ->line($activationUrl)
            ->line('')
            ->line('🛡️ **Sécurité :** Ce lien est unique, sécurisé et ne nécessite pas de connexion.')
            ->line('')
            ->line('❓ **Besoin d\'aide ?** Contactez l\'équipe support si vous rencontrez des difficultés.')
            ->line('')
            ->line('⚠️ Si vous n\'avez pas demandé la création de ce compte, veuillez ignorer cet email.')
            ->salutation('Cordialement,<br>L\'équipe UPAS 💙');
    }
}