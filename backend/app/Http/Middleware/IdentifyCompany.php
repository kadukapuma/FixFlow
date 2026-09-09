<?php

namespace App\Http\Middleware;

use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class IdentifyCompany
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = $request->getHost();

        /*
        |--------------------------------------------------------------------------
        | LOCAL DEVELOPMENT
        |--------------------------------------------------------------------------
        |
        | company01.localhost
        | company02.localhost
        |
        */

        if (str_ends_with($host, '.localhost')) {

            $subdomain = substr(
                $host,
                0,
                -strlen('.localhost')
            );
        } else {

            /*
            |--------------------------------------------------------------------------
            | Normal domain
            |--------------------------------------------------------------------------
            |
            | company01.sinarico.local
            |
            */

            $parts = explode('.', $host);

            if (count($parts) < 3) {
                return response()->json([
                    'message' => 'Company subdomain is required.',
                    'host' => $host,
                ], 400);
            }

            $subdomain = $parts[0];
        }

        /*
        |--------------------------------------------------------------------------
        | Find company
        |--------------------------------------------------------------------------
        */

        $company = Company::where('subdomain', $subdomain)
            ->where('is_active', true)
            ->first();

        if (!$company) {
            return response()->json([
                'message' => 'Company not found.',
                'host' => $host,
                'subdomain' => $subdomain,
            ], 404);
        }

        /*
        |--------------------------------------------------------------------------
        | Configure company database
        |--------------------------------------------------------------------------
        */

        Config::set('database.connections.company', [
            'driver' => 'mysql',
            'host' => $company->database_host,
            'port' => $company->database_port,
            'database' => $company->database_name,
            'username' => $company->database_username,
            'password' => $company->database_password,

            'unix_socket' => '',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
        ]);

        DB::purge('company');

        DB::reconnect('company');

        /*
        |--------------------------------------------------------------------------
        | Store current company
        |--------------------------------------------------------------------------
        */

        app()->instance('currentCompany', $company);

        return $next($request);
    }
}
