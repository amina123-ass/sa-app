<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('beneficiaires', function (Blueprint $table) {
            // Contrainte unique pour éviter les doublons sur téléphone (sauf si supprimé)
            $table->unique(['telephone'], 'unique_telephone_beneficiaire');
        });
        
        Schema::table('participants', function (Blueprint $table) {
            // Contrainte unique pour éviter les doublons participant/campagne
            $table->unique(['telephone', 'campagne_id'], 'unique_telephone_campagne');
        });
    }

    public function down()
    {
        Schema::table('beneficiaires', function (Blueprint $table) {
            $table->dropUnique('unique_telephone_beneficiaire');
        });
        
        Schema::table('participants', function (Blueprint $table) {
            $table->dropUnique('unique_telephone_campagne');
        });
    }
};