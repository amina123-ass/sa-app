<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE kafalas MODIFY COLUMN fichier_pdf LONGBLOB NULL');
    }

    public function down(): void
    {
        // Retour à VARCHAR(255) comme avant (ajuste si besoin)
        DB::statement('ALTER TABLE kafalas MODIFY COLUMN fichier_pdf VARCHAR(255) NULL');
    }
};

