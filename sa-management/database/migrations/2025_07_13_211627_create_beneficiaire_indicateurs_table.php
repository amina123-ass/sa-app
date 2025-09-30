<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('beneficiaire_indicateurs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('beneficiaire_id')->constrained('beneficiaires')->onDelete('cascade');
            $table->string('indicateur'); // ex: lateralite, enfants_scolarises
            $table->string('sous_indicateur')->nullable(); // ex: Unilatérale, Bilatérale, Enfant scolarisé
            $table->string('valeur')->nullable(); // valeur libre
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            // Index pour optimiser les recherches
            $table->index(['beneficiaire_id', 'indicateur']);
            $table->index('date_suppression');
        });
    }

    public function down()
    {
        Schema::dropIfExists('beneficiaire_indicateurs');
    }
};