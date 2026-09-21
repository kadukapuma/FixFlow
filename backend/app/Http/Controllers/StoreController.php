<?php

namespace App\Http\Controllers;

use App\Models\ServiceProduct;
use App\Models\StockMovement;
use App\Models\Store;
use Illuminate\Http\Request;

class StoreController extends Controller
{
    public function index(Request $request)
    {
        $query = Store::latest();
        $this->applyPickerFilters($request, $query, ['name', 'contact_person', 'phone']);

        // Pickers (e.g. a store dropdown on the item form) need every
        // store at once, not one page of the table view.
        if ($request->boolean('all')) {
            return response()->json($query->get());
        }

        return response()->json($query->paginate((int) $request->query('per_page', 15)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'contact_person' => ['nullable', 'string', 'max:255'],
        ]);

        $store = Store::create($validated);

        return response()->json([
            'message' => 'Store created successfully.',
            'store' => $store,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $store = Store::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'contact_person' => ['nullable', 'string', 'max:255'],
        ]);

        $store->update($validated);

        return response()->json([
            'message' => 'Store updated successfully.',
            'store' => $store,
        ]);
    }

    public function destroy(int $id)
    {
        $store = Store::findOrFail($id);

        if (StockMovement::where('store_id', $store->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this store: it has stock movement history.',
            ], 409);
        }

        if (ServiceProduct::where('store_id', $store->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this store: it is linked to existing service line items.',
            ], 409);
        }

        if (\App\Models\PurchaseOrder::where('store_id', $store->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this store: it is linked to existing purchase orders.',
            ], 409);
        }

        if (\App\Models\Purchase::where('store_id', $store->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this store: it is linked to existing purchases.',
            ], 409);
        }

        if (\App\Models\PurchaseReturn::where('store_id', $store->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this store: it is linked to existing purchase returns.',
            ], 409);
        }

        $store->delete();

        return response()->json([
            'message' => 'Store deleted successfully.',
        ]);
    }

    public function activate(int $id)
    {
        $store = Store::findOrFail($id);

        $store->update(['is_active' => true]);

        return response()->json([
            'message' => 'Store activated.',
            'store' => $store,
        ]);
    }

    public function deactivate(int $id)
    {
        $store = Store::findOrFail($id);

        $store->update(['is_active' => false]);

        return response()->json([
            'message' => 'Store deactivated.',
            'store' => $store,
        ]);
    }
}
