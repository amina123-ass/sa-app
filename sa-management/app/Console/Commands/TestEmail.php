<?php
// app/Console/Commands/TestEmail.php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class TestEmail extends Command
{
    protected $signature = 'email:test {email}';
    protected $description = 'Test l\'envoi d\'email de vérification';

    public function handle()
    {
        $email = $this->argument('email');
        
        $this->info("Test de l'envoi d'email à : $email");
        
        try {
            // Vérifier la configuration
            $this->info('Configuration MAIL:');
            $this->info('Host: ' . config('mail.mailers.smtp.host'));
            $this->info('Port: ' . config('mail.mailers.smtp.port'));
            $this->info('Username: ' . config('mail.mailers.smtp.username'));
            $this->info('From: ' . config('mail.from.address'));
            
            // Trouver ou créer un utilisateur de test
            $user = User::where('email', $email)->first();
            
            if (!$user) {
                $user = User::create([
                    'nom_user' => 'Test',
                    'prenom_user' => 'User',
                    'email' => $email,
                    'tel_user' => '123456789',
                    'adresse_user' => 'Test Address'
                ]);
                $this->info("Utilisateur de test créé: $email");
            }
            
            // Envoyer l'email de vérification
            $user->sendEmailVerificationNotification();
            
            $this->info('✅ Email de vérification envoyé avec succès !');
            
            // Afficher l'URL de vérification pour debug
            $verificationUrl = url('/api/email/verify/' . $user->id . '/' . sha1($user->email));
            $this->info("URL de vérification: $verificationUrl");
            
        } catch (\Exception $e) {
            $this->error('❌ Erreur lors de l\'envoi: ' . $e->getMessage());
            Log::error('Test email failed', ['error' => $e->getMessage()]);
        }
    }
}