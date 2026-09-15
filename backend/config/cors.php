<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS) Configuration
|--------------------------------------------------------------------------
|
| The frontend is deployed as a separate project from this API, on its own
| domain plus a wildcard subdomain per tenant (acme.<FRONTEND_ROOT_DOMAIN>).
| FRONTEND_ROOT_DOMAIN must be set in .env to the frontend's root domain
| (e.g. "fixflow.kreethya.com") so both the root site and every tenant
| subdomain are allowed — a bare '*' origin can't be used together with
| Sanctum tokens sent via Authorization header from arbitrary subdomains.
|
*/

$frontendRootDomain = env('FRONTEND_ROOT_DOMAIN');

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [],

    'allowed_origins_patterns' => $frontendRootDomain
        ? ['#^https?://([a-z0-9-]+\.)?' . preg_quote($frontendRootDomain, '#') . '$#i']
        : [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
