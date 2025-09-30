<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class IndicateurCampagne extends Model
{
    use HasFactory;

    protected $table = 'indicateurs_campagnes';

    protected $fillable = [
        'campagne_id',
        'indicateur',
        'sous_indicateur',
        'valeur',
        'description',
        'date_suppression'
    ];

    protected $casts = [
        'valeur' => 'decimal:2',
        'date_suppression' => 'datetime'
    ];

    // Relations
    public function campagne()
    {
        return $this->belongsTo(CampagneMedicale::class, 'campagne_id');
    }

    // Scopes
    public function scopeActif($query)
    {
        return $query->whereNull('date_suppression');
    }

    public function scopeParIndicateur($query, $indicateur)
    {
        return $query->where('indicateur', $indicateur);
    }

    // Méthodes
    public function softDelete()
    {
        $this->update(['date_suppression' => Carbon::now()]);
    }

    public function restore()
    {
        $this->update(['date_suppression' => null]);
    }
}