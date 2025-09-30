<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('campagnes_medicales', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->text('description')->nullable();
            $table->foreignId('type_assistance_id')->constrained('types_assistance')->onDelete('cascade');
            $table->date('date_debut');
            $table->date('date_fin');
            $table->string('lieu')->nullable();
            $table->decimal('budget', 15, 2)->nullable();
            $table->decimal('credit_consomme', 15, 2)->nullable();
            $table->decimal('prix_unitaire', 10, 2)->nullable();
            $table->decimal('besoins_credit', 15, 2)->nullable();
            $table->integer('nombre_participants_prevu')->nullable();
            $table->enum('statut', ['Active', 'Inactive', 'En cours', 'Terminée', 'Annulée'])->default('Active');
            $table->text('commentaires')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            // Index pour améliorer les performances
            $table->index(['type_assistance_id']);
            $table->index(['date_debut', 'date_fin']);
            $table->index('statut');
            $table->index('date_suppression');
            $table->index('created_by');
        });
    }

    public function down()
    {
        Schema::dropIfExists('campagnes_medicales');
    }
};