<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportLog extends Model
{
    use HasFactory;

    protected $table = 'import_logs';

    protected $fillable = [
        'type',
        'fichier_origine',
        'lignes_total',
        'lignes_importees',
        'lignes_erreur',
        'erreurs',
        'user_id',
        'campagne_id',
        'date_import'
    ];

    protected $casts = [
        'erreurs' => 'array',
        'date_import' => 'datetime',
        'lignes_total' => 'integer',
        'lignes_importees' => 'integer',
        'lignes_erreur' => 'integer'
    ];

    // Relations
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function campagne()
    {
        return $this->belongsTo(CampagneMedicale::class, 'campagne_id');
    }

    // Accesseurs
    public function getTauxSuccesAttribute()
    {
        return $this->lignes_total > 0 
            ? round(($this->lignes_importees / $this->lignes_total) * 100, 2) 
            : 0;
    }

    public function getEstReussiAttribute()
    {
        return $this->lignes_erreur === 0;
    }

    // Scopes
    public function scopeParType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeReussis($query)
    {
        return $query->where('lignes_erreur', 0);
    }

    public function scopeAvecErreurs($query)
    {
        return $query->where('lignes_erreur', '>', 0);
    }
}