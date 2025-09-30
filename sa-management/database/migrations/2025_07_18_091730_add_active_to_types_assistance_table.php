<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('types_assistance', function (Blueprint $table) {
            $table->boolean('active')->default(true)->after('enfants_scolarises_obligatoire');
        });
    }

    public function down()
    {
        Schema::table('types_assistance', function (Blueprint $table) {
            $table->dropColumn('active');
        });
    }
};
