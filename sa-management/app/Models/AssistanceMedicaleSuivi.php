<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssistanceMedicaleSuivi extends Model
{
    use HasFactory;

    protected $table = 'assistance_medicales_suivi';

    protected $fillable = [
        'assistance_medicale_id',
        'type_evenement',
        'description',
        'donnees_avant',
        'donnees_apres',
        'user_id',
        'ip_address',
        'user_agent'
    ];

    protected $casts = [
        'donnees_avant' => 'array',
        'donnees_apres' => 'array'
    ];

    // ===== RELATIONS =====

    public function assistanceMedicale()
    {
        return $this->belongsTo(AssistanceMedicale::class, 'assistance_medicale_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // ===== SCOPES =====

    public function scopeParType(Builder $query, $type)
    {
        return $query->where('type_evenement', $type);
    }

    public function scopeParUtilisateur(Builder $query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}