<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'libelle',           // Nouveau champ ajouté
        'montant',
        'annee_exercice',
        'type_budget_id',
        'date_suppression'
    ];

    protected $casts = [
        'montant' => 'decimal:2',
        'annee_exercice' => 'integer',
        'date_suppression' => 'datetime'
    ];

    // Relations
    public function typeBudget()
    {
        return $this->belongsTo(TypeBudget::class);
    }

    // Scopes
    public function scopeActif($query)
    {
        return $query->whereNull('date_suppression');
    }

    public function scopeParAnnee($query, $annee)
    {
        return $query->where('annee_exercice', $annee);
    }

    public function scopeAnneeEnCours($query)
    {
        return $query->where('annee_exercice', Carbon::now()->year);
    }

    // Méthodes
    public function softDelete()
    {
        $this->update(['date_suppression' => Carbon::now()]);
    }

    public function restore()
    {
        $this->update(['date_suppression' => null]);
    }

    // Accesseur pour générer automatiquement un libellé si vide
    public function getLibelleAttribute($value)
    {
        if (empty($value)) {
            return "Budget {$this->annee_exercice} - Type {$this->type_budget_id}";
        }
        return $value;
    }
}