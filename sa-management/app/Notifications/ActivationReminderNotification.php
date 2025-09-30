<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\User;

class ActivationReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $daysSinceVerification = now()->diffInDays($this->user->email_verified_at);
        
        return (new MailMessage)
            ->subject('Rappel : Votre compte UPAS est en cours de traitement')
            ->greeting('Bonjour ' . $this->user->prenom_user . ' ' . $this->user->nom_user . ',')
            ->line('Nous vous remercions d\'avoir vérifié votre adresse email il y a ' . $daysSinceVerification . ' jour(s).')
            ->line('Votre demande d\'activation de compte est actuellement en cours d\'examen par notre équipe administrative.')
            ->line('')
            ->line('**État actuel de votre compte :**')
            ->line('• ✅ Email vérifié le ' . $this->user->email_verified_at->format('d/m/Y à H:i'))
            ->line('• ⏳ En attente d\'activation par un administrateur')
            ->line('')
            ->line('**Que se passe-t-il maintenant ?**')
            ->line('Notre équipe examine votre demande et vous attribuera le rôle approprié dans le système.')
            ->line('Vous recevrez un email de confirmation dès que votre compte sera activé.')
            ->line('')
            ->line('**Délai habituel :** Les activations sont généralement traitées dans un délai de 24 à 48 heures ouvrables.')
            ->line('')
            ->line('Si vous avez des questions urgentes, vous pouvez contacter notre support à : ' . config('mail.admin_email'))
            ->line('Merci pour votre patience.')
            ->salutation('Cordialement,<br>L\'équipe UPAS');
    }
}