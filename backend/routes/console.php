<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Requires the host's OS-level cron (or Task Scheduler on Windows) to call
// `php artisan schedule:run` at least once a minute — this file only
// registers what runs, it doesn't make anything call it.
Schedule::command('companies:deactivate-expired')->dailyAt('12:00');
