<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Item;
use App\Models\Service;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;

class ServicePdfGenerator
{
    /**
     * Render the branded service order PDF and return the raw PDF bytes.
     *
     * $logoDataOverride, when given, is used instead of looking up the
     * company's saved logo — used for previewing an unsaved logo upload.
     */
    public static function render(Service $service, Company $company, ?string $logoDataOverride = null): string
    {
        $termsLines = collect(preg_split('/\r\n|\r|\n/', (string) $company->terms_and_conditions))
            ->map(fn ($line) => trim(preg_replace('/^\d+[.)]\s*/', '', trim($line))))
            ->filter(fn ($line) => $line !== '')
            ->values();

        return Pdf::loadView('pdf.service', [
            'service' => $service,
            'company' => $company,
            'logoData' => self::resolveLogoData($company, $logoDataOverride),
            'termsLines' => $termsLines,
        ])->output();
    }

    /**
     * Render a service invoice (work performed + final price) and return the
     * raw PDF bytes. $service must have its `work` relation loaded.
     */
    public static function renderInvoice(Service $service, Company $company, ?string $logoDataOverride = null): string
    {
        $workTotal = (float) $service->work->sum('cost');

        return Pdf::loadView('pdf.invoice', [
            'service' => $service,
            'company' => $company,
            'logoData' => self::resolveLogoData($company, $logoDataOverride),
            'workTotal' => $workTotal,
        ])->output();
    }

    /**
     * Resolve the base64 data URI for a company's logo, or null if it has
     * none. $override, when given, is used instead of looking up the saved
     * logo — used for previewing an unsaved logo upload.
     */
    private static function resolveLogoData(Company $company, ?string $override): ?string
    {
        if ($override !== null) {
            return $override;
        }

        /** @var FilesystemAdapter $publicDisk */
        $publicDisk = Storage::disk('public');

        if (!$company->logo_path || !$publicDisk->exists($company->logo_path)) {
            return null;
        }

        $contents = $publicDisk->get($company->logo_path);
        $mime = $publicDisk->mimeType($company->logo_path) ?: 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode($contents);
    }

    /**
     * Render a sample service PDF so a company can preview their branding
     * (logo, address, terms) before any real service has been created.
     */
    public static function renderPreview(Company $company, ?string $logoDataOverride = null): string
    {
        $service = new Service([
            'ref_no' => 'SAMPLE-0001',
            'fault' => 'Sample fault, e.g. screen flickering intermittently',
            'note' => 'Sample note shown here as an example.',
            'status' => 'pending',
            'price' => 1500,
            'service_date' => now()->toDateString(),
        ]);
        $service->incrementing = false;
        $service->id = 'PREVIEW';

        $service->setRelation('customer', new Customer(['name' => 'Sample Customer', 'phone' => '077 123 4567']));
        $service->setRelation('item', new Item(['name' => 'Sample Item', 'model' => 'Model X', 'serial_number' => 'SN-000000']));
        $service->setRelation('employee', new Employee(['name' => 'Sample Technician']));

        return self::render($service, $company, $logoDataOverride);
    }
}
