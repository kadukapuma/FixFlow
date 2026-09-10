<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Item;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    public function index()
    {
        return response()->json(
            Customer::latest()->get()
        );
    }

    public function search(Request $request)
    {
        $query = trim((string) $request->query('q', ''));

        if ($query === '') {
            return response()->json([]);
        }

        $customers = Customer::where('nic', 'like', "%{$query}%")
            ->orWhere('phone', 'like', "%{$query}%")
            ->orWhere('name', 'like', "%{$query}%")
            ->limit(10)
            ->get();

        return response()->json($customers);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'nic' => ['required', 'string', 'max:255', Rule::unique(Customer::class, 'nic')],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $customer = Customer::create($validated);

        return response()->json([
            'message' => 'Customer created successfully.',
            'customer' => $customer,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $customer = Customer::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'nic' => ['required', 'string', 'max:255', Rule::unique(Customer::class, 'nic')->ignore($customer->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $customer->update($validated);

        return response()->json([
            'message' => 'Customer updated successfully.',
            'customer' => $customer,
        ]);
    }

    public function destroy(int $id)
    {
        $customer = Customer::findOrFail($id);

        if (
            Item::where('customer_id', $customer->id)->exists() ||
            Service::where('customer_id', $customer->id)->exists()
        ) {
            return response()->json([
                'message' => 'Cannot delete this customer: they are linked to existing items or services.',
            ], 409);
        }

        $customer->delete();

        return response()->json([
            'message' => 'Customer deleted successfully.',
        ]);
    }

    public function suspend(int $id)
    {
        $customer = Customer::findOrFail($id);

        $customer->update(['is_suspended' => true]);

        return response()->json([
            'message' => 'Customer suspended.',
            'customer' => $customer,
        ]);
    }

    public function unsuspend(int $id)
    {
        $customer = Customer::findOrFail($id);

        $customer->update(['is_suspended' => false]);

        return response()->json([
            'message' => 'Customer reinstated.',
            'customer' => $customer,
        ]);
    }
}
