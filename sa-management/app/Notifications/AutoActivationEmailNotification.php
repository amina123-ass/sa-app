<?php
// app/Notifications/AutoActivationEmailNotification.php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use App\Models\User;

class AutoActivationEmailNotification extends Notification
{
    use Queueable;

    private $user;
    private $autoActivationUrl;

    public function __construct(User $user, $autoActivationUrl)
    {
        $this->user = $user;
        $this->autoActivationUrl = $autoActivationUrl;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('🎉 Activez votre compte UPAS en un clic !')
            ->greeting('Bonjour ' . $this->user->prenom_user . ' ' . $this->user->nom_user . ',')
            ->line('🎊 **Excellente nouvelle !** Votre compte UPAS est prêt à être activé.')
            ->line('')
            ->line('✨ **Activation en un seul clic** - Cliquez simplement sur le bouton ci-dessous pour activer automatiquement votre compte :')
            ->action('🚀 ACTIVER MON COMPTE', $this->autoActivationUrl)
            ->line('')
            ->line('🔹 **Ce qui va se passer :**')
            ->line('• Votre compte sera activé instantanément')
            ->line('• Un rôle vous sera automatiquement assigné')
            ->line('• Vous recevrez vos identifiants de connexion par email')
            ->line('• Vous pourrez vous connecter immédiatement')
            ->line('')
            ->line('🔗 **Si le bouton ne fonctionne pas, copiez ce lien :**')
            ->line($this->autoActivationUrl)
            ->line('')
            ->line('🛡️ **Sécurité :** Ce lien est unique et sécurisé. Un seul clic suffit !')
            ->line('')
            ->line('❓ **Questions ?** Notre équipe support est là pour vous aider.')
            ->line('')
            ->line('⚠️ Si vous n\'avez pas demandé cette activation, ignorez cet email.')
            ->salutation('À très bientôt sur UPAS ! 🌟<br>L\'équipe UPAS');
    }
}

// app/Notifications/AutoActivationSuccessNotification.php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use App\Models\User;
use App\Models\Role;

class AutoActivationSuccessNotification extends Notification
{
    use Queueable;

    private $user;
    private $role;
    private $temporaryPassword;

    public function __construct(User $user, Role $role, $temporaryPassword)
    {
        $this->user = $user;
        $this->role = $role;
        $this->temporaryPassword = $temporaryPassword;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('✅ Compte UPAS activé - Vos identifiants de connexion')
            ->greeting('Félicitations ' . $this->user->prenom_user . ' ' . $this->user->nom_user . ' ! 🎉')
            ->line('🎊 **Votre compte UPAS a été activé avec succès !**')
            ->line('')
            ->line('🔑 **Vos identifiants de connexion :**')
            ->line('')
            ->line('**📧 Email :** ' . $this->user->email)
            ->line('**🔐 Mot de passe temporaire :** `' . $this->temporaryPassword . '`')
            ->line('**👤 Rôle assigné :** ' . $this->role->libelle)
            ->line('')
            ->action('🚀 SE CONNECTER MAINTENANT', env('FRONTEND_URL', 'http://localhost:3000') . '/login')
            ->line('')
            ->line('⚠️ **Important :** Changez votre mot de passe lors de votre première connexion pour sécuriser votre compte.')
            ->line('')
            ->line('🌟 **Bienvenue dans l\'équipe UPAS !**')
            ->line('Vous avez maintenant accès à toutes les fonctionnalités de votre rôle.')
            ->line('')
            ->line('❓ **Besoin d\'aide ?** Notre équipe support est disponible pour vous accompagner.')
            ->salutation('Bon travail ! 💙<br>L\'équipe UPAS');
    }
}