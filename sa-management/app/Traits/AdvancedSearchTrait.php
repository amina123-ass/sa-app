<?php
namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait AdvancedSearchTrait
{
    /**
     * Appliquer des filtres de recherche avancée
     */
    public function scopeAdvancedSearch(Builder $query, array $filters)
    {
        foreach ($filters as $key => $value) {
            if (empty($value)) continue;

            switch ($key) {
                case 'search_text':
                    $this->applyTextSearch($query, $value);
                    break;
                    
                case 'date_range':
                    $this->applyDateRange($query, $value);
                    break;
                    
                case 'amount_range':
                    $this->applyAmountRange($query, $value);
                    break;
                    
                case 'status':
                    $query->whereIn('etat_don_id', (array) $value);
                    break;
                    
                case 'type_assistance':
                    $query->whereIn('type_assistance_id', (array) $value);
                    break;
                    
                case 'campagne':
                    $query->whereIn('campagne_id', (array) $value);
                    break;
            }
        }

        return $query;
    }

    private function applyTextSearch($query, $text)
    {
        $query->where(function ($q) use ($text) {
            $q->whereHas('beneficiaire', function ($benefQuery) use ($text) {
                $benefQuery->where('nom', 'like', "%{$text}%")
                          ->orWhere('prenom', 'like', "%{$text}%");
            })
            ->orWhere('observations', 'like', "%{$text}%");
        });
    }

    private function applyDateRange($query, $range)
    {
        if (isset($range['start'])) {
            $query->whereDate('date_assistance', '>=', $range['start']);
        }
        if (isset($range['end'])) {
            $query->whereDate('date_assistance', '<=', $range['end']);
        }
    }

    private function applyAmountRange($query, $range)
    {
        if (isset($range['min'])) {
            $query->where('montant', '>=', $range['min']);
        }
        if (isset($range['max'])) {
            $query->where('montant', '<=', $range['max']);
        }
    }
}