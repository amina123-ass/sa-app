<?php
// ===== App\Models\DetailsTypeAssistance.php =====

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class DetailsTypeAssistance extends Model
{
    use HasFactory;

    protected $table = 'details_type_assistances';

    protected $fillable = [
        'type_assistance_id',
        'libelle',
        'description',
        'montant',
        'date_suppression'
    ];

    protected $casts = [
        'montant' => 'decimal:2',
        'date_suppression' => 'datetime',
        'type_assistance_id' => 'integer'
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    // ===== RELATIONS =====
    
    /**
     * Relation avec TypeAssistance
     */
    public function typeAssistance()
    {
        return $this->belongsTo(TypeAssistance::class, 'type_assistance_id');
    }

    /**
     * Relation avec AssistancesMedicales
     */
    public function assistancesMedicales()
    {
        return $this->hasMany(AssistanceMedicale::class, 'details_type_assistance_id')
                    ->whereNull('date_suppression');
    }

    // ===== SCOPES =====
    
    /**
     * Scope pour les éléments actifs (non supprimés)
     */
    public function scopeActif($query)
    {
        return $query->whereNull('date_suppression');
    }

    /**
     * Scope par type d'assistance
     */
    public function scopeParType($query, $typeAssistanceId)
    {
        return $query->where('type_assistance_id', $typeAssistanceId);
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

    // ===== ACCESSORS =====
    
    /**
     * Formater le montant avec devise
     */
    public function getMontantFormateAttribute()
    {
        return $this->montant ? number_format($this->montant, 2, ',', ' ') . ' MAD' : 'Non défini';
    }

    /**
     * Vérifier si l'élément est supprimé
     */
    public function getEstSupprimeAttribute()
    {
        return !is_null($this->date_suppression);
    }

    // ===== MÉTHODES =====
    
    /**
     * Suppression douce (soft delete)
     */
    public function softDelete()
    {
        $this->update(['date_suppression' => Carbon::now()]);
        return $this;
    }

    /**
     * Restaurer un élément supprimé
     */
    public function restore()
    {
        $this->update(['date_suppression' => null]);
        return $this;
    }

    /**
     * Vérifier si peut être supprimé (pas d'assistances associées)
     */
    public function peutEtreSuppprime()
    {
        return $this->assistancesMedicales()->count() === 0;
    }

    /**
     * Obtenir les statistiques d'utilisation
     */
    public function getStatistiquesUtilisation()
    {
        return [
            'nombre_assistances' => $this->assistancesMedicales()->count(),
            'montant_total_utilise' => $this->assistancesMedicales()->sum('montant_accorde'),
            'derniere_utilisation' => $this->assistancesMedicales()->latest()->value('created_at')
        ];
    }
}