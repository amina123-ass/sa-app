<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('kafalas', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->nullable()->unique();
            
            // Informations du père
            $table->string('nom_pere');
            $table->string('prenom_pere');
            $table->string('cin_pere')->nullable();
            
            // Informations de la mère
            $table->string('nom_mere');
            $table->string('prenom_mere');
            $table->string('cin_mere')->nullable();
            
            // Informations de contact
            $table->string('telephone');
            $table->string('email');
            $table->text('adresse');
            
            // Date de mariage
            $table->date('date_mariage')->nullable();
            
            // Informations de l'enfant
            $table->string('nom_enfant');
            $table->string('prenom_enfant');
            $table->enum('sexe_enfant', ['M', 'F']);
            $table->date('date_naissance_enfant')->nullable();
            $table->string('cin_enfant')->nullable();
            
            // Fichier et commentaires
            $table->string('fichier_pdf')->nullable();
            $table->text('commentaires')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Index pour la recherche
            $table->index(['nom_pere', 'prenom_pere']);
            $table->index(['nom_enfant', 'prenom_enfant']);
            $table->index('reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kafalas');
    }
};