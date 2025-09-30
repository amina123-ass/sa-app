<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Participant extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'prenom',
        'adresse',
        'telephone',
        'email',
        'date_naissance',
        'sexe',
        'cin',
        'statut',
        'commentaire',
        'campagne_id',
        'date_appel',
        'date_suppression'
    ];

    protected $casts = [
        'date_naissance' => 'date',
        'date_appel' => 'datetime',
        'date_suppression' => 'datetime'
    ];

    const STATUTS = [
        'en_attente' => 'En attente',
        'oui' => 'Oui',
        'non' => 'Non',
        'refuse' => 'Refusé',
        'répondu' => 'Répondu',
        'ne repond pas' => 'Ne répond pas',
        'non contacté' => 'Non contacté'
    ];

    // Relations
    public function campagne()
    {
        return $this->belongsTo(CampagneMedicale::class, 'campagne_id');
    }

    public function logAppels()
    {
        return $this->hasMany(LogAppel::class)->whereNull('date_suppression');
    }

    // Scopes
    public function scopeActif($query)
    {
        return $query->whereNull('date_suppression');
    }

    public function scopeParStatut($query, $statut)
    {
        return $query->where('statut', $statut);
    }

    public function scopeContactes($query)
    {
        return $query->whereIn('statut', ['répondu', 'ne repond pas']);
    }

    public function scopeNonContactes($query)
    {
        return $query->where('statut', 'non contacté');
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

    public function getStatutLibelleAttribute()
    {
        return self::STATUTS[$this->statut] ?? $this->statut;
    }

    // Méthodes
    public function changerStatut($nouveauStatut, $userId, $commentaire = null)
    {
        $ancienStatut = $this->statut;
        
        // Créer le log
        LogAppel::create([
            'participant_id' => $this->id,
            'user_id' => $userId,
            'statut_avant' => $ancienStatut,
            'statut_apres' => $nouveauStatut,
            'commentaire' => $commentaire
        ]);

        // Mettre à jour le participant
        $this->update([
            'statut' => $nouveauStatut,
            'date_appel' => Carbon::now(),
            'commentaire' => $commentaire
        ]);

        return $this;
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