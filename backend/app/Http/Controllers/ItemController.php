<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ItemController extends Controller
{
    public function forCustomer(int $customerId)
    {
        Customer::findOrFail($customerId);

        $items = Item::where('customer_id', $customerId)
            ->with(['services' => fn ($query) => $query->latest('service_date')->latest('id')])
            ->latest()
            ->get()
            ->map(function (Item $item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'model' => $item->model,
                    'serial_number' => $item->serial_number,
                    'status' => $item->services->first()->status ?? null,
                ];
            });

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'customer_id' => ['required', 'integer', Rule::exists(Customer::class, 'id')],
        ]);

        $item = Item::create($validated);

        return response()->json([
            'message' => 'Item created successfully.',
            'item' => $item,
        ], 201);
    }
}
