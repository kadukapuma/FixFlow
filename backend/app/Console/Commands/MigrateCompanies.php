<?php

namespace App\Console\Commands;

use App\Models\Company;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MigrateCompanies extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'migrate:companies
                            {--fresh : Drop all tables and re-run all migrations}';

    /**
     * The console command description.
     */
    protected $description = 'Run Laravel migrations for all active company databases';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting company database migrations...');
        $this->newLine();

        // Read companies from the central database.
        $companies = Company::on('mysql')
            ->where('is_active', true)
            ->get();

        if ($companies->isEmpty()) {
            $this->warn('No active companies found.');
            return self::SUCCESS;
        }

        $this->info("Found {$companies->count()} active company database(s).");
        $this->newLine();

        $failed = [];

        foreach ($companies as $company) {
            $this->line('----------------------------------------');
            $this->info("Company: {$company->name}");
            $this->info("Subdomain: {$company->subdomain}");
            $this->info("Database: {$company->database_name}");

            try {
                // Configure the company database connection.
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

                // Remove any existing connection.
                DB::purge('company');

                // Test database connection.
                DB::connection('company')->getPdo();

                $this->info('✓ Database connection successful.');

                // Migration options.
                $migrationOptions = [
                    '--database' => 'company',
                    '--force' => true,
                ];

                // Run migrations.
                if ($this->option('fresh')) {
                    $this->warn('Running migrate:fresh...');

                    Artisan::call('migrate:fresh', $migrationOptions);
                } else {
                    $this->info('Running migrations...');

                    Artisan::call('migrate', $migrationOptions);
                }

                // Display migration output.
                $output = Artisan::output();

                if ($output) {
                    $this->line($output);
                }

                $this->info(
                    "✓ {$company->database_name} migrated successfully."
                );
            } catch (\Throwable $e) {
                $this->error(
                    "✗ Failed: {$company->database_name}"
                );

                $this->error($e->getMessage());

                $failed[] = [
                    'company' => $company->name,
                    'database' => $company->database_name,
                    'error' => $e->getMessage(),
                ];

                Log::error('Company migration failed', [
                    'company_id' => $company->id,
                    'company' => $company->name,
                    'database' => $company->database_name,
                    'error' => $e->getMessage(),
                ]);
            }

            // Disconnect before moving to the next company.
            DB::purge('company');

            $this->newLine();
        }

        $this->line('========================================');

        if (empty($failed)) {
            $this->info(
                '✓ All company databases migrated successfully.'
            );

            return self::SUCCESS;
        }

        $this->error(
            'Some company databases failed to migrate.'
        );

        foreach ($failed as $failure) {
            $this->error(
                "{$failure['company']} ({$failure['database']}): {$failure['error']}"
            );
        }

        return self::FAILURE;
    }
}
