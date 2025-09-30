<?php
// app/Models/AssistanceMedicale.php - VERSION MISE À JOUR

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class AssistanceMedicale extends Model
{
    use HasFactory;

    protected $table = 'assistance_medicales';

    protected $fillable = [
        'numero_assistance',
        'type_assistance_id',
        'beneficiaire_id',
        'etat_don_id',
        'details_type_assistance_id',
        'campagne_id',
        'situation_id',
        'nature_done_id',
        'date_assistance',
        'montant',
        'priorite',
        // 'assistance_terminee', // ❌ SUPPRIMÉ
        'observations',
        'commentaire_interne',
        'validee',
        'validee_le',
        'validee_par',
        'commentaire_validation',
        'rejetee',
        'rejetee_le',
        'rejetee_par',
        'motif_rejet',
        'montant_reel_depense',
        'date_paiement',
        'mode_paiement',
        'reference_paiement',
        'documents_joints',
        'recu_pdf',
        'satisfaction_beneficiaire',
        'feedback_beneficiaire',
        'date_feedback',
        'type_verres',
        'monture_choisie',
        'prescription_medicale',
        'oreille_concernee',
        'type_appareil',
        'resultats_audiometrie',
        'destination',
        'type_transport',
        'distance_km',
        'date_rappel',
        'rappel_envoye',
        'notes_suivi',
        'assistance_precedente_id',
        'assistance_renouvelee',
        'created_by',
        'updated_by',
        
        // Colonnes existantes pour appareillage orthopédique
        'realisee_par',
        'duree_utilisation',
        'retour_effectue',
        'date_retour',
        'observation_retour',
        'date_fin_prevue',
        
        // ✅ NOUVEAU CHAMP AJOUTÉ
        'moi_meme'
    ];

    protected $casts = [
        'date_assistance' => 'date',
        'date_paiement' => 'date',
        'date_feedback' => 'date',
        'date_rappel' => 'date',
        'date_retour' => 'date',
        'date_fin_prevue' => 'date',
        'validee_le' => 'datetime',
        'rejetee_le' => 'datetime',
        'date_suppression' => 'datetime',
        'montant' => 'decimal:2',
        'montant_reel_depense' => 'decimal:2',
        'distance_km' => 'decimal:2',
        'duree_utilisation' => 'integer',
        // 'assistance_terminee' => 'boolean', // ❌ SUPPRIMÉ
        'validee' => 'boolean',
        'rejetee' => 'boolean',
        'rappel_envoye' => 'boolean',
        'assistance_renouvelee' => 'boolean',
        'retour_effectue' => 'boolean',
        'documents_joints' => 'array',
        
        // ✅ NOUVEAU CAST AJOUTÉ
        'moi_meme' => 'boolean'
    ];

    // ===== RELATIONS (inchangées) =====

    public function typeAssistance()
    {
        return $this->belongsTo(TypeAssistance::class, 'type_assistance_id');
    }

    public function beneficiaire()
    {
        return $this->belongsTo(Beneficiaire::class, 'beneficiaire_id');
    }

    public function etatDon()
    {
        return $this->belongsTo(EtatDone::class, 'etat_don_id');
    }

    public function detailsTypeAssistance()
    {
        return $this->belongsTo(DetailsTypeAssistance::class, 'details_type_assistance_id');
    }

    public function campagne()
    {
        return $this->belongsTo(CampagneMedicale::class, 'campagne_id');
    }

    public function situation()
    {
        return $this->belongsTo(Situation::class, 'situation_id');
    }

    public function natureDone()
    {
        return $this->belongsTo(NatureDone::class, 'nature_done_id');
    }

    // ===== ACCESSEURS EXISTANTS POUR APPAREILLAGE (inchangés) =====

    /**
     * Vérifier si c'est un appareillage orthopédique
     */
    public function getEstAppareillageAttribute()
    {
        return $this->typeAssistance && 
               stripos($this->typeAssistance->libelle, 'appareillage') !== false;
    }

    /**
     * Vérifier si le retour est obligatoire
     */
    public function getRetourObligatoireAttribute()
    {
        if (!$this->est_appareillage) return false;
        
        $nature = $this->natureDone ? strtolower($this->natureDone->libelle) : '';
        
        return strpos($nature, 'prêt') !== false;
    }

    /**
     * Vérifier si une durée est requise
     */
    public function getDureeRequiseAttribute()
    {
        if (!$this->est_appareillage) return false;
        
        $nature = $this->natureDone ? strtolower($this->natureDone->libelle) : '';
        
        return strpos($nature, 'pour une durée') !== false || 
               strpos($nature, 'temporaire') !== false;
    }

    /**
     * Vérifier si le matériel est en retard
     */
    public function getEstEnRetardAttribute()
    {
        if (!$this->est_appareillage) return false;
        if (!$this->retour_obligatoire) return false;
        if ($this->retour_effectue) return false;
        if (!$this->duree_requise) return false;
        if (!$this->date_fin_prevue) return false;

        return Carbon::now()->isAfter($this->date_fin_prevue);
    }

    /**
     * Calculer le nombre de jours de retard
     */
    public function getJoursRetardAttribute()
    {
        if (!$this->est_en_retard) return 0;
        
        return Carbon::now()->diffInDays($this->date_fin_prevue);
    }

    /**
     * Obtenir le statut du retour
     */
    public function getStatutRetourAttribute()
    {
        if (!$this->est_appareillage) return null;
        if (!$this->retour_obligatoire) return 'non_applicable';
        
        if ($this->retour_effectue) {
            return 'retourne';
        } elseif ($this->est_en_retard) {
            return 'en_retard';
        } elseif ($this->duree_requise && $this->date_fin_prevue) {
            return 'en_cours';
        } else {
            return 'en_attente';
        }
    }

    // ===== NOUVEAUX ACCESSEURS POUR LE CHAMP MOI_MEME =====

    /**
     * Libellé pour l'affichage du champ moi_meme
     */
    public function getMoiMemeLabelsAttribute()
    {
        return $this->moi_meme ? 'Oui' : 'Non';
    }

    /**
     * Icône pour l'affichage du champ moi_meme
     */
    public function getMoiMemeIconAttribute()
    {
        return $this->moi_meme ? '👤' : '👥';
    }

    /**
     * Couleur pour l'affichage du champ moi_meme
     */
    public function getMoiMemeColorAttribute()
    {
        return $this->moi_meme ? 'primary' : 'secondary';
    }

    /**
     * Description détaillée de qui a réalisé l'assistance
     */
    public function getRealisationDescriptionAttribute()
    {
        if ($this->moi_meme) {
            return 'Réalisée par le bénéficiaire lui-même';
        } elseif ($this->realisee_par) {
            return "Réalisée par: {$this->realisee_par}";
        } else {
            return 'Réalisée par l\'équipe';
        }
    }

    // ===== SCOPES EXISTANTS (inchangés) =====

    /**
     * Scope pour les appareillages orthopédiques
     */
    public function scopeAppareillages(Builder $query)
    {
        return $query->whereHas('typeAssistance', function ($q) {
            $q->where('libelle', 'like', '%appareillage%');
        });
    }

    /**
     * Scope pour les matériels en retard
     */
    public function scopeEnRetard(Builder $query)
    {
        return $query->appareillages()
            ->where('retour_effectue', false)
            ->whereNotNull('date_fin_prevue')
            ->where('date_fin_prevue', '<', Carbon::now());
    }

    /**
     * Scope pour les matériels à retourner prochainement (dans X jours)
     */
    public function scopeARetournerProchainement(Builder $query, int $jours = 7)
    {
        $dateLimite = Carbon::now()->addDays($jours);
        
        return $query->appareillages()
            ->where('retour_effectue', false)
            ->whereNotNull('date_fin_prevue')
            ->whereBetween('date_fin_prevue', [Carbon::now(), $dateLimite]);
    }

    /**
     * Scope pour les prêts sans retour effectué
     */
    public function scopePretsSansRetour(Builder $query)
    {
        return $query->appareillages()
            ->whereHas('natureDone', function ($q) {
                $q->where('libelle', 'like', '%prêt%');
            })
            ->where('retour_effectue', false);
    }

    // ===== NOUVEAUX SCOPES POUR MOI_MEME =====

    /**
     * Scope pour les assistances réalisées par les bénéficiaires eux-mêmes
     */
    public function scopeRealiseeParBeneficiaire(Builder $query)
    {
        return $query->where('moi_meme', true);
    }

    /**
     * Scope pour les assistances réalisées par l'équipe
     */
    public function scopeRealiseeParEquipe(Builder $query)
    {
        return $query->where('moi_meme', false);
    }

    /**
     * Scope pour filtrer par type de réalisation
     */
    public function scopeParTypeRealisation(Builder $query, bool $moiMeme)
    {
        return $query->where('moi_meme', $moiMeme);
    }

    // ===== MÉTHODES UTILITAIRES (inchangées) =====

    /**
     * Calculer et sauvegarder la date de fin prévue
     */
    public function calculerDateFinPrevue()
    {
        if ($this->duree_utilisation && $this->date_assistance) {
            $this->date_fin_prevue = Carbon::parse($this->date_assistance)
                ->addDays($this->duree_utilisation);
            $this->save();
        }
    }

    /**
     * Marquer le retour comme effectué
     */
    public function marquerRetourEffectue($dateRetour = null, $observation = null)
    {
        $this->update([
            'retour_effectue' => true,
            'date_retour' => $dateRetour ?: Carbon::now(),
            'observation_retour' => $observation,
            'updated_by' => auth()->id()
        ]);
    }

    // ===== NOUVELLES MÉTHODES UTILITAIRES =====

    /**
     * Basculer entre réalisation par bénéficiaire et par équipe
     */
    public function basculerMoiMeme()
    {
        $this->update([
            'moi_meme' => !$this->moi_meme,
            'updated_by' => auth()->id()
        ]);
    }

    /**
     * Marquer comme réalisée par le bénéficiaire
     */
    public function marquerRealiseeParBeneficiaire($observation = null)
    {
        $this->update([
            'moi_meme' => true,
            'realisee_par' => null, // Supprimer le nom de la personne de l'équipe
            'observations' => $observation ? 
                ($this->observations ? $this->observations . "\n" . $observation : $observation) : 
                $this->observations,
            'updated_by' => auth()->id()
        ]);
    }

    /**
     * Marquer comme réalisée par l'équipe
     */
    public function marquerRealiseeParEquipe($realisePar = null, $observation = null)
    {
        $this->update([
            'moi_meme' => false,
            'realisee_par' => $realisePar,
            'observations' => $observation ? 
                ($this->observations ? $this->observations . "\n" . $observation : $observation) : 
                $this->observations,
            'updated_by' => auth()->id()
        ]);
    }

    // ===== MÉTHODES STATISTIQUES =====

    /**
     * Obtenir les statistiques par type de réalisation
     */
    public static function getStatistiquesMoiMeme($dateDebut = null, $dateFin = null)
    {
        $query = static::query();
        
        if ($dateDebut && $dateFin) {
            $query->whereBetween('date_assistance', [$dateDebut, $dateFin]);
        }

        return [
            'total' => $query->count(),
            'par_beneficiaire' => $query->clone()->where('moi_meme', true)->count(),
            'par_equipe' => $query->clone()->where('moi_meme', false)->count(),
            'pourcentage_beneficiaires' => $query->count() > 0 ? 
                round(($query->clone()->where('moi_meme', true)->count() / $query->count()) * 100, 2) : 0
        ];
    }

    /**
     * Boot du modèle (inchangé + nouvelles fonctionnalités)
     */
    protected static function boot()
    {
        parent::boot();

        // Calculer automatiquement la date de fin prévue lors de la création/mise à jour
        static::saving(function ($model) {
            if ($model->isDirty(['date_assistance', 'duree_utilisation']) && 
                $model->duree_utilisation && 
                $model->date_assistance) {
                
                $model->date_fin_prevue = Carbon::parse($model->date_assistance)
                    ->addDays($model->duree_utilisation);
            }

            // ✅ NOUVELLE LOGIQUE: Valider la cohérence entre moi_meme et realisee_par
            if ($model->moi_meme === true && $model->realisee_par) {
                // Si c'est réalisé par le bénéficiaire, effacer le champ realisee_par
                $model->realisee_par = null;
            }
        });

        // ✅ NOUVEAU: Log des changements de moi_meme
        static::updated(function ($model) {
            if ($model->isDirty('moi_meme')) {
                \Log::info('Changement type réalisation assistance', [
                    'assistance_id' => $model->id,
                    'numero_assistance' => $model->numero_assistance,
                    'ancien_moi_meme' => $model->getOriginal('moi_meme'),
                    'nouveau_moi_meme' => $model->moi_meme,
                    'user_id' => auth()->id()
                ]);
            }
        });
    }
}