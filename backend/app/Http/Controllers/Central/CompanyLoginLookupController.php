<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;

class CompanyLoginLookupController extends Controller
{
    /**
     * Resolve a company's subdomain and status from its subdomain or name,
     * so the frontend can redirect the user to the right tenant subdomain
     * to actually log in.
     */
    public function lookup(Request $request)
    {
        $validated = $request->validate([
            'company' => ['required', 'string', 'max:255'],
        ]);

        $needle = trim($validated['company']);

        $company = Company::where('subdomain', $needle)
            ->orWhere('name', $needle)
            ->first();

        if (!$company) {
            return response()->json([
                'message' => 'No company matches that name.',
            ], 404);
        }

        if ($company->status !== Company::STATUS_APPROVED) {
            return response()->json([
                'message' => match ($company->status) {
                    Company::STATUS_PENDING => 'This company registration is still awaiting approval.',
                    Company::STATUS_REJECTED => 'This company registration was rejected.',
                    default => 'This company is not available.',
                },
                'status' => $company->status,
            ], 403);
        }

        return response()->json([
            'subdomain' => $company->subdomain,
            'name' => $company->name,
            'status' => $company->status,
        ]);
    }
}
