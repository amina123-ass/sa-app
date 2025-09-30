<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->decimal('montant', 15, 2)->nullable();
            $table->year('annee_exercice');
            $table->foreignId('type_budget_id')->constrained('type_budgets')->onDelete('cascade');
            $table->timestamp('date_suppression')->nullable();
            $table->timestamps();
            
            $table->index(['annee_exercice', 'type_budget_id']);
            $table->index('date_suppression');
        });
    }

    public function down()
    {
        Schema::dropIfExists('budgets');
    }
};