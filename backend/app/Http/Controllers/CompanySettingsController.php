<?php

namespace App\Http\Controllers;

use App\Services\ServicePdfGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CompanySettingsController extends Controller
{
    public function show()
    {
        $company = app('currentCompany');

        return response()->json([
            'name' => $company->name,
            'address' => $company->address,
            'phone' => $company->phone,
            'terms_and_conditions' => $company->terms_and_conditions,
            'has_logo' => (bool) $company->logo_path,
        ]);
    }

    /**
     * Stream the current company's logo image. A plain <img> tag can't carry
     * the Sanctum bearer token, so the frontend fetches this authenticated
     * route via axios and displays it as a blob URL instead.
     */
    public function logo()
    {
        $company = app('currentCompany');

        /** @var \Illuminate\Filesystem\FilesystemAdapter $publicDisk */
        $publicDisk = Storage::disk('public');

        if (!$company->logo_path || !$publicDisk->exists($company->logo_path)) {
            abort(404);
        }

        return response($publicDisk->get($company->logo_path), 200, [
            'Content-Type' => $publicDisk->mimeType($company->logo_path) ?: 'application/octet-stream',
        ]);
    }

    public function update(Request $request)
    {
        $company = app('currentCompany');

        $validated = $request->validate([
            'address' => ['nullable', 'string', 'max:2000'],
            'phone' => ['nullable', 'string', 'max:50'],
            'terms_and_conditions' => ['nullable', 'string', 'max:10000'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ]);

        if ($request->hasFile('logo')) {
            if ($company->logo_path) {
                Storage::disk('public')->delete($company->logo_path);
            }

            $validated['logo_path'] = $request->file('logo')->store('logos', 'public');
        }

        unset($validated['logo']);

        $company->update($validated);

        return response()->json([
            'message' => 'Company settings updated.',
            'name' => $company->name,
            'address' => $company->address,
            'phone' => $company->phone,
            'terms_and_conditions' => $company->terms_and_conditions,
            'has_logo' => (bool) $company->fresh()->logo_path,
        ]);
    }

    /**
     * Render a sample service PDF using the form's current (not-yet-saved)
     * branding, so the owner can preview it before saving.
     */
    public function preview(Request $request)
    {
        $validated = $request->validate([
            'address' => ['nullable', 'string', 'max:2000'],
            'phone' => ['nullable', 'string', 'max:50'],
            'terms_and_conditions' => ['nullable', 'string', 'max:10000'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ]);

        $company = clone app('currentCompany');
        $company->address = $validated['address'] ?? null;
        $company->phone = $validated['phone'] ?? null;
        $company->terms_and_conditions = $validated['terms_and_conditions'] ?? null;

        $logoDataOverride = null;

        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $logoDataOverride = 'data:'.$file->getMimeType().';base64,'.base64_encode(file_get_contents($file->getRealPath()));
        }

        $pdf = ServicePdfGenerator::renderPreview($company, $logoDataOverride);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="preview.pdf"',
        ]);
    }
}
