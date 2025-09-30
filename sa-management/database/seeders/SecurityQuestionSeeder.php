<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SecurityQuestion;

class SecurityQuestionSeeder extends Seeder
{
    public function run()
    {
        $questions = [
            "Quel est le nom de votre premier animal de compagnie ?",
            "Dans quelle ville êtes-vous né(e) ?",
            "Quel est le nom de jeune fille de votre mère ?",
            "Quelle est votre couleur préférée ?",
            "Quel est le prénom de votre meilleur ami d'enfance ?",
            "Quel était le nom de votre école primaire ?",
            "Quel est le modèle de votre première voiture ?",
            "Quel est votre plat préféré ?",
            "Dans quelle rue avez-vous grandi ?"
        ];

        foreach ($questions as $question) {
            SecurityQuestion::create(['question' => $question]);
        }
    }
}