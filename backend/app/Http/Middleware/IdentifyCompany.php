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
            | acme.fixflow.kreethya.com -> "acme", where "fixflow.kreethya.com"
            | is one of TENANT_ROOT_DOMAINS (comma separated). Without that
            | setting, fall back to the first label of a 3+ label host.
            |
            */

            $subdomain = null;
            $roots = array_filter(array_map(
                'trim',
                explode(',', (string) config('app.tenant_root_domains'))
            ));

            if ($roots) {
                foreach ($roots as $root) {
                    $suffix = '.' . strtolower($root);
                    if (str_ends_with($host, $suffix)) {
                        $label = substr($host, 0, -strlen($suffix));
                        // Single label only ("acme", not "x.acme").
                        $subdomain = str_contains($label, '.') ? null : $label;
                        break;
                    }
                }
            } else {
                $parts = explode('.', $host);
                $subdomain = count($parts) >= 3 ? $parts[0] : null;
            }

            if (!$subdomain || $subdomain === 'www') {
                return response()->json([
                    'message' => 'Company subdomain is required.',
                    'host' => $host,
                ], 400);
            }
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
