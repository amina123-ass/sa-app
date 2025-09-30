<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class CampagneBeneficiaire extends Model
{
    use HasFactory;

    protected $table = 'campagne_beneficiaires';

    protected $fillable = [
        'campagne_id',
        'beneficiaire_id',
        'statut',
        'notes',
        'date_inscription',
        'date_suppression'
    ];

    protected $casts = [
        'date_inscription' => 'datetime',
        'date_suppression' => 'datetime'
    ];

    const STATUTS = [
        'en_attente' => 'En attente',
        'valide' => 'Validé',
        'refuse' => 'Refusé',
        'traite' => 'Traité'
    ];

    // Relations
    public function campagne()
    {
        return $this->belongsTo(CampagneMedicale::class, 'campagne_id');
    }

    public function beneficiaire()
    {
        return $this->belongsTo(Beneficiaire::class);
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

    // Méthodes
    public function softDelete()
    {
        $this->update(['date_suppression' => Carbon::now()]);
    }
}