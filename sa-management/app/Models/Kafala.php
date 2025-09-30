<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Kafala extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'reference', 'nom_pere', 'prenom_pere', 'cin_pere',
        'nom_mere', 'prenom_mere', 'cin_mere',
        'telephone', 'email', 'adresse', 'date_mariage',
        'nom_enfant', 'prenom_enfant', 'sexe_enfant',
        'date_naissance_enfant', 'cin_enfant',
        'fichier_pdf', 'fichier_pdf_nom', 'fichier_pdf_taille', 
        'fichier_pdf_type', 'fichier_pdf_uploaded_at', 'fichier_pdf_path',
        'commentaires'
    ];

    protected $dates = ['date_mariage', 'date_naissance_enfant', 'fichier_pdf_uploaded_at'];

    protected $casts = [
        'date_mariage' => 'date',
        'date_naissance_enfant' => 'date',
        'fichier_pdf_uploaded_at' => 'datetime',
        'fichier_pdf_taille' => 'integer',
    ];

    // Accessors for computed fields - AMÉLIORÉS pour gérer les valeurs null
    public function getNomCompletPereAttribute()
    {
        return trim(($this->nom_pere ?? '') . ' ' . ($this->prenom_pere ?? ''));
    }

    public function getNomCompletMereAttribute()
    {
        return trim(($this->nom_mere ?? '') . ' ' . ($this->prenom_mere ?? ''));
    }

    public function getNomCompletEnfantAttribute()
    {
        // Gérer le cas où les champs enfant peuvent être null
        if (empty($this->nom_enfant) && empty($this->prenom_enfant)) {
            return null;
        }
        return trim(($this->nom_enfant ?? '') . ' ' . ($this->prenom_enfant ?? ''));
    }

    public function getAgeEnfantAttribute()
    {
        return $this->date_naissance_enfant ? 
            Carbon::parse($this->date_naissance_enfant)->age : null;
    }

    public function getDureeMariageAnneesAttribute()
    {
        return $this->date_mariage ? 
            Carbon::parse($this->date_mariage)->diffInYears(Carbon::now()) : null;
    }

    /**
     * Vérifie si la kafala a un fichier PDF
     * Compatible avec les deux stratégies (BLOB ou fichier)
     */
    public function getAFichierPdfAttribute()
    {
        return !empty($this->fichier_pdf) || !empty($this->fichier_pdf_path);
    }

    /**
     * Retourne la taille formatée du fichier PDF
     */
    public function getFichierPdfTailleFormateeAttribute()
    {
        if (!$this->fichier_pdf_taille) return null;
        
        $bytes = $this->fichier_pdf_taille;
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' B';
    }

    /**
     * NOUVEAU: Vérifie si les informations de l'enfant sont complètes
     */
    public function getEnfantInfoCompleteAttribute()
    {
        return !empty($this->nom_enfant) && 
               !empty($this->prenom_enfant) && 
               !empty($this->sexe_enfant);
    }

    /**
     * NOUVEAU: Retourne un statut de complétude du dossier
     */
    public function getStatutCompletudeAttribute()
    {
        $score = 0;
        $total = 8;

        // Informations obligatoires (toujours présentes)
        $score += 4; // nom_pere, prenom_pere, nom_mere, prenom_mere, telephone, adresse

        // Informations optionnelles importantes
        if (!empty($this->email)) $score++;
        if (!empty($this->date_mariage)) $score++;
        if ($this->enfant_info_complete) $score++;
        if ($this->a_fichier_pdf) $score++;

        if ($score === $total) return 'Complet';
        if ($score >= 6) return 'Quasi-complet';
        if ($score >= 4) return 'Partiel';
        return 'Minimal';
    }

    // Scopes for common queries
    public function scopeWithPdf($query)
    {
        return $query->where(function($q) {
            $q->whereNotNull('fichier_pdf')
              ->orWhereNotNull('fichier_pdf_path');
        });
    }

    public function scopeWithoutPdf($query)
    {
        return $query->whereNull('fichier_pdf')
                    ->whereNull('fichier_pdf_path');
    }

    public function scopeBySexeEnfant($query, $sexe)
    {
        return $query->where('sexe_enfant', $sexe);
    }

    /**
     * AMÉLIORÉ: Scope pour chercher seulement dans les champs non-null
     */
    public function scopeSearch($query, $term)
    {
        return $query->where(function($q) use ($term) {
            $q->where('reference', 'like', "%{$term}%")
              ->orWhere('nom_pere', 'like', "%{$term}%")
              ->orWhere('prenom_pere', 'like', "%{$term}%")
              ->orWhere('nom_mere', 'like', "%{$term}%")
              ->orWhere('prenom_mere', 'like', "%{$term}%")
              ->orWhere('telephone', 'like', "%{$term}%")
              ->orWhere('cin_pere', 'like', "%{$term}%")
              ->orWhere('cin_mere', 'like', "%{$term}%")
              ->orWhere('adresse', 'like', "%{$term}%")
              // Recherche conditionnelle pour les champs enfant et email
              ->orWhere(function($subQ) use ($term) {
                  $subQ->whereNotNull('email')
                       ->where('email', 'like', "%{$term}%");
              })
              ->orWhere(function($subQ) use ($term) {
                  $subQ->whereNotNull('nom_enfant')
                       ->where('nom_enfant', 'like', "%{$term}%");
              })
              ->orWhere(function($subQ) use ($term) {
                  $subQ->whereNotNull('prenom_enfant')
                       ->where('prenom_enfant', 'like', "%{$term}%");
              })
              ->orWhere(function($subQ) use ($term) {
                  $subQ->whereNotNull('cin_enfant')
                       ->where('cin_enfant', 'like', "%{$term}%");
              });
        });
    }

    /**
     * NOUVEAU: Scope pour les dossiers avec informations enfant complètes
     */
    public function scopeWithCompleteEnfantInfo($query)
    {
        return $query->whereNotNull('nom_enfant')
                    ->whereNotNull('prenom_enfant')
                    ->whereNotNull('sexe_enfant');
    }

    /**
     * NOUVEAU: Scope pour les dossiers avec informations enfant incomplètes
     */
    public function scopeWithIncompleteEnfantInfo($query)
    {
        return $query->where(function($q) {
            $q->whereNull('nom_enfant')
              ->orWhereNull('prenom_enfant')
              ->orWhereNull('sexe_enfant');
        });
    }

    /**
     * NOUVEAU: Scope pour filtrer par statut de complétude
     */
    public function scopeByStatutCompletude($query, $statut)
    {
        // Cette méthode pourrait être optimisée avec des requêtes SQL directes
        // Pour l'instant, on utilise une approche simple
        return $query->get()->filter(function($kafala) use ($statut) {
            return $kafala->statut_completude === $statut;
        });
    }

    /**
     * NOUVEAU: Mutateur pour générer automatiquement la référence
     */
    public function setReferenceAttribute($value)
    {
        if (empty($value)) {
            // Générer une référence automatique si vide
            $lastKafala = self::withTrashed()
                             ->orderBy('id', 'desc')
                             ->first();
            
            $nextNumber = 1;
            if ($lastKafala && $lastKafala->reference) {
                preg_match('/KAF-\d{4}-(\d+)/', $lastKafala->reference, $matches);
                if (!empty($matches[1])) {
                    $nextNumber = intval($matches[1]) + 1;
                }
            }
            
            $this->attributes['reference'] = 'KAF-' . date('Y') . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
        } else {
            $this->attributes['reference'] = $value;
        }
    }

    /**
     * NOUVEAU: Méthode pour valider la complétude des données obligatoires
     */
    public function validateRequiredFields()
    {
        $errors = [];

        if (empty($this->nom_pere)) $errors[] = 'Nom du père requis';
        if (empty($this->prenom_pere)) $errors[] = 'Prénom du père requis';
        if (empty($this->nom_mere)) $errors[] = 'Nom de la mère requis';
        if (empty($this->prenom_mere)) $errors[] = 'Prénom de la mère requis';
        if (empty($this->telephone)) $errors[] = 'Téléphone requis';
        if (empty($this->adresse)) $errors[] = 'Adresse requise';

        return $errors;
    }

    /**
     * NOUVEAU: Méthode pour obtenir des warnings sur les données manquantes
     */
    public function getDataWarnings()
    {
        $warnings = [];

        if (empty($this->email)) $warnings[] = 'Email non renseigné';
        if (empty($this->date_mariage)) $warnings[] = 'Date de mariage non renseignée';
        if (empty($this->nom_enfant)) $warnings[] = 'Informations de l\'enfant incomplètes';
        if (!$this->a_fichier_pdf) $warnings[] = 'Aucun document PDF attaché';

        return $warnings;
    }
}