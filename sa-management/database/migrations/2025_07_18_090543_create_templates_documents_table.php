<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Templates pour la génération automatique de documents (reçus, attestations, etc.)
     */
    public function up(): void
    {
        Schema::create('templates_documents', function (Blueprint $table) {
            $table->id();
            
            $table->string('nom', 255)->comment('Nom du template');
            $table->string('type', 100)->comment('Type de document (recu, attestation, rapport)');
            $table->foreignId('type_assistance_id')
                ->nullable()
                ->constrained('types_assistance')
                ->onDelete('cascade')
                ->comment('Type d\'assistance associé (optionnel)');
                
            $table->text('contenu_html')->comment('Contenu HTML du template');
            $table->text('contenu_css')->nullable()->comment('Styles CSS du template');
            $table->json('variables_disponibles')->nullable()->comment('Variables disponibles pour le template');
            
            $table->boolean('actif')->default(true)->comment('Template actif');
            $table->boolean('par_defaut')->default(false)->comment('Template par défaut pour ce type');
            
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null');
                
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            // Index
            $table->index(['type', 'actif', 'date_suppression'], 'idx_type_actif');
            $table->index(['type_assistance_id', 'par_defaut'], 'idx_assistance_defaut');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('templates_documents');
    }
};