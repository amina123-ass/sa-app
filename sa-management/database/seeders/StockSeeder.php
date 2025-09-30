<?php
// database/seeders/StockSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Stock;
use App\Models\TypeAssistance;

class StockSeeder extends Seeder
{
    public function run()
    {
        $typeAssistances = TypeAssistance::all();
        
        if ($typeAssistances->isEmpty()) {
            $this->command->warn('Aucun type d\'assistance trouvé. Veuillez d\'abord exécuter le seeder des types d\'assistance.');
            return;
        }

        $stocks = [
            // Médicaments
            [
                'designation' => 'Paracétamol 500mg',
                'code_article' => 'MED001',
                'categorie' => 'medicaments',
                'quantite_totale' => 1000,
                'quantite_utilisee' => 150,
                'seuil_alerte' => 100,
                'seuil_critique' => 50,
                'prix_unitaire' => 2.50,
                'unite_mesure' => 'boîte',
                'date_expiration' => now()->addMonths(18),
                'fournisseur' => 'Pharma Maroc',
                'localisation' => 'Pharmacie - Étagère A1'
            ],
            [
                'designation' => 'Amoxicilline 250mg',
                'code_article' => 'MED002',
                'categorie' => 'medicaments',
                'quantite_totale' => 500,
                'quantite_utilisee' => 80,
                'seuil_alerte' => 50,
                'seuil_critique' => 25,
                'prix_unitaire' => 15.00,
                'unite_mesure' => 'boîte',
                'date_expiration' => now()->addMonths(12),
                'fournisseur' => 'Sanofi Maroc',
                'localisation' => 'Pharmacie - Étagère A2'
            ],
            [
                'designation' => 'Insuline Rapide',
                'code_article' => 'MED003',
                'categorie' => 'medicaments',
                'quantite_totale' => 200,
                'quantite_utilisee' => 180,
                'seuil_alerte' => 30,
                'seuil_critique' => 15,
                'prix_unitaire' => 45.00,
                'unite_mesure' => 'flacon',
                'date_expiration' => now()->addMonths(6),
                'fournisseur' => 'Novo Nordisk',
                'localisation' => 'Pharmacie - Réfrigérateur 1'
            ],

            // Dispositifs médicaux
            [
                'designation' => 'Lunettes correctrices',
                'code_article' => 'DIS001',
                'categorie' => 'dispositifs_medicaux',
                'quantite_totale' => 300,
                'quantite_utilisee' => 45,
                'seuil_alerte' => 20,
                'seuil_critique' => 10,
                'prix_unitaire' => 250.00,
                'unite_mesure' => 'paire',
                'fournisseur' => 'Optique Vision',
                'localisation' => 'Stock Optique'
            ],
            [
                'designation' => 'Appareils auditifs',
                'code_article' => 'DIS002',
                'categorie' => 'dispositifs_medicaux',
                'quantite_totale' => 100,
                'quantite_utilisee' => 85,
                'seuil_alerte' => 15,
                'seuil_critique' => 8,
                'prix_unitaire' => 1200.00,
                'unite_mesure' => 'unité',
                'fournisseur' => 'Audio Tech',
                'localisation' => 'Stock Audiologie'
            ],
            [
                'designation' => 'Prothèses dentaires',
                'code_article' => 'DIS003',
                'categorie' => 'dispositifs_medicaux',
                'quantite_totale' => 50,
                'quantite_utilisee' => 12,
                'seuil_alerte' => 5,
                'seuil_critique' => 2,
                'prix_unitaire' => 800.00,
                'unite_mesure' => 'unité',
                'fournisseur' => 'Dental Plus',
                'localisation' => 'Stock Dentaire'
            ],

            // Consommables
            [
                'designation' => 'Seringues jetables 5ml',
                'code_article' => 'CON001',
                'categorie' => 'consommables',
                'quantite_totale' => 5000,
                'quantite_utilisee' => 1200,
                'seuil_alerte' => 500,
                'seuil_critique' => 200,
                'prix_unitaire' => 0.50,
                'unite_mesure' => 'unité',
                'fournisseur' => 'Medical Supply',
                'localisation' => 'Stock Consommables - Zone B'
            ],
            [
                'designation' => 'Gants d\'examen',
                'code_article' => 'CON002',
                'categorie' => 'consommables',
                'quantite_totale' => 2000,
                'quantite_utilisee' => 1850,
                'seuil_alerte' => 200,
                'seuil_critique' => 100,
                'prix_unitaire' => 0.20,
                'unite_mesure' => 'paire',
                'fournisseur' => 'SafeGuard',
                'localisation' => 'Stock Consommables - Zone A'
            ],
            [
                'designation' => 'Compresses stériles',
                'code_article' => 'CON003',
                'categorie' => 'consommables',
                'quantite_totale' => 1000,
                'quantite_utilisee' => 300,
                'seuil_alerte' => 100,
                'seuil_critique' => 50,
                'prix_unitaire' => 1.50,
                'unite_mesure' => 'paquet',
                'fournisseur' => 'Sterile Pro',
                'localisation' => 'Stock Consommables - Zone C'
            ],

            // Équipements
            [
                'designation' => 'Tensiomètres électroniques',
                'code_article' => 'EQU001',
                'categorie' => 'equipements',
                'quantite_totale' => 25,
                'quantite_utilisee' => 3,
                'seuil_alerte' => 5,
                'seuil_critique' => 2,
                'prix_unitaire' => 350.00,
                'unite_mesure' => 'unité',
                'fournisseur' => 'MedTech Solutions',
                'localisation' => 'Stock Équipements'
            ],
            [
                'designation' => 'Glucomètres',
                'code_article' => 'EQU002',
                'categorie' => 'equipements',
                'quantite_totale' => 80,
                'quantite_utilisee' => 65,
                'seuil_alerte' => 10,
                'seuil_critique' => 5,
                'prix_unitaire' => 120.00,
                'unite_mesure' => 'unité',
                'fournisseur' => 'Diabetes Care',
                'localisation' => 'Stock Équipements'
            ],
            [
                'designation' => 'Fauteuils roulants',
                'code_article' => 'EQU003',
                'categorie' => 'equipements',
                'quantite_totale' => 15,
                'quantite_utilisee' => 12,
                'seuil_alerte' => 3,
                'seuil_critique' => 1,
                'prix_unitaire' => 2500.00,
                'unite_mesure' => 'unité',
                'fournisseur' => 'Mobility Plus',
                'localisation' => 'Entrepôt Principal'
            ]
        ];

        foreach ($stocks as $stockData) {
            // Associer à un type d'assistance approprié
            $typeAssistance = $typeAssistances->first();
            $stockData['type_assistance_id'] = $typeAssistance->id;
            
            Stock::create($stockData);
        }

        $this->command->info('Stock initial créé avec succès.');
    }
} 