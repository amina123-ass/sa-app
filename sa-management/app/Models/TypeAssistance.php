<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class TypeAssistance extends Model
{
    use HasFactory;

    protected $table = 'types_assistance';

    protected $fillable = [
        'libelle',
        'description',
        'prix_unitaire',
        'active'
    ];

    protected $casts = [
        'date_suppression' => 'datetime',
        'prix_unitaire' => 'decimal:2',
        'active' => 'boolean'
    ];

    // ===== RELATIONS =====

    public function detailsTypeAssistances()
    {
        return $this->hasMany(DetailsTypeAssistance::class, 'type_assistance_id')
                    ->whereNull('date_suppression');
    }

    public function assistancesMedicales()
    {
        return $this->hasMany(AssistanceMedicale::class, 'type_assistance_id');
    }

    public function beneficiaires()
    {
        return $this->hasMany(Beneficiaire::class, 'type_assistance_id');
    }

    public function campagnes()
    {
        return $this->hasMany(CampagneMedicale::class, 'type_assistance_id');
    }

    // ===== SCOPES =====

    public function scopeActive(Builder $query)
    {
        return $query->where('active', true)->whereNull('date_suppression');
    }

    public function scopeAvecPrix(Builder $query)
    {
        return $query->whereNotNull('prix_unitaire');
    }
}