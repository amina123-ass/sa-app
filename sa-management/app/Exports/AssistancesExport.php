<?php
// app/Exports/AssistancesExport.php

namespace App\Exports;

use App\Models\AssistanceMedicale;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AssistancesExport implements FromQuery, WithHeadings, WithMapping, WithStyles
{
    protected $filters;

    public function __construct($filters = [])
    {
        $this->filters = $filters;
    }

    public function query()
    {
        $query = AssistanceMedicale::active()
            ->with([
                'beneficiaire',
                'typeAssistance',
                'detailsTypeAssistance',
                'campagne',
                'etatDon'
            ]);

        // Appliquer les filtres
        if (!empty($this->filters['type_assistance_id'])) {
            $query->where('type_assistance_id', $this->filters['type_assistance_id']);
        }

        if (!empty($this->filters['campagne_id'])) {
            $query->where('campagne_id', $this->filters['campagne_id']);
        }

        if (!empty($this->filters['etat_don_id'])) {
            $query->where('etat_don_id', $this->filters['etat_don_id']);
        }

        if (!empty($this->filters['date_debut'])) {
            $query->where('date_assistance', '>=', $this->filters['date_debut']);
        }

        if (!empty($this->filters['date_fin'])) {
            $query->where('date_assistance', '<=', $this->filters['date_fin']);
        }

        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->whereHas('beneficiaire', function($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('prenom', 'like', "%{$search}%")
                  ->orWhere('tel', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('date_assistance', 'desc');
    }

    public function headings(): array
    {
        return [
            'ID',
            'Bénéficiaire',
            'Téléphone',
            'Type d\'assistance',
            'Détails',
            'Campagne',
            'Date assistance',
            'Montant (MAD)',
            'État',
            'Observations',
            'Date de création'
        ];
    }

    public function map($assistance): array
    {
        return [
            $assistance->id,
            $assistance->beneficiaire ? 
                $assistance->beneficiaire->nom . ' ' . $assistance->beneficiaire->prenom : '',
            $assistance->beneficiaire->tel ?? '',
            $assistance->typeAssistance->libelle ?? '',
            $assistance->detailsTypeAssistance->libelle ?? '',
            $assistance->campagne->nom_campagne ?? 'Hors campagne',
            $assistance->date_assistance ? $assistance->date_assistance->format('d/m/Y') : '',
            $assistance->montant ?? 0,
            $assistance->etatDon->libelle ?? '',
            $assistance->observations,
            $assistance->created_at->format('d/m/Y H:i')
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}        