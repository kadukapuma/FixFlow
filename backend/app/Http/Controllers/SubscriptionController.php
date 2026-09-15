<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionReceipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SubscriptionController extends Controller
{
    public function show()
    {
        $company = app('currentCompany');

        return response()->json([
            'subscription_price' => $company->subscription_price,
            'active_until' => $company->active_until,
            'grace_ends_at' => $company->grace_ends_at,
            'status' => $company->subscriptionStatus(),
            'receipts' => SubscriptionReceipt::where('company_id', $company->id)
                ->orderByDesc('created_at')
                ->get(['id', 'file_path', 'status', 'amount', 'note', 'rejection_reason', 'created_at', 'reviewed_at']),
        ]);
    }

    public function storeReceipt(Request $request)
    {
        $company = app('currentCompany');

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $path = $request->file('file')->store("receipts/{$company->id}", 'public');

        $receipt = SubscriptionReceipt::create([
            'company_id' => $company->id,
            'file_path' => $path,
            'status' => SubscriptionReceipt::STATUS_PENDING,
            'amount' => $validated['amount'] ?? null,
            'note' => $validated['note'] ?? null,
        ]);

        return response()->json([
            'message' => 'Receipt uploaded. An admin will review it shortly.',
            'receipt' => $receipt,
        ], 201);
    }

    /**
     * Stream a receipt file belonging to the current tenant. A plain <img>
     * tag can't carry the Sanctum bearer token, so the frontend fetches this
     * authenticated route via axios and displays it as a blob URL instead
     * (same technique as CompanySettingsController::logo()).
     */
    public function receiptFile(SubscriptionReceipt $receipt)
    {
        $company = app('currentCompany');

        if ($receipt->company_id !== $company->id) {
            abort(404);
        }

        /** @var \Illuminate\Filesystem\FilesystemAdapter $publicDisk */
        $publicDisk = Storage::disk('public');

        if (!$receipt->file_path || !$publicDisk->exists($receipt->file_path)) {
            abort(404);
        }

        return response($publicDisk->get($receipt->file_path), 200, [
            'Content-Type' => $publicDisk->mimeType($receipt->file_path) ?: 'application/octet-stream',
        ]);
    }
}
