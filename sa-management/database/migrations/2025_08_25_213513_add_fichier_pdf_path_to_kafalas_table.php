<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('kafalas', function (Blueprint $table) {
            $table->string('fichier_pdf_path')->nullable()->after('fichier_pdf_uploaded_at');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('kafalas', function (Blueprint $table) {
            $table->dropColumn('fichier_pdf_path');
        });
    }
};