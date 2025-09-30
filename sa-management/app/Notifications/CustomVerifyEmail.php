<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

class CustomVerifyEmail extends VerifyEmail // Ne PAS implémenter ShouldQueue
{
    public function toMail($notifiable)
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('🔐 Vérification de votre adresse email - SA Management')
            ->greeting('Bonjour ' . $notifiable->prenom_user . ' ' . $notifiable->nom_user . ',')
            ->line('Bienvenue sur le système SA Management !')
            ->line('Pour finaliser la création de votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :')
            ->action('✅ Vérifier mon email', $verificationUrl)
            ->line('**Important :** Après vérification de votre email, vous devrez configurer votre mot de passe et vos questions de sécurité.')
            ->line('Une fois ces étapes terminées, votre compte sera soumis à un administrateur pour activation.')
            ->line('**Ce lien de vérification expirera dans 60 minutes.**')
            ->line('Si vous n\'avez pas créé de compte, aucune action n\'est requise de votre part.')
            ->salutation('Cordialement,<br>L\'équipe SA Management');
    }
}