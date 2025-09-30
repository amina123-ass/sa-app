<?php
// app/Notifications/ResetPasswordNotification.php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Lang;

class ResetPasswordNotification extends Notification
{
    public $token;

    public function __construct($token)
    {
        $this->token = $token;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        $resetUrl = url(config('app.frontend_url', 'http://localhost:3000') . '/reset-password?token=' . $this->token . '&email=' . urlencode($notifiable->email));

        return (new MailMessage)
            ->subject('Réinitialisation de votre mot de passe - SA Management')
            ->greeting('Bonjour ' . $notifiable->prenom_user . ' ' . $notifiable->nom_user . ' !')
            ->line('Vous recevez cet email car nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.')
            ->action('Réinitialiser le mot de passe', $resetUrl)
            ->line('Ce lien de réinitialisation expirera dans 60 minutes.')
            ->line('Si vous n\'avez pas demandé de réinitialisation de mot de passe, aucune action n\'est requise.')
            ->salutation('Cordialement, L\'équipe SA Management');
    }
}