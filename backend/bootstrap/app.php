<?php

use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\IdentifyCompany;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        $middleware->alias([
            'company' => IdentifyCompany::class,
            'super_admin' => EnsureSuperAdmin::class,
        ]);

        // IdentifyCompany must resolve the tenant database connection before
        // the "auth" middleware tries to look up a token/user, otherwise
        // auth runs against the wrong (central) database connection. The
        // priority list keys auth middleware by this interface, not the
        // concrete Authenticate class.
        $middleware->prependToPriorityList(
            before: \Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests::class,
            prepend: IdentifyCompany::class,
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();
