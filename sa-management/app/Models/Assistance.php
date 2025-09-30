<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Assistance extends Model
{
    use HasFactory;

    protected $fillable = [
        'numero_dossier',
        'type_assistance',
        'statut',
        'nom_beneficiaire',
        'prenom_beneficiaire',
        'date_naissance',
        'lieu_naissance',
        'sexe',
        'telephone',
        'adresse',
        'situation_familiale',
        'user_id',
        'situation_id',
        'date_enregistrement',
        'date_suppression',
    ];

    protected $casts = [
        'date_naissance' => 'date',
        'date_enregistrement' => 'datetime',
        'date_suppression' => 'datetime',
    ];

    const TYPES_ASSISTANCE = [
        'medical' => 'Assistance Médicale',
        'kafala' => 'Kafala',
        'lunette' => 'Lunettes',
        'transport' => 'Transport',
        'appareillage' => 'Appareillage Orthopédique',
        'autre' => 'Autre Assistance'
    ];

    const STATUTS = [
        'enregistre' => 'Enregistré',
        'en_cours' => 'En cours de traitement',
        'valide' => 'Validé',
        'non_valide' => 'Non validé',
        'incomplet' => 'Incomplet'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function situation()
    {
        return $this->belongsTo(Situation::class);
    }

    public function assistanceMedicale()
    {
        return $this->hasOne(AssistanceMedicale::class);
    }

    public function kafala()
    {
        return $this->hasOne(Kafala::class);
    }

    public function lunette()
    {
        return $this->hasOne(Lunette::class);
    }

    public function transport()
    {
        return $this->hasOne(Transport::class);
    }

    public function appareillage()
    {
        return $this->hasOne(Appareillage::class);
    }

    public function autreAssistance()
    {
        return $this->hasOne(AutreAssistance::class);
    }

    public function documents()
    {
        return $this->hasMany(AssistanceDocument::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->numero_dossier)) {
                $model->numero_dossier = self::generateNumeroDossier();
            }
        });
    }

    public static function generateNumeroDossier()
    {
        $year = date('Y');
        $lastNumber = self::where('numero_dossier', 'like', $year . '%')
                         ->orderBy('numero_dossier', 'desc')
                         ->first();

        if ($lastNumber) {
            $lastNum = intval(substr($lastNumber->numero_dossier, -4));
            $newNum = $lastNum + 1;
        } else {
            $newNum = 1;
        }

        return $year . str_pad($newNum, 4, '0', STR_PAD_LEFT);
    }
}