<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class BeneficiaireIndicateur extends Model
{
    use HasFactory;

    protected $table = 'beneficiaire_indicateurs';

    protected $fillable = [
        'beneficiaire_id',
        'indicateur',
        'sous_indicateur',
        'valeur',
        'date_suppression'
    ];

    protected $casts = [
        'date_suppression' => 'datetime'
    ];

    // Relations
    public function beneficiaire()
    {
        return $this->belongsTo(Beneficiaire::class);
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