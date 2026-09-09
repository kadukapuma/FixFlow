<?php

namespace App\Http\Middleware;

use App\Models\Company;
use App\Services\TenantProvisioner;
use Closure;
use Illuminate\Http\Request;
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
            | company01.fixflow.local
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
            ->where('status', Company::STATUS_APPROVED)
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

        TenantProvisioner::useConnection($company);

        /*
        |--------------------------------------------------------------------------
        | Store current company
        |--------------------------------------------------------------------------
        */

        app()->instance('currentCompany', $company);

        return $next($request);
    }
}
