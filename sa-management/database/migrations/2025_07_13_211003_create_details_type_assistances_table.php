<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('details_type_assistances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('type_assistance_id')->constrained('types_assistance')->onDelete('cascade');
            $table->string('libelle');
            $table->text('description')->nullable();
            $table->decimal('montant', 10, 2)->nullable();
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            // Index
            $table->index('type_assistance_id');
            $table->index('date_suppression');
        });
    }

    public function down()
    {
        Schema::dropIfExists('details_type_assistances');
    }
};