<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('campagne_beneficiaires', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('campagne_id')->constrained('campagnes_medicales')->onDelete('cascade');
            $table->foreignId('beneficiaire_id')->constrained('beneficiaires')->onDelete('cascade');
            
            $table->enum('statut', ['en_attente', 'valide', 'refuse', 'traite'])->default('en_attente');
            $table->text('notes')->nullable();
            $table->timestamp('date_inscription')->nullable();
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            // Empêcher les doublons
            $table->unique(['campagne_id', 'beneficiaire_id'], 'unique_campagne_beneficiaire');
            
            // Index pour optimiser les recherches
            $table->index('campagne_id');
            $table->index('beneficiaire_id');
            $table->index('statut');
            $table->index('date_suppression');
        });
    }

    public function down()
    {
        Schema::dropIfExists('campagne_beneficiaires');
    }
};