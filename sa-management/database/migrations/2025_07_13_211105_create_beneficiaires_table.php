<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('beneficiaires', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('prenom');
            $table->enum('sexe', ['M', 'F']);
            $table->date('date_naissance')->nullable();
            $table->text('adresse');
            $table->string('telephone');
            $table->string('email')->nullable();
            $table->string('cin')->nullable();
            $table->text('commentaire')->nullable();
            $table->date('date_demande')->default(now());
            
            // Relations
            $table->foreignId('campagne_id')->nullable()->constrained('campagnes_medicales')->onDelete('set null');
            $table->foreignId('type_assistance_id')->constrained('types_assistance')->onDelete('cascade');
            
            // Champs spécifiques
            $table->boolean('hors_campagne')->default(false);
            $table->boolean('a_beneficie')->default(false);
            $table->enum('lateralite', ['Unilatérale', 'Bilatérale'])->nullable();
            
            
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            // Index pour améliorer les performances
            $table->index(['campagne_id']);
            $table->index(['type_assistance_id']);
            $table->index(['nom', 'prenom']);
            $table->index('telephone');
            $table->index('hors_campagne');
            $table->index('date_suppression');
            $table->index('date_demande');
            $table->index('a_beneficie');
        });
    }

    public function down()
    {
        Schema::dropIfExists('beneficiaires');
    }
};
