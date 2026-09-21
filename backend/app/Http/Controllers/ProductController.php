<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ServiceProduct;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category:id,name', 'brand:id,name'])->latest();

        // Pickers need every product at once, not one page of the table view.
        if ($request->boolean('all')) {
            return response()->json($query->get());
        }

        return response()->json($query->paginate((int) $request->query('per_page', 15)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', Rule::exists(Category::class, 'id')],
            'brand_id' => ['nullable', 'integer', Rule::exists(Brand::class, 'id')],
            'purchase_price' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'border_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $product = Product::create($validated);
        $product->load(['category:id,name', 'brand:id,name']);

        return response()->json([
            'message' => 'Product created successfully.',
            'product' => $product,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', Rule::exists(Category::class, 'id')],
            'brand_id' => ['nullable', 'integer', Rule::exists(Brand::class, 'id')],
            'purchase_price' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'border_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $product->update($validated);
        $product->load(['category:id,name', 'brand:id,name']);

        return response()->json([
            'message' => 'Product updated successfully.',
            'product' => $product,
        ]);
    }

    public function destroy(int $id)
    {
        $product = Product::findOrFail($id);

        if (ServiceProduct::where('product_id', $product->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this product: it is linked to existing service line items.',
            ], 409);
        }

        if (StockMovement::where('product_id', $product->id)->exists()) {
            return response()->json([
                'message' => 'Cannot delete this product: it has stock movement history.',
            ], 409);
        }

        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully.',
        ]);
    }

    public function activate(int $id)
    {
        $product = Product::findOrFail($id);

        $product->update(['is_active' => true]);

        return response()->json([
            'message' => 'Product activated.',
            'product' => $product,
        ]);
    }

    public function deactivate(int $id)
    {
        $product = Product::findOrFail($id);

        $product->update(['is_active' => false]);

        return response()->json([
            'message' => 'Product deactivated.',
            'product' => $product,
        ]);
    }
}
