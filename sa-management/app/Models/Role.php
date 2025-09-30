<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'libelle',
        'description',
        'date_suppression',
    ];

    protected $casts = [
        'date_suppression' => 'datetime',
    ];

    /**
     * Relation avec les utilisateurs
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Scope pour exclure les rôles supprimés
     */
    public function scopeActive($query)
    {
        return $query->whereNull('date_suppression');
    }

    /**
     * Vérifier si le rôle est un rôle système
     */
    public function isSystemRole()
    {
        $systemRoles = ['Administrateur Informatique'];
        return in_array($this->libelle, $systemRoles);
    }

    /**
     * Vérifier si le rôle peut être supprimé
     */
    public function canBeDeleted()
    {
        return !$this->isSystemRole() && $this->users()->whereNull('date_suppression')->count() === 0;
    }

    /**
     * Obtenir le nombre d'utilisateurs actifs avec ce rôle
     */
    public function getActiveUsersCountAttribute()
    {
        return $this->users()
            ->where('activer_compte', true)
            ->whereNotNull('email_verified_at')
            ->whereNull('date_suppression')
            ->count();
    }

    /**
     * Obtenir le nombre total d'utilisateurs avec ce rôle
     */
    public function getTotalUsersCountAttribute()
    {
        return $this->users()->whereNull('date_suppression')->count();
    }
}