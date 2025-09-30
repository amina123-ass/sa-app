<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('import_logs', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // 'beneficiaires', 'participants', etc.
            $table->string('fichier_origine');
            $table->integer('lignes_total');
            $table->integer('lignes_importees');
            $table->integer('lignes_erreur');
            $table->json('erreurs')->nullable(); // Détails des erreurs
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('campagne_id')->nullable()->constrained('campagnes_medicales')->onDelete('set null');
            $table->timestamp('date_import');
            $table->timestamps();
            
            $table->index(['type', 'date_import']);
            $table->index('user_id');
            $table->index('campagne_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('import_logs');
    }
};