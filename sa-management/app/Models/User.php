<?php
// app/Models/User.php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use App\Notifications\CustomVerifyEmail;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\AdminUserEmailVerified;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'nom_user',
        'prenom_user',
        'email',
        'password',
        'tel_user',
        'adresse_user',
        'activer_compte',
        'role_id',
        'date_suppression',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'activer_compte' => 'boolean',
        'date_suppression' => 'datetime',
    ];

    /**
     * Send the email verification notification.
     */
    public function sendEmailVerificationNotification()
    {
        $this->notify(new CustomVerifyEmail);
    }

    /**
     * Send the password reset notification.
     */
    public function sendPasswordResetNotification($token)
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * Mark the given user's email as verified and notify admin.
     */
    public function markEmailAsVerified()
    {
        // Marquer l'email comme vérifié
        $wasNotVerified = !$this->hasVerifiedEmail();
        
        $result = $this->forceFill([
            'email_verified_at' => $this->freshTimestamp(),
        ])->save();

        // Si l'email vient d'être vérifié (pas déjà vérifié), notifier l'admin
        if ($result && $wasNotVerified) {
            $this->notifyAdminEmailVerified();
        }

        return $result;
    }

    /**
     * Notify admin that user has verified email
     */
    protected function notifyAdminEmailVerified()
    {
        try {
            // Récupérer tous les administrateurs
            $admins = static::whereHas('role', function ($query) {
                $query->where('libelle', 'Administrateur Informatique');
            })
            ->where('activer_compte', true)
            ->whereNotNull('email_verified_at')
            ->whereNull('date_suppression')
            ->get();

            // Si aucun admin trouvé, utiliser une email par défaut depuis la config
            if ($admins->isEmpty()) {
                $adminEmail = config('mail.admin_email', 'admin@upas.ma');
                Notification::route('mail', $adminEmail)
                    ->notify(new AdminUserEmailVerified($this));
                
                \Log::info('Admin notification sent to default email', [
                    'user_id' => $this->id,
                    'admin_email' => $adminEmail
                ]);
            } else {
                // Notifier tous les administrateurs
                Notification::send($admins, new AdminUserEmailVerified($this));
                
                \Log::info('Admin notification sent to admins', [
                    'user_id' => $this->id,
                    'admin_count' => $admins->count(),
                    'admin_emails' => $admins->pluck('email')->toArray()
                ]);
            }

        } catch (\Exception $e) {
            \Log::error('Failed to send admin notification for email verification', [
                'user_id' => $this->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function securityAnswers()
    {
        return $this->hasMany(UserSecurityAnswer::class);
    }

    public function setPasswordAttribute($value)
    {
        if ($value) {
            $this->attributes['password'] = Hash::make($value);
        }
    }

    public function isAdmin()
    {
        return $this->role && $this->role->libelle === 'Administrateur Informatique';
    }

    public function canLogin()
    {
        return $this->hasVerifiedEmail() && 
               $this->activer_compte && 
               $this->role_id && 
               !$this->date_suppression;
    }

    public function assistancesMedicales()
    {
        return $this->hasMany(AssistanceMedicale::class);
    }



    
}