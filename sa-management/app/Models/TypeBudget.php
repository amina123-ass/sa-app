<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class TypeBudget extends Model
{
    use HasFactory;

    protected $table = 'type_budgets';

    protected $fillable = [
        'libelle',
        'description',
        'date_suppression'
    ];

    protected $casts = [
        'date_suppression' => 'datetime'
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    // ===== RELATIONS =====
    
    /**
     * Relation avec les budgets
     */
    public function budgets()
    {
        return $this->hasMany(Budget::class, 'type_budget_id')
                    ->whereNull('date_suppression');
    }

    /**
     * Relation avec les budgets actifs pour l'année en cours
     */
    public function budgetsActuels()
    {
        return $this->budgets()
                    ->where('annee_exercice', Carbon::now()->year);
    }

    // ===== SCOPES =====
    
    /**
     * Scope pour les types actifs
     */
    public function scopeActif($query)
    {
        return $query->whereNull('date_suppression');
    }

    /**
     * Scope pour recherche
     */
    public function scopeRecherche($query, $terme)
    {
        return $query->where(function($q) use ($terme) {
            $q->where('libelle', 'LIKE', "%{$terme}%")
              ->orWhere('description', 'LIKE', "%{$terme}%");
        });
    }

    /**
     * Scope pour les types DON
     */
    public function scopeTypesDon($query)
    {
        return $query->where('libelle', 'LIKE', '%don%');
    }

    // ===== ACCESSORS =====
    
    /**
     * Vérifier si c'est un type DON
     */
    public function getEstTypeDonAttribute()
    {
        return stripos($this->libelle, 'don') !== false;
    }

    /**
     * Calculer le montant total des budgets de ce type
     */
    public function getMontantTotalAttribute()
    {
        return $this->budgets()->sum('montant') ?? 0;
    }

    /**
     * Calculer le nombre de budgets de ce type
     */
    public function getNombreBudgetsAttribute()
    {
        return $this->budgets()->count();
    }

    // ===== MÉTHODES =====
    
    /**
     * Suppression douce
     */
    public function softDelete()
    {
        // Vérifier qu'aucun budget n'utilise ce type
        if ($this->budgets()->exists()) {
            throw new \Exception("Impossible de supprimer ce type de budget car il est utilisé par des budgets.");
        }

        $this->update(['date_suppression' => Carbon::now()]);
        return $this;
    }

    /**
     * Restaurer
     */
    public function restore()
    {
        $this->update(['date_suppression' => null]);
        return $this;
    }

    /**
     * Obtenir les statistiques du type de budget
     */
    public function getStatistiques()
    {
        return [
            'nombre_budgets' => $this->getNombreBudgetsAttribute(),
            'montant_total' => $this->getMontantTotalAttribute(),
            'budgets_actifs' => $this->budgets()->count(),
            'budgets_annee_courante' => $this->budgetsActuels()->count()
        ];
    }
}
