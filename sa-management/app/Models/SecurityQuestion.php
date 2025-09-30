<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SecurityQuestion extends Model
{
    use HasFactory;

    protected $fillable = ['question', 'active'];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function userAnswers()
    {
        return $this->hasMany(UserSecurityAnswer::class);
    }
}