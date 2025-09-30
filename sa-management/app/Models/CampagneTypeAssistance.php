<?php
// app/Models/CampagneTypeAssistance.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CampagneTypeAssistance extends Model
{
    use HasFactory;

    protected $fillable = [
        'campagne_id',
        'type_assistance_id',
        'stock_disponible',
        'stock_alloue',
        'budget_alloue'
    ];

    protected $casts = [
        'budget_alloue' => 'decimal:2'
    ];

    // Relations
    public function campagne()
    {
        return $this->belongsTo(CampagneMedicale::class);
    }

    public function typeAssistance()
    {
        return $this->belongsTo(TypeAssistance::class);
    }

    // Accessors
    public function getStockRestantAttribute()
    {
        return $this->stock_disponible - $this->stock_alloue;
    }

    public function getPourcentageUtilisationAttribute()
    {
        return $this->stock_disponible > 0 
            ? round(($this->stock_alloue / $this->stock_disponible) * 100, 2) 
            : 0;
    }
}