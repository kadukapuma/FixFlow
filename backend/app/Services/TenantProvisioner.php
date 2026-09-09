<?php

namespace App\Services;

use App\Models\Company;
use App\Models\TenantUser;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

class TenantProvisioner
{
    /**
     * Build the tenant database connection config array for a company.
     */
    public static function connectionConfig(Company $company): array
    {
        return [
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
        ];
    }

    /**
     * Point the "company" connection at this tenant's database.
     */
    public static function useConnection(Company $company): void
    {
        Config::set('database.connections.company', self::connectionConfig($company));

        DB::purge('company');
        DB::reconnect('company');
    }

    /**
     * Create the physical tenant database on the shared MySQL server.
     */
    public function createDatabase(Company $company): void
    {
        $database = $company->database_name;

        // CREATE DATABASE cannot be parameter-bound, so only allow a strict,
        // system-generated identifier format through to the raw statement.
        if (!preg_match('/^[a-z0-9_]+$/', $database)) {
            throw new \InvalidArgumentException("Invalid tenant database name: {$database}");
        }

        DB::statement("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }

    /**
     * Run the application migrations against the tenant database.
     */
    public function migrate(Company $company): void
    {
        self::useConnection($company);

        Artisan::call('migrate', [
            '--database' => 'company',
            '--force' => true,
        ]);
    }

    /**
     * Create the initial owner/admin user inside the tenant database.
     */
    public function createOwnerUser(Company $company): TenantUser
    {
        self::useConnection($company);

        return TenantUser::create([
            'name' => $company->owner_name,
            'email' => $company->owner_email,
            'password' => $company->owner_password, // already hashed at registration time
        ]);
    }

    /**
     * Full provisioning pipeline run when a company registration is approved.
     */
    public function provision(Company $company): void
    {
        $this->createDatabase($company);
        $this->migrate($company);
        $this->createOwnerUser($company);
    }
}
