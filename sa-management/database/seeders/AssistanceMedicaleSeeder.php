<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AssistanceMedicaleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Insérer les états de don de base
        DB::table('etat_dones')->insert([
            [
                'libelle' => 'En attente',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Validé',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'En cours de traitement',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Livré',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Terminé',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Annulé',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Rejeté',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);

        // Insérer les types d'assistance de base
        DB::table('types_assistance')->insert([
            [
                'libelle' => 'Lunettes',
                'description' => 'Lunettes de vue et solaires',
                'prix_unitaire' => 190.00,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Appareils Auditifs',
                'description' => 'Appareils auditifs et accessoires',
                'prix_unitaire' => 2050.00,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Transport Médical',
                'description' => 'Transport pour consultations médicales',
                'prix_unitaire' => null,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Matériel Orthopédique',
                'description' => 'Fauteuils roulants, béquilles, cannes',
                'prix_unitaire' => null,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);

        // Insérer les situations de base
        DB::table('situations')->insert([
            [
                'libelle' => 'Nouveau dossier',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Dossier en cours',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Dossier urgent',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Dossier complété',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Dossier archivé',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);

        // Insérer les natures de don
        DB::table('nature_dones')->insert([
            [
                'libelle' => 'Don ponctuel',
                'duree' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Don récurrent',
                'duree' => 365,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'libelle' => 'Aide d\'urgence',
                'duree' => 30,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);

        // Insérer un template de reçu de base
        DB::table('templates_documents')->insert([
            [
                'nom' => 'Reçu d\'assistance médicale standard',
                'type' => 'recu',
                'type_assistance_id' => null,
                'contenu_html' => '
                <div class="recu">
                    <h1>REÇU D\'ASSISTANCE MÉDICALE</h1>
                    <p>Numéro: {{numero_assistance}}</p>
                    <p>Date: {{date_assistance}}</p>
                    <p>Bénéficiaire: {{beneficiaire_nom}} {{beneficiaire_prenom}}</p>
                    <p>Type d\'assistance: {{type_assistance}}</p>
                    <p>Montant: {{montant}} DH</p>
                    <p>Observations: {{observations}}</p>
                </div>',
                'contenu_css' => '
                .recu { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; text-align: center; }
                p { margin: 10px 0; }',
                'variables_disponibles' => json_encode([
                    'numero_assistance',
                    'date_assistance',
                    'beneficiaire_nom',
                    'beneficiaire_prenom',
                    'type_assistance',
                    'montant',
                    'observations'
                ]),
                'actif' => true,
                'par_defaut' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}