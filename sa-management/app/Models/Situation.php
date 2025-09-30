<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Situation extends Model
{
    use HasFactory;

    protected $fillable = [
        'libelle',
        'date_suppression'
    ];

    protected $casts = [
        'date_suppression' => 'datetime'
    ];

    // Scopes
    public function scopeActif($query)
    {
        return $query->whereNull('date_suppression');
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