<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Beneficiaire;
use App\Models\CampagneMedicale;
use App\Models\AssistanceMedicale;
use App\Models\Situation;
use App\Models\TypeAssistance;
use App\Models\EtatDone;

class UpasTestDataSeeder extends Seeder
{
    public function run()
    {
        // Créer des bénéficiaires de test
        $situations = Situation::whereNull('date_suppression')->get();
        $situationIds = $situations->pluck('id')->toArray();
        
        $beneficiaires = [
            [
                'nom' => 'BENALI',
                'prenom' => 'Ahmed',
                'date_naissance' => '1970-05-15',
                'tel' => '0661234567',
                'adresse' => '123 Rue de la Paix, Alger',
                'situation_id' => $situationIds[0] ?? null
            ],
            [
                'nom' => 'KADDOUR',
                'prenom' => 'Fatima',
                'date_naissance' => '1985-12-03',
                'tel' => '0772345678',
                'adresse' => '456 Avenue Mohamed V, Oran',
                'situation_id' => $situationIds[1] ?? null
            ],
            [
                'nom' => 'CHERIF',
                'prenom' => 'Omar',
                'date_naissance' => '1990-08-22',
                'tel' => '0553456789',
                'adresse' => '789 Boulevard de l\'Indépendance, Constantine',
                'situation_id' => $situationIds[2] ?? null
            ],
            [
                'nom' => 'HASSANI',
                'prenom' => 'Aicha',
                'date_naissance' => '1975-03-10',
                'tel' => '0664567890',
                'adresse' => '321 Rue des Martyrs, Annaba',
                'situation_id' => $situationIds[0] ?? null
            ],
            [
                'nom' => 'BOULAHBAL',
                'prenom' => 'Youcef',
                'date_naissance' => '1982-11-18',
                'tel' => '0775678901',
                'adresse' => '654 Avenue de la République, Sétif',
                'situation_id' => $situationIds[1] ?? null
            ]
        ];

        foreach ($beneficiaires as $beneficiaire) {
            Beneficiaire::create($beneficiaire);
        }

        // Créer des campagnes de test
        $campagnes = [
            [
                'libelle' => 'Campagne Lunettes 2024',
                'date_debut' => '2024-01-01',
                'date_fin' => '2024-12-31',
                'description' => 'Distribution de lunettes médicales pour l\'année 2024'
            ],
            [
                'libelle' => 'Aide Transport Ramadan 2024',
                'date_debut' => '2024-03-01',
                'date_fin' => '2024-04-30',
                'description' => 'Distribution de vignettes de transport pendant le mois de Ramadan'
            ],
            [
                'libelle' => 'Appareillage Orthopédique Été 2024',
                'date_debut' => '2024-06-01',
                'date_fin' => '2024-08-31',
                'description' => 'Distribution d\'équipements orthopédiques pour la période estivale'
            ]
        ];

        $createdCampagnes = [];
        foreach ($campagnes as $campagne) {
            $createdCampagnes[] = CampagneMedicale::create($campagne);
        }

        // Créer des assistances de test
        $beneficiairesIds = Beneficiaire::whereNull('date_suppression')->pluck('id')->toArray();
        $typesAssistance = TypeAssistance::whereNull('date_suppression')->get();
        $etatsId = EtatDone::whereNull('date_suppression')->pluck('id')->toArray();

        $assistances = [
            [
                'type_assistance_id' => $typesAssistance->where('libelle', 'Lunette')->first()->id ?? 1,
                'details_type_assistance_id' => null,
                'campagne_id' => $createdCampagnes[0]->id,
                'beneficiaire_id' => $beneficiairesIds[0],
                'date_assistance' => '2024-02-15',
                'montant' => 5000.00,
                'observations' => 'Lunettes de vue correction myopie',
                'etat_don_id' => $etatsId[0] ?? 1
            ],
            [
                'type_assistance_id' => $typesAssistance->where('libelle', 'Vignettes transports')->first()->id ?? 2,
                'details_type_assistance_id' => null,
                'campagne_id' => $createdCampagnes[1]->id,
                'beneficiaire_id' => $beneficiairesIds[1],
                'date_assistance' => '2024-03-10',
                'montant' => 1500.00,
                'observations' => 'Vignettes transport mensuel',
                'etat_don_id' => $etatsId[0] ?? 1
            ],
            [
                'type_assistance_id' => $typesAssistance->where('libelle', 'Appareillage orthopédique')->first()->id ?? 3,
                'details_type_assistance_id' => null,
                'campagne_id' => $createdCampagnes[2]->id,
                'beneficiaire_id' => $beneficiairesIds[2],
                'date_assistance' => '2024-06-20',
                'montant' => 15000.00,
                'observations' => 'Fauteuil roulant manuel',
                'etat_don_id' => $etatsId[0] ?? 1
            ],
            [
                'type_assistance_id' => $typesAssistance->where('libelle', 'Assistance médicale')->first()->id ?? 4,
                'details_type_assistance_id' => null,
                'campagne_id' => null,
                'beneficiaire_id' => $beneficiairesIds[3],
                'date_assistance' => '2024-07-05',
                'montant' => 8000.00,
                'observations' => 'Aide pour consultation spécialisée',
                'etat_don_id' => $etatsId[0] ?? 1
            ],
            [
                'type_assistance_id' => $typesAssistance->where('libelle', 'Lunette')->first()->id ?? 1,
                'details_type_assistance_id' => null,
                'campagne_id' => $createdCampagnes[0]->id,
                'beneficiaire_id' => $beneficiairesIds[4],
                'date_assistance' => '2024-08-12',
                'montant' => 4500.00,
                'observations' => 'Lunettes progressives',
                'etat_don_id' => $etatsId[1] ?? 1
            ]
        ];

        foreach ($assistances as $assistance) {
            AssistanceMedicale::create($assistance);
        }

        echo "✅ Données de test UPAS créées avec succès !\n";
        echo "- " . count($beneficiaires) . " bénéficiaires créés\n";
        echo "- " . count($campagnes) . " campagnes créées\n";
        echo "- " . count($assistances) . " assistances créées\n";
    }
}