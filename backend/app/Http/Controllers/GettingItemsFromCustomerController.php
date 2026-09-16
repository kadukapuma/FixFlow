<?php

namespace App\Http\Controllers;

use App\Models\GettingItemsFromCustomer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GettingItemsFromCustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = GettingItemsFromCustomer::latest();

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where('item_name', 'like', "%{$search}%");
        }

        // Pickers (e.g. the received-items step on the service wizard) need
        // every item at once, not one page of the table view.
        if ($request->boolean('all')) {
            return response()->json($query->get());
        }

        return response()->json($query->paginate((int) $request->query('per_page', 15)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_name' => ['required', 'string', 'max:255', Rule::unique(GettingItemsFromCustomer::class, 'item_name')],
        ]);

        $item = GettingItemsFromCustomer::create($validated);

        return response()->json([
            'message' => 'Item created successfully.',
            'item' => $item,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $item = GettingItemsFromCustomer::findOrFail($id);

        $validated = $request->validate([
            'item_name' => ['required', 'string', 'max:255', Rule::unique(GettingItemsFromCustomer::class, 'item_name')->ignore($item->id)],
        ]);

        $item->update($validated);

        return response()->json([
            'message' => 'Item updated successfully.',
            'item' => $item,
        ]);
    }

    public function destroy(int $id)
    {
        $item = GettingItemsFromCustomer::findOrFail($id);

        if ($item->services()->exists()) {
            return response()->json([
                'message' => 'Cannot delete this item: it is linked to existing services.',
            ], 409);
        }

        $item->delete();

        return response()->json([
            'message' => 'Item deleted successfully.',
        ]);
    }
}
