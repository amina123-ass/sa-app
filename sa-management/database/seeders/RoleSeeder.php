<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run()
    {
        $roles = [
            [
                'libelle' => 'Administrateur Informatique',
                'description' => 'Gestion complète du système'
            ],
            [
                'libelle' => 'Responsable UAS',
                'description' => 'Gestion des campagnes et validation des bénéficiaires'
            ],
            [
                'libelle' => 'Reception',
                'description' => 'Saisie des informations des bénéficiaires'
            ]
            
        ];

        foreach ($roles as $role) {
            Role::create($role);
        }
    }
}