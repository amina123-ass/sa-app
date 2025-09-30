<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class UserSecurityAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'security_question_id',
        'answer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function securityQuestion()
    {
        return $this->belongsTo(SecurityQuestion::class);
    }

    public function setAnswerAttribute($value)
    {
        $this->attributes['answer'] = Hash::make(strtolower(trim($value)));
    }

    public function checkAnswer($answer)
    {
        return Hash::check(strtolower(trim($answer)), $this->answer);
    }
}