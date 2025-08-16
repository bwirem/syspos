<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;


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
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        //Share flash messages with Inertia globally
        Inertia::share([
            'flash' => function () {
                return [
                    'success' => session('success'),
                    'info' => session('info'),
                    'error' => session('error'),
                ];
            },
        ]);
    }
}
