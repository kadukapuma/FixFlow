<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::latest();
        $this->applyPickerFilters($request, $query, ['name', 'contact_person', 'phone']);

        // Pickers (e.g. a supplier dropdown on the item form) need every
        // supplier at once, not one page of the table view.
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
            'email' => ['nullable', 'email', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'message' => 'Supplier created successfully.',
            'supplier' => $supplier,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
        ]);

        $supplier->update($validated);

        return response()->json([
            'message' => 'Supplier updated successfully.',
            'supplier' => $supplier,
        ]);
    }

    public function destroy(int $id)
    {
        $supplier = Supplier::findOrFail($id);

        if (\App\Models\Purchase::where('supplier_id', $supplier->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this supplier: it is linked to existing purchases.',
            ], 409);
        }

        if (\App\Models\PurchaseOrder::where('supplier_id', $supplier->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this supplier: it is linked to existing purchase orders.',
            ], 409);
        }

        $supplier->delete();

        return response()->json([
            'message' => 'Supplier deleted successfully.',
        ]);
    }

    public function activate(int $id)
    {
        $supplier = Supplier::findOrFail($id);

        $supplier->update(['is_active' => true]);

        return response()->json([
            'message' => 'Supplier activated.',
            'supplier' => $supplier,
        ]);
    }

    public function deactivate(int $id)
    {
        $supplier = Supplier::findOrFail($id);

        $supplier->update(['is_active' => false]);

        return response()->json([
            'message' => 'Supplier deactivated.',
            'supplier' => $supplier,
        ]);
    }
}
