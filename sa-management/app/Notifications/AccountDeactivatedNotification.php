<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\User;

class AccountDeactivatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function via($notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Votre compte UPAS a été désactivé')
            ->greeting('Bonjour ' . $this->user->prenom_user . ' ' . $this->user->nom_user . ',')
            ->line('Nous vous informons que votre compte sur le système UPAS a été désactivé par un administrateur.')
            ->line('**Détails :**')
            ->line('• **Email :** ' . $this->user->email)
            ->line('• **Date de désactivation :** ' . now()->format('d/m/Y à H:i'))
            ->line('')
            ->line('Cette désactivation peut être due à :')
            ->line('• Une violation des conditions d\'utilisation')
            ->line('• Une demande de votre part')
            ->line('• Une maintenance du système')
            ->line('• Autres raisons administratives')
            ->line('')
            ->line('Si vous pensez qu\'il s\'agit d\'une erreur ou souhaitez plus d\'informations, veuillez contacter l\'administrateur du système.')
            ->line('Vos données restent sécurisées et seront conservées selon notre politique de confidentialité.')
            ->salutation('Cordialement,<br>L\'équipe UPAS');
    }

    public function toArray($notifiable): array
    {
        return [
            'type' => 'account_deactivated',
            'user_id' => $this->user->id,
            'message' => 'Votre compte a été désactivé par un administrateur',
            'deactivated_at' => now()
        ];
    }
}