<?php

namespace App\Jobs;

use App\Models\Company;
use App\Services\TenantProvisioner;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProvisionTenantCompany implements ShouldQueue
{
    use Queueable;

    /**
     * Provisioning touches another database and can be slow; don't let
     * Laravel silently retry it (that would mean re-running CREATE
     * DATABASE / migrate / create-owner against a half-provisioned tenant).
     */
    public $tries = 1;

    public function __construct(public Company $company)
    {
    }

    public function handle(TenantProvisioner $provisioner): void
    {
        $provisioner->provision($this->company);

        $this->company->update([
            'status' => Company::STATUS_APPROVED,
            'is_active' => true,
            'provisioning_error' => null,
        ]);
    }

    public function failed(Throwable $e): void
    {
        Log::error('Tenant provisioning failed', [
            'company_id' => $this->company->id,
            'error' => $e->getMessage(),
        ]);

        $this->company->update([
            'status' => Company::STATUS_FAILED,
            'is_active' => false,
            'provisioning_error' => $e->getMessage(),
        ]);
    }
}
