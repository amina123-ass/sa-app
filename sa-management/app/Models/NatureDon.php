<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class NatureDon extends Model
{
    use HasFactory;

    protected $table = 'nature_dons'; // ou 'nature_dones' selon votre migration

    protected $fillable = [
        'libelle',
        'duree',
        'date_suppression'
    ];

    protected $dates = [
        'date_suppression',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'duree' => 'integer',
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