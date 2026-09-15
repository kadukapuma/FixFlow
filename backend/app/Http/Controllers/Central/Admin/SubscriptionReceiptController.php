<?php

namespace App\Http\Controllers\Central\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionReceipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SubscriptionReceiptController extends Controller
{
    public function index(Request $request)
    {
        $query = SubscriptionReceipt::with('company:id,name,subdomain')
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->get());
    }

    /**
     * Stream a receipt file for admin preview. Same authenticated-stream
     * technique as the tenant-side SubscriptionController::receiptFile().
     */
    public function file(SubscriptionReceipt $receipt)
    {
        /** @var \Illuminate\Filesystem\FilesystemAdapter $publicDisk */
        $publicDisk = Storage::disk('public');

        if (!$receipt->file_path || !$publicDisk->exists($receipt->file_path)) {
            abort(404);
        }

        return response($publicDisk->get($receipt->file_path), 200, [
            'Content-Type' => $publicDisk->mimeType($receipt->file_path) ?: 'application/octet-stream',
        ]);
    }

    /**
     * Delete the uploaded file to reclaim server storage, once it's been
     * reviewed. The receipt row (amount, note, status, review history)
     * stays, just without a file behind it.
     */
    public function destroyFile(SubscriptionReceipt $receipt)
    {
        if ($receipt->status === SubscriptionReceipt::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only reviewed (approved or rejected) receipts can have their file deleted.',
            ], 422);
        }

        if (!$receipt->file_path) {
            return response()->json([
                'message' => 'This receipt has no file to delete.',
            ], 422);
        }

        Storage::disk('public')->delete($receipt->file_path);

        $receipt->update(['file_path' => null]);

        return response()->json([
            'message' => 'Receipt file deleted.',
            'receipt' => $receipt->fresh(),
        ]);
    }

    public function approve(Request $request, SubscriptionReceipt $receipt)
    {
        if ($receipt->status !== SubscriptionReceipt::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only pending receipts can be approved.',
            ], 422);
        }

        $company = $receipt->company;

        $newActiveUntil = ($company->active_until && $company->active_until->isFuture()
            ? $company->active_until
            : now())->copy()->addDays(30);

        $company->update([
            'active_until' => $newActiveUntil,
            'grace_ends_at' => $newActiveUntil->copy()->addDays(5),
            // Only auto-reactivate if the cron (not an admin) was what
            // deactivated this company for non-payment.
            ...($company->subscription_deactivated_at ? ['is_active' => true] : []),
            'subscription_deactivated_at' => null,
        ]);

        $receipt->update([
            'status' => SubscriptionReceipt::STATUS_APPROVED,
            'reviewed_by' => $request->user()->name,
            'reviewed_at' => now(),
            'rejection_reason' => null,
        ]);

        return response()->json([
            'message' => 'Receipt approved. Subscription renewed.',
            'receipt' => $receipt->fresh(),
            'company' => $company->fresh(),
        ]);
    }

    public function reject(Request $request, SubscriptionReceipt $receipt)
    {
        if ($receipt->status !== SubscriptionReceipt::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only pending receipts can be rejected.',
            ], 422);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $receipt->update([
            'status' => SubscriptionReceipt::STATUS_REJECTED,
            'reviewed_by' => $request->user()->name,
            'reviewed_at' => now(),
            'rejection_reason' => $validated['reason'] ?? null,
        ]);

        return response()->json([
            'message' => 'Receipt rejected.',
            'receipt' => $receipt->fresh(),
        ]);
    }
}
