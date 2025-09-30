<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class LogAppel extends Model
{
    use HasFactory;

    protected $table = 'log_appels';

    protected $fillable = [
        'participant_id',
        'user_id',
        'statut_avant',
        'statut_apres',
        'commentaire',
        'date_suppression'
    ];

    protected $casts = [
        'date_suppression' => 'datetime'
    ];

    // Relations
    public function participant()
    {
        return $this->belongsTo(Participant::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

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
}