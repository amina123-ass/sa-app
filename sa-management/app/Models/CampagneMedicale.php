<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class CampagneMedicale extends Model
{
    use HasFactory;

    protected $table = 'campagnes_medicales';

    protected $fillable = [
        'nom',
        'description',
        'type_assistance_id',
        'date_debut',
        'date_fin',
        'lieu',
        'budget',
        'credit_consomme',
        'prix_unitaire',
        'besoins_credit',
        'nombre_participants_prevu',
        'statut',
        'commentaires',
        'created_by',
        'date_suppression'
    ];

    protected $casts = [
        'date_debut' => 'date',
        'date_fin' => 'date',
        'budget' => 'decimal:2',
        'credit_consomme' => 'decimal:2',
        'prix_unitaire' => 'decimal:2',
        'besoins_credit' => 'decimal:2',
        'nombre_participants_prevu' => 'integer',
        'date_suppression' => 'datetime'
    ];

    const STATUTS = [
        'Active' => 'Active',
        'Inactive' => 'Inactive',
        'En cours' => 'En cours',
        'Terminée' => 'Terminée',
        'Annulée' => 'Annulée'
    ];

    // Relations
    public function typeAssistance()
    {
        return $this->belongsTo(TypeAssistance::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function beneficiaires()
    {
        return $this->hasMany(Beneficiaire::class, 'campagne_id')->whereNull('date_suppression');
    }

    public function participants()
    {
        return $this->hasMany(Participant::class, 'campagne_id')->whereNull('date_suppression');
    }

    public function campagneBeneficiaires()
    {
        return $this->hasMany(CampagneBeneficiaire::class, 'campagne_id')->whereNull('date_suppression');
    }

    public function assistancesMedicales()
    {
        return $this->hasMany(AssistanceMedicale::class, 'campagne_id')->whereNull('date_suppression');
    }

    public function indicateursCampagnes()
    {
        return $this->hasMany(IndicateurCampagne::class, 'campagne_id')->whereNull('date_suppression');
    }

    // Scopes
    public function scopeActif($query)
    {
        return $query->whereNull('date_suppression');
    }

    public function scopeActive($query)
    {
        return $query->where('statut', 'Active');
    }

    public function scopeEnCours($query)
    {
        return $query->where('statut', 'En cours');
    }

    public function scopeTerminee($query)
    {
        return $query->where('statut', 'Terminée');
    }

    public function scopeParPeriode($query, $dateDebut, $dateFin)
    {
        return $query->where(function ($q) use ($dateDebut, $dateFin) {
            $q->whereBetween('date_debut', [$dateDebut, $dateFin])
              ->orWhereBetween('date_fin', [$dateDebut, $dateFin])
              ->orWhere(function ($q2) use ($dateDebut, $dateFin) {
                  $q2->where('date_debut', '<=', $dateDebut)
                     ->where('date_fin', '>=', $dateFin);
              });
        });
    }

    public function scopeParType($query, $typeAssistanceId)
    {
        return $query->where('type_assistance_id', $typeAssistanceId);
    }

    // Accesseurs
    public function getDureeAttribute()
    {
        return $this->date_debut && $this->date_fin 
            ? $this->date_debut->diffInDays($this->date_fin) + 1 
            : 0;
    }

    public function getBudgetRestantAttribute()
    {
        return $this->budget ? $this->budget - ($this->credit_consomme ?? 0) : null;
    }

    public function getPourcentageConsommationAttribute()
    {
        return $this->budget && $this->budget > 0 
            ? round(($this->credit_consomme ?? 0) / $this->budget * 100, 2) 
            : 0;
    }

    public function getNombreBeneficiairesReelAttribute()
    {
        return $this->beneficiaires()->count();
    }

    public function getNombreParticipantsReelAttribute()
    {
        return $this->participants()->count();
    }

    // Méthodes
    public function estActive()
    {
        return $this->statut === 'Active' && $this->date_suppression === null;
    }

    public function estEnCours()
    {
        return $this->statut === 'En cours' && 
               $this->date_debut <= Carbon::today() && 
               $this->date_fin >= Carbon::today();
    }

    public function peutEtreModifiee()
    {
        return !in_array($this->statut, ['Terminée', 'Annulée']);
    }

    public function peutEtreSupprimee()
    {
        return $this->beneficiaires()->count() === 0 && 
               $this->participants()->count() === 0;
    }

    public function aChevauchemantAvec($dateDebut, $dateFin, $typeAssistanceId = null)
    {
        $query = static::where('id', '!=', $this->id)
                      ->whereNull('date_suppression')
                      ->where(function ($q) use ($dateDebut, $dateFin) {
                          $q->whereBetween('date_debut', [$dateDebut, $dateFin])
                            ->orWhereBetween('date_fin', [$dateDebut, $dateFin])
                            ->orWhere(function ($q2) use ($dateDebut, $dateFin) {
                                $q2->where('date_debut', '<=', $dateDebut)
                                   ->where('date_fin', '>=', $dateFin);
                            });
                      });

        if ($typeAssistanceId) {
            $query->where('type_assistance_id', $typeAssistanceId);
        }

        return $query->exists();
    }

    public function calculerStatistiques()
    {
        $beneficiaires = $this->beneficiaires;
        
        return [
            'total_beneficiaires' => $beneficiaires->count(),
            'hommes' => $beneficiaires->where('sexe', 'M')->count(),
            'femmes' => $beneficiaires->where('sexe', 'F')->count(),
            'moins_15_ans' => $beneficiaires->filter(function ($b) {
                return $b->age < 15;
            })->count(),
            'entre_16_64_ans' => $beneficiaires->filter(function ($b) {
                return $b->age >= 16 && $b->age <= 64;
            })->count(),
            'plus_65_ans' => $beneficiaires->filter(function ($b) {
                return $b->age > 65;
            })->count(),
        ];
    }

    public function softDelete()
    {
        $this->update(['date_suppression' => Carbon::now()]);
    }

    public function restore()
    {
        $this->update(['date_suppression' => null]);
    }
}