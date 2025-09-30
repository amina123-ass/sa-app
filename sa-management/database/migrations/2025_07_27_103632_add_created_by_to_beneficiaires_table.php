<?php
// Créer cette migration : php artisan make:migration add_created_by_to_beneficiaires_table

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('beneficiaires', function (Blueprint $table) {
            // Ajouter la colonne created_by si elle n'existe pas
            if (!Schema::hasColumn('beneficiaires', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->after('updated_at');
                $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
                $table->index('created_by');
            }
            
            // Ajouter updated_by aussi pour la cohérence
            if (!Schema::hasColumn('beneficiaires', 'updated_by')) {
                $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');
                $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
                $table->index('updated_by');
            }
        });
    }

    public function down()
    {
        Schema::table('beneficiaires', function (Blueprint $table) {
            if (Schema::hasColumn('beneficiaires', 'updated_by')) {
                $table->dropForeign(['updated_by']);
                $table->dropColumn('updated_by');
            }
            
            if (Schema::hasColumn('beneficiaires', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }
        });
    }
};