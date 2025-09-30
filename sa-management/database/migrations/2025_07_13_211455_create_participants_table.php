<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('participants', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 100);
            $table->string('prenom', 100);
            $table->string('adresse', 255);
            $table->string('telephone', 20);
            $table->string('email', 191)->nullable();
            $table->date('date_naissance')->nullable();
            $table->enum('sexe', ['M', 'F'])->nullable();
            $table->string('cin', 20)->nullable();
            $table->enum('statut', ['en_attente', 'oui', 'non', 'refuse', 'répondu', 'ne repond pas', 'non contacté'])->default('non contacté');
            $table->text('commentaire')->nullable();
            
            $table->foreignId('campagne_id')->constrained('campagnes_medicales')->onDelete('cascade');
            
            $table->timestamp('date_appel')->nullable();
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();

            // Index
            $table->index(['nom', 'prenom'], 'idx_nom_prenom');
            $table->index(['telephone'], 'idx_telephone');
            $table->index(['campagne_id', 'statut'], 'idx_campagne_statut');
            $table->index(['statut'], 'idx_statut');
            $table->index(['date_appel'], 'idx_date_appel');
            $table->index('date_suppression');
        });
    }

    public function down()
    {
        Schema::dropIfExists('participants');
    }
};