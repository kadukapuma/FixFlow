<?php

namespace App\Http\Controllers\Central\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ProvisionTenantCompany;
use App\Models\Company;
use App\Services\TenantProvisioner;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CompanyApprovalController extends Controller
{
    public function index(Request $request)
    {
        $query = Company::orderByDesc('created_at');

        $this->applyFilters($query, $request);

        // The CSV export needs the full filtered set, not just one page.
        if ($request->boolean('export')) {
            return response()->json($query->get());
        }

        return response()->json($query->paginate((int) $request->query('per_page', 15)));
    }

    /**
     * Aggregate counts and a 7-day registration chart, computed over the
     * whole table rather than whatever page the admin currently has open.
     */
    public function stats()
    {
        $counts = [
            'all' => Company::count(),
            'pending' => Company::where('status', Company::STATUS_PENDING)->count(),
            'provisioning' => Company::where('status', Company::STATUS_PROVISIONING)->count(),
            'approved' => Company::where('status', Company::STATUS_APPROVED)->where('is_active', true)->count(),
            'deactivated' => Company::where('status', Company::STATUS_APPROVED)->where('is_active', false)->count(),
            'rejected' => Company::where('status', Company::STATUS_REJECTED)->count(),
            'failed' => Company::where('status', Company::STATUS_FAILED)->count(),
        ];

        $byDay = Company::where('created_at', '>=', now()->subDays(6)->startOfDay())
            ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
            ->groupBy('day')
            ->pluck('count', 'day');

        $chart = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->startOfDay();
            $chart[] = [
                'label' => $date->format('d M'),
                'count' => (int) ($byDay[$date->toDateString()] ?? 0),
            ];
        }

        return response()->json(['counts' => $counts, 'chart' => $chart]);
    }

    /**
     * "deactivated" isn't a real status column value — it's an approved
     * company with is_active=false — so it needs its own branch here to
     * match the effectiveStatus() logic the frontend already uses.
     */
    private function applyFilters(Builder $query, Request $request): void
    {
        $status = $request->query('status');

        if ($status && $status !== 'all') {
            if ($status === 'deactivated') {
                $query->where('status', Company::STATUS_APPROVED)->where('is_active', false);
            } elseif ($status === Company::STATUS_APPROVED) {
                $query->where('status', Company::STATUS_APPROVED)->where('is_active', true);
            } else {
                $query->where('status', $status);
            }
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('subdomain', 'like', "%{$search}%")
                    ->orWhere('owner_name', 'like', "%{$search}%")
                    ->orWhere('owner_email', 'like', "%{$search}%");
            });
        }
    }

    public function approve(Request $request, Company $company)
    {
        if (!in_array($company->status, [Company::STATUS_PENDING, Company::STATUS_FAILED], true)) {
            return response()->json([
                'message' => 'Only pending or failed companies can be approved.',
            ], 422);
        }

        $validated = $request->validate([
            'subscription_price' => [
                $company->subscription_price === null ? 'required' : 'nullable',
                'numeric',
                'min:0',
            ],
        ]);

        $company->update([
            'status' => Company::STATUS_PROVISIONING,
            'rejection_reason' => null,
            'provisioning_error' => null,
            ...(isset($validated['subscription_price']) ? ['subscription_price' => $validated['subscription_price']] : []),
        ]);

        ProvisionTenantCompany::dispatch($company);

        return response()->json([
            'message' => 'Approval queued. The tenant database is being provisioned.',
            'company' => $company->fresh(),
        ]);
    }

    public function updatePrice(Request $request, Company $company)
    {
        $validated = $request->validate([
            'subscription_price' => ['required', 'numeric', 'min:0'],
        ]);

        // Companies approved before subscription tracking existed have no
        // active_until/grace_ends_at at all, so they'd never enter a billing
        // cycle. Starting the clock here, the first time a price is set on
        // an already-approved company, brings them onto the same schedule
        // new approvals get automatically.
        if ($company->status === Company::STATUS_APPROVED && !$company->active_until) {
            $validated['active_until'] = now()->addDays(30);
            $validated['grace_ends_at'] = now()->addDays(35);
        }

        $company->update($validated);

        return response()->json([
            'message' => 'Subscription price updated.',
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

    public function deactivate(Company $company)
    {
        if ($company->status !== Company::STATUS_APPROVED || !$company->is_active) {
            return response()->json([
                'message' => 'Only active, approved companies can be deactivated.',
            ], 422);
        }

        $company->update(['is_active' => false]);

        return response()->json([
            'message' => 'Company deactivated. Their team can no longer sign in.',
            'company' => $company->fresh(),
        ]);
    }

    public function activate(Company $company)
    {
        if ($company->status !== Company::STATUS_APPROVED || $company->is_active) {
            return response()->json([
                'message' => 'Only deactivated, approved companies can be reactivated.',
            ], 422);
        }

        $company->update(['is_active' => true]);

        return response()->json([
            'message' => 'Company reactivated.',
            'company' => $company->fresh(),
        ]);
    }

    /**
     * Permanently delete a company: its central record, any subscription
     * receipt files, and its physical tenant database. Irreversible.
     */
    public function destroy(Company $company, TenantProvisioner $provisioner)
    {
        foreach ($company->subscriptionReceipts as $receipt) {
            if ($receipt->file_path) {
                Storage::disk('public')->delete($receipt->file_path);
            }
        }

        DB::transaction(function () use ($company, $provisioner) {
            $provisioner->dropDatabase($company);
            $company->delete();
        });

        return response()->json([
            'message' => 'Company and its database were permanently deleted.',
        ]);
    }
}
