<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class ValidPrescription implements Rule
{
    private $prescriptionDate;
    
    public function __construct($prescriptionDate)
    {
        $this->prescriptionDate = $prescriptionDate;
    }

    public function passes($attribute, $value)
    {
        if (!$this->prescriptionDate || !$value) {
            return true;
        }
        
        $prescription = \Carbon\Carbon::parse($this->prescriptionDate);
        $validity = \Carbon\Carbon::parse($value);
        
        // La validité doit être entre 3 mois et 2 ans après la prescription
        return $validity->isAfter($prescription->addMonths(3)) && 
               $validity->isBefore($prescription->addYears(2));
    }

    public function message()
    {
        return 'La date de validité doit être entre 3 mois et 2 ans après la prescription.';
    }
}