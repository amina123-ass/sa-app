<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;

class AdminSeeder extends Seeder
{
    public function run()
    {
        $adminRole = Role::where('libelle', 'Administrateur Informatique')->first();
        
        User::create([
            'nom_user' => 'Admin',
            'prenom_user' => 'System',
            'email' => 'admin@gmail.com',
            'password' => 'admin',
            'tel_user' => '0123456789',
            'adresse_user' => 'Adresse Admin',
            'email_verified_at' => now(),
            'activer_compte' => true,
            'role_id' => $adminRole->id,
        ]);
    }
}