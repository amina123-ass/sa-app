<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class EtatDon extends Model
{
    use HasFactory;

    protected $table = 'etat_dons'; // Assurez-vous que cette table existe

    protected $fillable = [
        'libelle',
        'date_suppression'
    ];

    protected $dates = [
        'date_suppression',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'date_suppression' => 'datetime'
    ];

    // Scope pour exclure les éléments supprimés
    public function scopeActive($query)
    {
        return $query->whereNull('date_suppression');
    }

    // Mutateur pour la suppression douce
    public function softDelete()
    {
        $this->update(['date_suppression' => Carbon::now()]);
    }

    // Vérifier si l'élément est supprimé
    public function isDeleted()
    {
        return !is_null($this->date_suppression);
    }
}