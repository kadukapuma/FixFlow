<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Services\TenantProvisioner;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DeactivateExpiredCompanies extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'companies:deactivate-expired';

    /**
     * The console command description.
     */
    protected $description = 'Deactivate approved companies whose subscription grace period has ended, and revoke their session tokens';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $companies = Company::where('status', Company::STATUS_APPROVED)
            ->where('is_active', true)
            ->whereNotNull('grace_ends_at')
            ->where('grace_ends_at', '<', now())
            ->get();

        if ($companies->isEmpty()) {
            $this->info('No expired subscriptions found.');
            return self::SUCCESS;
        }

        foreach ($companies as $company) {
            $this->info("Deactivating {$company->name} (subscription expired {$company->grace_ends_at}).");

            $company->update([
                'is_active' => false,
                'subscription_deactivated_at' => now(),
            ]);

            try {
                TenantProvisioner::useConnection($company);
                DB::connection('company')->table('personal_access_tokens')->truncate();
            } catch (\Throwable $e) {
                Log::error('Failed to revoke session tokens for expired company', [
                    'company_id' => $company->id,
                    'error' => $e->getMessage(),
                ]);
            } finally {
                DB::purge('company');
            }
        }

        $this->info("Deactivated {$companies->count()} company(ies) with expired subscriptions.");

        return self::SUCCESS;
    }
}
