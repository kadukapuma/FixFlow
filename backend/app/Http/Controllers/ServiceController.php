<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Employee;
use App\Models\Item;
use App\Models\Service;
use App\Services\ServicePdfGenerator;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Service::with(['customer', 'item', 'employee'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->get());
    }

    public function show(int $id)
    {
        $service = Service::with(['customer', 'item', 'employee'])->findOrFail($id);

        return response()->json($service);
    }

    public function search(Request $request)
    {
        $query = trim((string) $request->query('q', ''));

        if ($query === '') {
            return response()->json(['message' => 'A service ID or reference number is required.'], 422);
        }

        $serviceQuery = Service::with(['customer', 'item', 'employee']);

        if (ctype_digit($query)) {
            $serviceQuery->where(function ($q) use ($query) {
                $q->where('id', $query)->orWhere('ref_no', $query);
            });
        } else {
            $serviceQuery->where('ref_no', $query);
        }

        $service = $serviceQuery->first();

        if (!$service) {
            return response()->json(['message' => 'Service not found.'], 404);
        }

        return response()->json($service);
    }

    public function store(Request $request)
    {
        if ($request->input('ref_no') === '') {
            $request->merge(['ref_no' => null]);
        }

        $validated = $request->validate([
            'ref_no' => ['nullable', 'string', 'max:255', Rule::unique(Service::class, 'ref_no')],
            'item_id' => ['required', 'integer', Rule::exists(Item::class, 'id')],
            'employee_id' => ['required', 'integer', Rule::exists(Employee::class, 'id')],
            'customer_id' => ['required', 'integer', Rule::exists(Customer::class, 'id')],
            'fault' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
            'status' => ['required', 'string', Rule::in(['pending', 'in_progress', 'completed', 'delivered'])],
            'price' => ['nullable', 'numeric', 'min:0'],
            'service_date' => ['nullable', 'date'],
        ]);

        $customer = Customer::find($validated['customer_id']);

        if ($customer->is_suspended) {
            return response()->json([
                'message' => "This customer is suspended and can't be booked for a new service.",
            ], 422);
        }

        $validated['service_date'] ??= now()->toDateString();

        $service = Service::create($validated);
        $service->load(['customer', 'item', 'employee']);

        return response()->json([
            'message' => 'Service created successfully.',
            'service' => $service,
            'pdf_url' => "/services/{$service->id}/pdf",
        ], 201);
    }

    public function pdf(int $id)
    {
        $service = Service::with(['customer', 'item', 'employee'])->findOrFail($id);
        $pdf = ServicePdfGenerator::render($service, app('currentCompany'));

        $filename = 'service-'.($service->ref_no ?: $service->id).'.pdf';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    public function invoice(int $id)
    {
        $service = Service::with(['customer', 'item', 'employee', 'work'])->findOrFail($id);

        if ($service->price === null) {
            return response()->json([
                'message' => 'Set a final price before generating an invoice.',
            ], 422);
        }

        $pdf = ServicePdfGenerator::renderInvoice($service, app('currentCompany'));

        $filename = 'invoice-'.($service->ref_no ?: $service->id).'.pdf';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    public function start(Request $request, int $id)
    {
        $service = Service::findOrFail($id);

        if ($service->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending services can be started.',
            ], 422);
        }

        $validated = $request->validate([
            'started_date' => ['nullable', 'date'],
        ]);

        $startedDate = $validated['started_date'] ?? now()->toDateString();

        if ($service->service_date && $startedDate < $service->service_date->toDateString()) {
            return response()->json([
                'message' => 'Start date cannot be before the service date.',
            ], 422);
        }

        $service->update(['status' => 'in_progress', 'started_date' => $startedDate]);

        return response()->json([
            'message' => 'Service started.',
            'service' => $service->load(['customer', 'item', 'employee']),
        ]);
    }

    public function complete(Request $request, int $id)
    {
        $service = Service::findOrFail($id);

        if ($service->status !== 'in_progress') {
            return response()->json([
                'message' => 'Only services in progress can be marked completed.',
            ], 422);
        }

        $validated = $request->validate([
            'completed_date' => ['nullable', 'date'],
        ]);

        $completedDate = $validated['completed_date'] ?? now()->toDateString();

        if ($service->started_date && $completedDate < $service->started_date->toDateString()) {
            return response()->json([
                'message' => 'Completed date cannot be before the start date.',
            ], 422);
        }

        $service->update(['status' => 'completed', 'completed_date' => $completedDate]);

        return response()->json([
            'message' => 'Service marked as completed.',
            'service' => $service->load(['customer', 'item', 'employee']),
        ]);
    }

    public function deliver(Request $request, int $id)
    {
        $service = Service::findOrFail($id);

        if ($service->status !== 'completed') {
            return response()->json([
                'message' => 'Only completed services can be marked delivered.',
            ], 422);
        }

        $validated = $request->validate([
            'delivered_date' => ['nullable', 'date'],
        ]);

        $deliveredDate = $validated['delivered_date'] ?? now()->toDateString();

        if ($service->completed_date && $deliveredDate < $service->completed_date->toDateString()) {
            return response()->json([
                'message' => 'Delivered date cannot be before the completed date.',
            ], 422);
        }

        $service->update(['status' => 'delivered', 'delivered_date' => $deliveredDate]);

        return response()->json([
            'message' => 'Service marked as delivered.',
            'service' => $service->load(['customer', 'item', 'employee']),
        ]);
    }

    public function updatePrice(Request $request, int $id)
    {
        $service = Service::findOrFail($id);

        $validated = $request->validate([
            'price' => ['required', 'numeric', 'min:0'],
        ]);

        $service->update($validated);

        return response()->json([
            'message' => 'Service price updated.',
            'service' => $service->load(['customer', 'item', 'employee']),
        ]);
    }
}
