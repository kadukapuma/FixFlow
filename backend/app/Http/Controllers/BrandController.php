<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    public function index(Request $request)
    {
        $query = Brand::latest();
        $this->applyPickerFilters($request, $query);

        // Pickers (e.g. a brand dropdown on the item form) need every
        // brand at once, not one page of the table view.
        if ($request->boolean('all')) {
            return response()->json($query->get());
        }

        return response()->json($query->paginate((int) $request->query('per_page', 15)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique(Brand::class, 'name')],
            'description' => ['nullable', 'string'],
        ]);

        $brand = Brand::create($validated);

        return response()->json([
            'message' => 'Brand created successfully.',
            'brand' => $brand,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $brand = Brand::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique(Brand::class, 'name')->ignore($brand->id)],
            'description' => ['nullable', 'string'],
        ]);

        $brand->update($validated);

        return response()->json([
            'message' => 'Brand updated successfully.',
            'brand' => $brand,
        ]);
    }

    public function destroy(int $id)
    {
        $brand = Brand::findOrFail($id);

        if (Product::where('brand_id', $brand->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this brand: it is linked to existing products.',
            ], 409);
        }

        $brand->delete();

        return response()->json([
            'message' => 'Brand deleted successfully.',
        ]);
    }

    public function activate(int $id)
    {
        $brand = Brand::findOrFail($id);

        $brand->update(['is_active' => true]);

        return response()->json([
            'message' => 'Brand activated.',
            'brand' => $brand,
        ]);
    }

    public function deactivate(int $id)
    {
        $brand = Brand::findOrFail($id);

        $brand->update(['is_active' => false]);

        return response()->json([
            'message' => 'Brand deactivated.',
            'brand' => $brand,
        ]);
    }
}
