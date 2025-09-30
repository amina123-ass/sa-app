<?php
// Migration 1: 2024_01_01_000001_create_types_assistance_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('types_assistance', function (Blueprint $table) {
            $table->id();
            $table->string('libelle')->unique();
            $table->text('description')->nullable();
            $table->boolean('lateralite_obligatoire')->default(false);
            $table->boolean('enfants_scolarises_obligatoire')->default(false);
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            // Index
            $table->index('libelle');
            $table->index('date_suppression');
        });
    }

    public function down()
    {
        Schema::dropIfExists('types_assistance');
    }
};