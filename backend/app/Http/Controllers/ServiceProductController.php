<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Service;
use App\Models\ServiceProduct;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class ServiceProductController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'service_id' => ['required', 'integer', Rule::exists(Service::class, 'id')],
        ]);

        $serviceProducts = ServiceProduct::where('service_id', $validated['service_id'])
            ->with('product:id,name,sale_price,border_price')
            ->latest()
            ->get();

        return response()->json($serviceProducts);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_id' => ['required', 'integer', Rule::exists(Service::class, 'id')],
            'product_id' => ['required', 'integer', Rule::exists(Product::class, 'id')],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $unitPrice = $validated['unit_price'] ?? (float) ($product->sale_price ?? 0);

        if ($response = $this->floorPriceViolation($product, $unitPrice)) {
            return $response;
        }

        $serviceProduct = ServiceProduct::create([
            'service_id' => $validated['service_id'],
            'product_id' => $validated['product_id'],
            'quantity' => $validated['quantity'] ?? 1,
            'unit_price' => $unitPrice,
        ]);

        return response()->json([
            'message' => 'Product added to service.',
            'service_product' => $serviceProduct->load('product:id,name,sale_price,border_price'),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $serviceProduct = ServiceProduct::findOrFail($id);

        $validated = $request->validate([
            'quantity' => ['nullable', 'integer', 'min:1'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $product = $serviceProduct->product;
        $unitPrice = $validated['unit_price'] ?? (float) $serviceProduct->unit_price;

        if ($response = $this->floorPriceViolation($product, $unitPrice)) {
            return $response;
        }

        $serviceProduct->update([
            'quantity' => $validated['quantity'] ?? $serviceProduct->quantity,
            'unit_price' => $unitPrice,
        ]);

        return response()->json([
            'message' => 'Service product updated.',
            'service_product' => $serviceProduct->load('product:id,name,sale_price,border_price'),
        ]);
    }

    public function destroy(int $id)
    {
        $serviceProduct = ServiceProduct::findOrFail($id);
        $serviceProduct->delete();

        return response()->json([
            'message' => 'Product removed from service.',
        ]);
    }

    private function floorPriceViolation(Product $product, float $unitPrice): ?JsonResponse
    {
        if ($product->border_price !== null && $unitPrice < (float) $product->border_price) {
            $floor = number_format((float) $product->border_price, 2);

            return response()->json([
                'message' => "Unit price can't be less than the border price (Rs. {$floor}) for this product.",
                'errors' => [
                    'unit_price' => ["Unit price can't be less than the border price (Rs. {$floor})."],
                ],
            ], 422);
        }

        return null;
    }
}
