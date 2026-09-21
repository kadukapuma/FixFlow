<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ChecksStock;
use App\Models\Product;
use App\Models\Service;
use App\Models\ServiceProduct;
use App\Models\Store;
use App\Services\LedgerService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ServiceProductController extends Controller
{
    use ChecksStock;

    public function __construct(
        private StockService $stock,
        private LedgerService $ledger
    ) {
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'service_id' => ['required', 'integer', Rule::exists(Service::class, 'id')],
        ]);

        $serviceProducts = ServiceProduct::where('service_id', $validated['service_id'])
            ->with(['product:id,name,sale_price,border_price', 'store:id,name'])
            ->latest()
            ->get();

        return response()->json($serviceProducts);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_id' => ['required', 'integer', Rule::exists(Service::class, 'id')],
            'product_id' => ['required', 'integer', Rule::exists(Product::class, 'id')],
            'store_id' => ['required', 'integer', Rule::exists(Store::class, 'id')],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $unitPrice = $validated['unit_price'] ?? (float) ($product->sale_price ?? 0);
        $quantity = $validated['quantity'] ?? 1;

        if ($response = $this->floorPriceViolation($product, $unitPrice)) {
            return $response;
        }

        if ($response = $this->insufficientStockViolation($validated['product_id'], $validated['store_id'], $quantity)) {
            return $response;
        }

        $unitCost = $product->average_cost !== null && (float) $product->average_cost > 0
            ? (float) $product->average_cost
            : ($product->purchase_price !== null && (float) $product->purchase_price > 0 ? (float) $product->purchase_price : null);

        $serviceProduct = DB::connection('company')->transaction(function () use ($validated, $unitPrice, $unitCost, $quantity) {
            $serviceProduct = ServiceProduct::create([
                'service_id' => $validated['service_id'],
                'product_id' => $validated['product_id'],
                'store_id' => $validated['store_id'],
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'unit_cost' => $unitCost,
            ]);

            $this->stock->recordServiceConsumption($serviceProduct, $quantity);

            if ($serviceProduct->unit_cost !== null) {
                $this->ledger->postCogs($serviceProduct, $quantity);
            }

            return $serviceProduct;
        });

        return response()->json([
            'message' => 'Product added to service.',
            'service_product' => $serviceProduct->load(['product:id,name,sale_price,border_price', 'store:id,name']),
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
        $newQuantity = $validated['quantity'] ?? $serviceProduct->quantity;
        $delta = $newQuantity - $serviceProduct->quantity;

        if ($response = $this->floorPriceViolation($product, $unitPrice)) {
            return $response;
        }

        if ($delta > 0 && $serviceProduct->store_id !== null) {
            if ($response = $this->insufficientStockViolation($serviceProduct->product_id, $serviceProduct->store_id, $delta)) {
                return $response;
            }
        }

        DB::connection('company')->transaction(function () use ($serviceProduct, $newQuantity, $unitPrice, $delta) {
            $serviceProduct->update([
                'quantity' => $newQuantity,
                'unit_price' => $unitPrice,
            ]);

            if ($serviceProduct->store_id !== null && $delta !== 0) {
                if ($delta > 0) {
                    $this->stock->recordServiceConsumption($serviceProduct, $delta);
                    if ($serviceProduct->unit_cost !== null) {
                        $this->ledger->postCogs($serviceProduct, $delta);
                    }
                } else {
                    $this->stock->recordServiceRestock($serviceProduct, abs($delta));
                    if ($serviceProduct->unit_cost !== null) {
                        $this->ledger->postCogsReversal($serviceProduct, abs($delta));
                    }
                }
            }
        });

        return response()->json([
            'message' => 'Service product updated.',
            'service_product' => $serviceProduct->load(['product:id,name,sale_price,border_price', 'store:id,name']),
        ]);
    }

    public function destroy(int $id)
    {
        $serviceProduct = ServiceProduct::findOrFail($id);

        DB::connection('company')->transaction(function () use ($serviceProduct) {
            if ($serviceProduct->store_id !== null) {
                $this->stock->recordServiceRestock($serviceProduct, $serviceProduct->quantity);
            }

            if ($serviceProduct->unit_cost !== null) {
                $this->ledger->postCogsReversal($serviceProduct, $serviceProduct->quantity);
            }

            $serviceProduct->delete();
        });

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
