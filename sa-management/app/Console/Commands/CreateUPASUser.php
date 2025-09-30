<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class CreateUPASUser extends Command
{
    protected $signature = 'upas:create-user 
                            {--email=marie.dupont@upas.dz : Email de l\'utilisateur}
                            {--password=upas123 : Mot de passe}
                            {--nom=Dupont : Nom de famille}
                            {--prenom=Marie : Prénom}';

    protected $description = 'Créer un compte Responsable UPAS';

    public function handle()
    {
        $email = $this->option('email');
        $password = $this->option('password');
        $nom = $this->option('nom');
        $prenom = $this->option('prenom');

        // Vérifier le rôle
        $upasRole = Role::where('libelle', 'Responsable UPAS')->first();
        
        if (!$upasRole) {
            $this->error("Le rôle 'Responsable UPAS' n'existe pas !");
            $this->info("Exécutez d'abord: php artisan db:seed --class=RoleSeeder");
            return 1;
        }

        // Supprimer l'ancien compte s'il existe
        $existingUser = User::where('email', $email)->first();
        if ($existingUser) {
            $existingUser->forceDelete(); // Suppression définitive
            $this->info("Ancien compte supprimé");
        }

        // Créer le nouveau compte
        $user = User::create([
            'nom_user' => $nom,
            'prenom_user' => $prenom,
            'email' => $email,
            'password' => Hash::make($password),
            'tel_user' => '0555123456',
            'adresse_user' => 'Bureau UPAS, Alger',
            'email_verified_at' => now(),
            'activer_compte' => true,
            'role_id' => $upasRole->id,
        ]);

        $this->info("✅ Compte Responsable UPAS créé avec succès !");
        $this->table(
            ['Champ', 'Valeur'],
            [
                ['Email', $user->email],
                ['Mot de passe', $password],
                ['Nom complet', $user->prenom_user . ' ' . $user->nom_user],
                ['Rôle', $upasRole->libelle],
                ['Compte activé', $user->activer_compte ? 'Oui' : 'Non'],
                ['Email vérifié', $user->email_verified_at ? 'Oui' : 'Non'],
            ]
        );

        return 0;
    }
}