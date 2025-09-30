<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('indicateurs_campagnes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campagne_id')->constrained('campagnes_medicales')->onDelete('cascade');
            $table->string('indicateur'); // ex: sexe, age, lateralite, enfants_scolarises, budget
            $table->string('sous_indicateur')->nullable(); // ex: M, F, Unilatérale, <15ans
            $table->decimal('valeur', 15, 2); // valeur numérique ou compteur
            $table->text('description')->nullable(); // description optionnelle
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            // Index pour optimiser les recherches
            $table->index(['campagne_id', 'indicateur']);
            $table->index('date_suppression');
        });
    }

    public function down()
    {
        Schema::dropIfExists('indicateurs_campagnes');
    }
};