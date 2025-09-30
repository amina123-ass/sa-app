<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Table pour le suivi détaillé des assistances médicales
     */
    public function up(): void
    {
        Schema::create('assistance_medicales_suivi', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('assistance_medicale_id')
                ->constrained('assistance_medicales')
                ->onDelete('cascade')
                ->comment('Assistance médicale suivie');
                
            $table->enum('type_evenement', [
                'creation',
                'modification',
                'validation',
                'rejet',
                'paiement',
                'completion',
                'rappel',
                'feedback',
                'document_ajoute',
                'statut_change'
            ])->comment('Type d\'événement');
            
            $table->text('description')->comment('Description de l\'événement');
            $table->json('donnees_avant')->nullable()->comment('État avant modification (JSON)');
            $table->json('donnees_apres')->nullable()->comment('État après modification (JSON)');
            
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null')
                ->comment('Utilisateur qui a effectué l\'action');
                
            $table->string('ip_address', 45)->nullable()->comment('Adresse IP de l\'utilisateur');
            $table->string('user_agent', 500)->nullable()->comment('User agent du navigateur');
            
            $table->timestamps();
            
            // Index
            $table->index(['assistance_medicale_id', 'created_at'], 'idx_assistance_date');
            $table->index(['type_evenement', 'created_at'], 'idx_type_date');
            $table->index(['user_id', 'created_at'], 'idx_user_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistance_medicales_suivi');
    }
};