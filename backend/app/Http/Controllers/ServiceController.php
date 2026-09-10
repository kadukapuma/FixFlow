<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Employee;
use App\Models\Item;
use App\Models\Service;
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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_id' => ['required', 'integer', Rule::exists(Item::class, 'id')],
            'employee_id' => ['required', 'integer', Rule::exists(Employee::class, 'id')],
            'customer_id' => ['required', 'integer', Rule::exists(Customer::class, 'id')],
            'fault' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
            'status' => ['required', 'string', Rule::in(['pending', 'in_progress', 'completed', 'delivered'])],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $service = Service::create($validated);

        return response()->json([
            'message' => 'Service created successfully.',
            'service' => $service->load(['customer', 'item', 'employee']),
        ], 201);
    }

    public function start(int $id)
    {
        $service = Service::findOrFail($id);

        if ($service->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending services can be started.',
            ], 422);
        }

        $service->update(['status' => 'in_progress']);

        return response()->json([
            'message' => 'Service started.',
            'service' => $service->load(['customer', 'item', 'employee']),
        ]);
    }

    public function complete(int $id)
    {
        $service = Service::findOrFail($id);

        if ($service->status !== 'in_progress') {
            return response()->json([
                'message' => 'Only services in progress can be marked completed.',
            ], 422);
        }

        $service->update(['status' => 'completed']);

        return response()->json([
            'message' => 'Service marked as completed.',
            'service' => $service->load(['customer', 'item', 'employee']),
        ]);
    }

    public function deliver(int $id)
    {
        $service = Service::findOrFail($id);

        if ($service->status !== 'completed') {
            return response()->json([
                'message' => 'Only completed services can be marked delivered.',
            ], 422);
        }

        $service->update(['status' => 'delivered']);

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
