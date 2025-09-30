<?php

namespace Database\Seeders;

use App\Models\Assistance;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $this->call([
            RoleSeeder::class,
            SecurityQuestionSeeder::class,
            AdminSeeder::class,
            AssistanceMedicaleSeeder::class,
        ]);
    }
}