<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('types_assistance', function (Blueprint $table) {
            $table->decimal('prix_unitaire', 10, 2)->nullable()->after('description');
        });
    }

    public function down()
    {
        Schema::table('types_assistance', function (Blueprint $table) {
            $table->dropColumn('prix_unitaire');
        });
    }
};
