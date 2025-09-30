<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class UpasSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('🚀 Création des données UPAS...');
        
        // Créer les bénéficiaires
        $this->call(PersonneSeeder::class);
        
        // Créer les campagnes médicales
        $this->call(CampagneSeeder::class);
        
        // Créer les assistances médicales
        $this->call(AssistanceSeeder::class);
        
        $this->command->info('✅ Données UPAS créées avec succès !');
        
        // Résumé final
        $this->command->info('');
        $this->command->info('📊 RÉSUMÉ DES DONNÉES CRÉÉES:');
        $this->command->table(['Entité', 'Nombre'], [
            ['Bénéficiaires', \App\Models\Personne::count()],
            ['Campagnes médicales', \App\Models\CampagneMedicale::count()],
            ['Assistances médicales', \App\Models\AssistanceMedicale::count()],
            ['Types d\'assistance', \App\Models\TypeAssistance::count()],
            ['Détails types assistance', \App\Models\DetailsTypeAssistance::count()],
            ['Situations', \App\Models\Situation::count()],
            ['Utilisateurs système', \App\Models\User::count()]
        ]);
    }
}