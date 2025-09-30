<?php

namespace App\Exports;

use App\Models\Beneficiaire;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithEvents;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Maatwebsite\Excel\Events\AfterSheet;

class BeneficiairesExport implements FromQuery, WithHeadings, WithMapping, WithStyles, WithEvents, ShouldAutoSize
{
    protected array $filters;
    protected bool $includeAdditional;

    public function __construct(array $filters = [])
    {
        $this->filters = $filters;
        $this->includeAdditional = (bool)($filters['include_additional_columns'] ?? false);
    }

    public function query(): Builder
    {
        $q = Beneficiaire::query()
            ->with(['situation'])   // لتفادي N+1
            ->whereNull('deleted_at');

        // campagne_id
        if (!empty($this->filters['campagne_id'])) {
            $q->where('campagne_id', $this->filters['campagne_id']);
        }

        // situation_id
        if (!empty($this->filters['situation_id'])) {
            $q->where('situation_id', $this->filters['situation_id']);
        }

        // sexe
        if (!empty($this->filters['sexe'])) {
            $q->where('sexe', $this->filters['sexe']);
        }

        // search (nom, prenom, tel)
        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $q->where(function ($qq) use ($search) {
                $qq->where('nom', 'like', "%{$search}%")
                   ->orWhere('prenom', 'like', "%{$search}%")
                   ->orWhere('tel', 'like', "%{$search}%");
            });
        }

        // status_filter (اختَر المنطق المناسب لمشروعك)
        // إن كان عندك عمود participants.statut = 'oui' بدّل الشرط هنا
        if (!empty($this->filters['status_filter'])) {
            $status = strtolower($this->filters['status_filter']);
            if ($status === 'oui') {
                // مثال: اعتماد قرار القبول
                $q->where('decision', 'accepte');
                // أو لو عندك عمود 'statut' في نفس الجدول:
                // $q->where('statut', 'oui');
            }
        }

        return $q->orderBy('nom');
    }

    public function headings(): array
    {
        $base = [
            'ID',
            'Nom',
            'Prénom',
            'Date de naissance',
            'Âge',
            'Téléphone',
            'Email',
            'Adresse',
            'Sexe',
            'CIN',
            'Situation',
            'Date de création',
            'Dernière modification',
        ];

        if ($this->includeAdditional) {
            $base = array_merge($base, [
                'Enfants scolarisés',
                'Décision',
                'Côté',
            ]);
        }

        return $base;
    }

    public function map($b): array
    {
        // حساب العمر إذا ما كان عمود age موجود
        $age = null;
        if (!empty($b->date_naissance)) {
            $birth = $b->date_naissance instanceof \DateTimeInterface
                ? $b->date_naissance
                : Carbon::parse($b->date_naissance);
            $age = Carbon::now()->diffInYears($birth);
        } elseif (isset($b->age)) {
            $age = $b->age;
        }

        $row = [
            $b->id,
            $b->nom,
            $b->prenom,
            !empty($b->date_naissance)
                ? ( $b->date_naissance instanceof \DateTimeInterface
                    ? $b->date_naissance->format('d/m/Y')
                    : Carbon::parse($b->date_naissance)->format('d/m/Y') )
                : '',
            $age ?? '',
            $b->tel, // ⚠ أنت تستعمل tel في DB وليس telephone
            $b->email,
            $b->adresse,
            $b->sexe === 'M' ? 'Masculin' : ($b->sexe === 'F' ? 'Féminin' : ''),
            $b->cin,
            $b->situation->libelle ?? '',
            $b->created_at ? Carbon::parse($b->created_at)->format('d/m/Y H:i') : '',
            $b->updated_at ? Carbon::parse($b->updated_at)->format('d/m/Y H:i') : '',
        ];

        if ($this->includeAdditional) {
            $row[] = isset($b->enfants_scolarises) ? ( (int)$b->enfants_scolarises ? 'Oui' : 'Non' ) : '';
            $row[] = $b->decision ?? ''; // valeurs: accepte / en_attente / refuse...
            $row[] = $b->cote ?? '';     // unilatéral/bilatéral إن وجد
        }

        return $row;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->freezePane('A2');       // تثبيت رؤوس الأعمدة
                $highestColumn = $sheet->getHighestColumn();
                $highestRow    = $sheet->getHighestRow();
                $sheet->setAutoFilter("A1:{$highestColumn}1"); // فلتر على الصف الأول
            },
        ];
    }
}
