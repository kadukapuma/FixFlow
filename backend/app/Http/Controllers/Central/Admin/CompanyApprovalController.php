<?php

namespace App\Http\Controllers\Central\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ProvisionTenantCompany;
use App\Models\Company;
use Illuminate\Http\Request;

class CompanyApprovalController extends Controller
{
    public function index()
    {
        return response()->json(
            Company::orderByDesc('created_at')->get()
        );
    }

    public function approve(Company $company)
    {
        if (!in_array($company->status, [Company::STATUS_PENDING, Company::STATUS_FAILED], true)) {
            return response()->json([
                'message' => 'Only pending or failed companies can be approved.',
            ], 422);
        }

        $company->update([
            'status' => Company::STATUS_PROVISIONING,
            'rejection_reason' => null,
            'provisioning_error' => null,
        ]);

        ProvisionTenantCompany::dispatch($company);

        return response()->json([
            'message' => 'Approval queued. The tenant database is being provisioned.',
            'company' => $company->fresh(),
        ]);
    }

    public function reject(Request $request, Company $company)
    {
        if (!in_array($company->status, [Company::STATUS_PENDING, Company::STATUS_FAILED], true)) {
            return response()->json([
                'message' => 'Only pending or failed companies can be rejected.',
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
