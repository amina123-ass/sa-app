<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('log_appels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participant_id')->constrained('participants')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('statut_avant', ['en_attente', 'oui', 'non', 'refuse', 'répondu', 'ne repond pas', 'non contacté']);
            $table->enum('statut_apres', ['en_attente', 'oui', 'non', 'refuse', 'répondu', 'ne repond pas', 'non contacté']);
            $table->text('commentaire')->nullable();
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            $table->index(['participant_id', 'created_at']);
            $table->index('user_id');
            $table->index('date_suppression');
        });
    }

    public function down()
    {
        Schema::dropIfExists('log_appels');
    }
};