<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CompanyRegistrationController extends Controller
{
    /**
     * Subdomains that can never be claimed by a tenant.
     */
    protected const RESERVED_SUBDOMAINS = [
        'www', 'api', 'admin', 'app', 'mail', 'ftp', 'central', 'localhost',
    ];

    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'subdomain' => [
                'required', 'string', 'max:63', 'alpha_dash',
                Rule::notIn(self::RESERVED_SUBDOMAINS),
                Rule::unique('companies', 'subdomain'),
            ],
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'email', 'max:255'],
            'owner_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $subdomain = Str::lower($validated['subdomain']);

        $company = Company::create([
            'name' => $validated['company_name'],
            'subdomain' => $subdomain,
            'status' => Company::STATUS_PENDING,
            'is_active' => false,

            'owner_name' => $validated['owner_name'],
            'owner_email' => $validated['owner_email'],
            'owner_password' => Hash::make($validated['owner_password']),

            // Tenant databases live on the same MySQL server as the
            // central database; only the database name differs per tenant.
            // MySQL identifiers can't contain "-", but subdomains can
            // (alpha_dash allows it), so normalize dashes to underscores.
            'database_name' => Str::slug(config('app.name'), '_') . '_' . str_replace('-', '_', $subdomain),
            'database_host' => config('database.connections.mysql.host'),
            'database_port' => config('database.connections.mysql.port'),
            'database_username' => config('database.connections.mysql.username'),
            'database_password' => config('database.connections.mysql.password'),
        ]);

        return response()->json([
            'message' => 'Registration received. An administrator will review your request.',
            'company' => $company->only(['id', 'name', 'subdomain', 'status']),
        ], 201);
    }
}
