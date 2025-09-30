<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Beneficiaire extends Model
{
    use HasFactory;

    protected $table = 'beneficiaires';

    protected $fillable = [
        'nom',
        'prenom',
        'sexe',
        'date_naissance',
        'adresse',
        'telephone',
        'email',
        'cin',
        'commentaire',
        'date_demande',
        'campagne_id',
        'type_assistance_id',
        'hors_campagne',
        'a_beneficie',
        'lateralite',
        'enfants_scolarises',
        'cote',
        'decision',           // ← AJOUTÉ : champ decision
        'date_suppression'
    ];

    protected $casts = [
        'date_naissance' => 'date',
        'date_demande' => 'date',
        'hors_campagne' => 'boolean',
        'a_beneficie' => 'boolean',
        'enfants_scolarises' => 'boolean',
        'date_suppression' => 'datetime'
    ];

    const SEXES = [
        'M' => 'Masculin',
        'F' => 'Féminin'
    ];

    const LATERALITES = [
        'Unilatérale' => 'Unilatérale',
        'Bilatérale' => 'Bilatérale'
    ];

    const COTES = [
        'unilatéral' => 'Unilatéral',
        'bilatéral' => 'Bilatéral'
    ];

    // Age limite pour considérer comme enfant
    const AGE_LIMITE_ENFANT = 18;

    // Relations
    public function campagne()
    {
        return $this->belongsTo(CampagneMedicale::class, 'campagne_id');
    }

    public function typeAssistance()
    {
        return $this->belongsTo(TypeAssistance::class);
    }

    public function assistancesMedicales()
    {
        return $this->hasMany(AssistanceMedicale::class)->whereNull('date_suppression');
    }

    public function campagneBeneficiaires()
    {
        return $this->hasMany(CampagneBeneficiaire::class)->whereNull('date_suppression');
    }

    public function indicateurs()
    {
        return $this->hasMany(BeneficiaireIndicateur::class)->whereNull('date_suppression');
    }

    // Scopes
    public function scopeActif($query)
    {
        return $query->whereNull('date_suppression');
    }

    public function scopeHommes($query)
    {
        return $query->where('sexe', 'M');
    }

    public function scopeFemmes($query)
    {
        return $query->where('sexe', 'F');
    }

    public function scopeEnfants($query)
    {
        $dateLimit = Carbon::now()->subYears(self::AGE_LIMITE_ENFANT);
        return $query->where('date_naissance', '>', $dateLimit);
    }

    public function scopeAdultes($query)
    {
        $dateLimit = Carbon::now()->subYears(self::AGE_LIMITE_ENFANT);
        return $query->where('date_naissance', '<=', $dateLimit);
    }

    public function scopeEnfantsScolarises($query)
    {
        return $query->where('enfants_scolarises', true);
    }

    public function scopeParCote($query, $cote)
    {
        return $query->where('cote', $cote);
    }

    public function scopeHorsCampagne($query)
    {
        return $query->where('hors_campagne', true);
    }

    public function scopeDansCampagne($query)
    {
        return $query->where('hors_campagne', false);
    }

    public function scopeAyantBeneficie($query)
    {
        return $query->where('a_beneficie', true);
    }

    public function scopeParAge($query, $ageMin, $ageMax = null)
    {
        $dateMax = Carbon::now()->subYears($ageMin);
        $query->where('date_naissance', '<=', $dateMax);

        if ($ageMax) {
            $dateMin = Carbon::now()->subYears($ageMax + 1);
            $query->where('date_naissance', '>', $dateMin);
        }

        return $query;
    }

    public function scopeParCampagne($query, $campagneId)
    {
        return $query->where('campagne_id', $campagneId);
    }

    public function scopeParType($query, $typeAssistanceId)
    {
        return $query->where('type_assistance_id', $typeAssistanceId);
    }

    public function scopeRecherche($query, $terme)
    {
        return $query->where(function ($q) use ($terme) {
            $q->where('nom', 'like', "%{$terme}%")
              ->orWhere('prenom', 'like', "%{$terme}%")
              ->orWhere('telephone', 'like', "%{$terme}%")
              ->orWhere('cin', 'like', "%{$terme}%");
        });
    }

    // Accesseurs
    public function getNomCompletAttribute()
    {
        return $this->nom . ' ' . $this->prenom;
    }

    public function getAgeAttribute()
    {
        return $this->date_naissance ? $this->date_naissance->age : null;
    }

    public function getEstEnfantAttribute()
    {
        return $this->age !== null && $this->age < self::AGE_LIMITE_ENFANT;
    }

    public function getTrancheAgeAttribute()
    {
        if (!$this->age) return 'Non définie';
        
        if ($this->age < 15) return 'Moins de 15 ans';
        if ($this->age <= 64) return '16-64 ans';
        return '65 ans et plus';
    }

    public function getSexeLibelleAttribute()
    {
        return self::SEXES[$this->sexe] ?? $this->sexe;
    }

    public function getCoteLibelleAttribute()
    {
        return self::COTES[$this->cote] ?? $this->cote;
    }

    // Mutateurs
    public function setNomAttribute($value)
    {
        $this->attributes['nom'] = ucwords(strtolower(trim($value)));
    }

    public function setPrenomAttribute($value)
    {
        $this->attributes['prenom'] = ucwords(strtolower(trim($value)));
    }

    /**
     * Mutateur pour le numéro de téléphone
     * Accepte uniquement les numéros à 9 chiffres
     */
    public function setTelephoneAttribute($value)
    {
        if (empty($value)) {
            $this->attributes['telephone'] = null;
            return;
        }

        // Nettoyer le numéro en gardant seulement les chiffres
        $cleanNumber = preg_replace('/[^0-9]/', '', $value);
        
        // Vérifier si le numéro a exactement 9 chiffres
        if (strlen($cleanNumber) === 9) {
            $this->attributes['telephone'] = $cleanNumber;
        } else {
            // Vous pouvez soit lever une exception, soit ignorer la valeur
            throw new \InvalidArgumentException('Le numéro de téléphone doit contenir exactement 9 chiffres.');
            
            // Ou simplement ignorer et mettre null :
            // $this->attributes['telephone'] = null;
        }
    }

    public function setEmailAttribute($value)
    {
        $this->attributes['email'] = $value ? strtolower(trim($value)) : null;
    }

    /**
     * Mutateur pour la decision - normalise automatiquement les valeurs
     */
    public function setDecisionAttribute($value)
    {
        if (empty($value)) {
            $this->attributes['decision'] = null;
            return;
        }

        $value = strtolower(trim((string)$value));
        
        // Mapping des valeurs possibles vers les valeurs normalisées
        $decisionMapping = [
            'accepte' => 'accepté',
            'accepté' => 'accepté', 
            'accepted' => 'accepté',
            'refuse' => 'refusé',
            'refusé' => 'refusé',
            'refused' => 'refusé',
            'reject' => 'refusé',
            'rejeté' => 'refusé',
            'en_attente' => 'en_attente',
            'en attente' => 'en_attente',
            'waiting' => 'en_attente',
            'pending' => 'en_attente',
            'attente' => 'en_attente',
            'principal' => 'admin a list principal',
            'liste principale' => 'admin a list principal', 
            'main list' => 'admin a list principal',
            'admin a list principal' => 'admin a list principal',
            'list_attente' => 'admin a list d\'attente',
            'liste d\'attente' => 'admin a list d\'attente',
            'liste d attente' => 'admin a list d\'attente', 
            'waiting list' => 'admin a list d\'attente',
            'admin a list d\'attente' => 'admin a list d\'attente',
        ];
        
        $this->attributes['decision'] = $decisionMapping[$value] ?? $value;
    }

    // Méthodes
    public function doitAvoirEnfantsScolarises()
    {
        return $this->est_enfant && 
               $this->typeAssistance && 
               strtolower($this->typeAssistance->libelle) === 'lunettes';
    }

    public function doitAvoirCote()
    {
        return $this->typeAssistance && 
               (strtolower($this->typeAssistance->libelle) === 'appareils auditifs' ||
                strpos(strtolower($this->typeAssistance->libelle), 'auditif') !== false);
    }

    public function peutAvoirLateralite()
    {
        return $this->typeAssistance && $this->typeAssistance->lateralite_obligatoire;
    }

    public function ajouterIndicateur($indicateur, $sousIndicateur = null, $valeur = null)
    {
        return $this->indicateurs()->create([
            'indicateur' => $indicateur,
            'sous_indicateur' => $sousIndicateur,
            'valeur' => $valeur
        ]);
    }

    public function obtenirIndicateur($indicateur)
    {
        return $this->indicateurs()->where('indicateur', $indicateur)->first();
    }

    public function softDelete()
    {
        $this->update(['date_suppression' => Carbon::now()]);
    }

    public function restore()
    {
        $this->update(['date_suppression' => null]);
    }

    // Méthodes de validation pour l'import
    public static function validerDonneesImport($donnees, $typeAssistance)
    {
        $erreurs = [];

        // Validation des champs obligatoires
        if (empty($donnees['nom'])) {
            $erreurs[] = 'Le nom est obligatoire';
        }

        if (empty($donnees['prenom'])) {
            $erreurs[] = 'Le prénom est obligatoire';
        }

        if (empty($donnees['sexe']) || !in_array($donnees['sexe'], ['M', 'F'])) {
            $erreurs[] = 'Le sexe doit être M ou F';
        }

        // Validation du numéro de téléphone
        if (!empty($donnees['telephone'])) {
            $cleanTelephone = preg_replace('/[^0-9]/', '', $donnees['telephone']);
            if (strlen($cleanTelephone) !== 9) {
                $erreurs[] = 'Le numéro de téléphone doit contenir exactement 9 chiffres';
            }
        }

        if (empty($donnees['date_naissance'])) {
            $erreurs[] = 'La date de naissance est obligatoire';
        } else {
            try {
                $dateNaissance = Carbon::parse($donnees['date_naissance']);
                $age = $dateNaissance->age;
                
                // Validation spécifique selon le type d'assistance
                if ($typeAssistance) {
                    $typeLibelle = strtolower($typeAssistance->libelle);
                    
                    // Pour les lunettes : enfants_scolarises obligatoire si enfant
                    if ($typeLibelle === 'lunettes' && $age < self::AGE_LIMITE_ENFANT) {
                        if (!isset($donnees['enfants_scolarises']) || 
                            !in_array(strtolower($donnees['enfants_scolarises']), ['oui', 'non'])) {
                            $erreurs[] = 'Le champ "enfants_scolarises" est obligatoire pour les enfants (oui/non)';
                        }
                    }
                    
                    // Pour les appareils auditifs : cote obligatoire
                    if (strpos($typeLibelle, 'auditif') !== false || $typeLibelle === 'appareils auditifs') {
                        if (empty($donnees['cote']) || 
                            !in_array(strtolower($donnees['cote']), ['unilatéral', 'bilatéral'])) {
                            $erreurs[] = 'Le champ "cote" est obligatoire (unilatéral/bilatéral)';
                        }
                    }
                }
                
            } catch (\Exception $e) {
                $erreurs[] = 'Format de date de naissance invalide';
            }
        }

        return $erreurs;
    }

    /**
     * Méthode utilitaire pour valider un numéro de téléphone
     */
    public static function estTelephoneValide($telephone)
    {
        if (empty($telephone)) {
            return true; // Le téléphone peut être vide
        }
        
        $cleanTelephone = preg_replace('/[^0-9]/', '', $telephone);
        return strlen($cleanTelephone) === 9;
    }

    /**
     * Obtenir les statistiques détaillées par type d'assistance
     */
    public static function getStatistiquesDetaillees($campagneId = null, $typeAssistanceId = null)
    {
        $query = self::actif();
        
        if ($campagneId) {
            $query->where('campagne_id', $campagneId);
        }
        
        if ($typeAssistanceId) {
            $query->where('type_assistance_id', $typeAssistanceId);
        }
        
        $beneficiaires = $query->with('typeAssistance')->get();
        
        $stats = [
            'total' => $beneficiaires->count(),
            'par_sexe' => [
                'hommes' => $beneficiaires->where('sexe', 'M')->count(),
                'femmes' => $beneficiaires->where('sexe', 'F')->count(),
            ],
            'par_tranche_age' => [
                'moins_15' => $beneficiaires->filter(fn($b) => $b->age < 15)->count(),
                '15_64' => $beneficiaires->filter(fn($b) => $b->age >= 15 && $b->age <= 64)->count(),
                'plus_65' => $beneficiaires->filter(fn($b) => $b->age > 64)->count(),
            ]
        ];
        
        // Statistiques spécifiques aux lunettes
        $lunettes = $beneficiaires->filter(function($b) {
            return $b->typeAssistance && strtolower($b->typeAssistance->libelle) === 'lunettes';
        });
        
        if ($lunettes->count() > 0) {
            $stats['lunettes'] = [
                'total' => $lunettes->count(),
                'enfants_scolarises' => [
                    'oui' => $lunettes->where('enfants_scolarises', true)->count(),
                    'non' => $lunettes->where('enfants_scolarises', false)->count(),
                    'non_applicable' => $lunettes->whereNull('enfants_scolarises')->count(),
                ]
            ];
        }
        
        // Statistiques spécifiques aux appareils auditifs
        $auditifs = $beneficiaires->filter(function($b) {
            return $b->typeAssistance && 
                   (strpos(strtolower($b->typeAssistance->libelle), 'auditif') !== false ||
                    strtolower($b->typeAssistance->libelle) === 'appareils auditifs');
        });
        
        if ($auditifs->count() > 0) {
            $stats['appareils_auditifs'] = [
                'total' => $auditifs->count(),
                'par_cote' => [
                    'unilateral' => $auditifs->where('cote', 'unilatéral')->count(),
                    'bilateral' => $auditifs->where('cote', 'bilatéral')->count(),
                ]
            ];
        }
        
        return $stats;
    }
}