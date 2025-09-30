<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\AssistanceMedicale;
use App\Observers\AssistanceMedicaleObserver;
use App\Models\Participant;
use App\Observers\ParticipantObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot()
{
    // Enregistrer l'observer
    AssistanceMedicale::observe(AssistanceMedicaleObserver::class);
    Participant::observe(ParticipantObserver::class);
}
}
