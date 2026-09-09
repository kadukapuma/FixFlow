<?php

namespace App\Http\Controllers\Central\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\TenantProvisioner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CompanyApprovalController extends Controller
{
    public function index()
    {
        return response()->json(
            Company::orderByDesc('created_at')->get()
        );
    }

    public function approve(Company $company, TenantProvisioner $provisioner)
    {
        if ($company->status !== Company::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only pending companies can be approved.',
            ], 422);
        }

        try {
            $provisioner->provision($company);
        } catch (\Throwable $e) {
            Log::error('Tenant provisioning failed', [
                'company_id' => $company->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Provisioning failed: ' . $e->getMessage(),
            ], 500);
        }

        $company->update([
            'status' => Company::STATUS_APPROVED,
            'is_active' => true,
            'rejection_reason' => null,
        ]);

        return response()->json([
            'message' => 'Company approved and provisioned.',
            'company' => $company->fresh(),
        ]);
    }

    public function reject(Request $request, Company $company)
    {
        if ($company->status !== Company::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only pending companies can be rejected.',
            ], 422);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $company->update([
            'status' => Company::STATUS_REJECTED,
            'is_active' => false,
            'rejection_reason' => $validated['reason'] ?? null,
        ]);

        return response()->json([
            'message' => 'Company registration rejected.',
            'company' => $company->fresh(),
        ]);
    }
}
