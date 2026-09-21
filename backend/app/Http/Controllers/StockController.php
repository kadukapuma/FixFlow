<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ChecksStock;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Store;
use App\Services\LedgerService;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StockController extends Controller
{
    use ChecksStock;

    public function __construct(
        private StockService $stock,
        private LedgerService $ledger
    ) {
    }

    public function levels(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['nullable', 'integer', Rule::exists(Product::class, 'id')],
            'store_id' => ['nullable', 'integer', Rule::exists(Store::class, 'id')],
        ]);

        $levels = $this->stock->levels($validated['product_id'] ?? null, $validated['store_id'] ?? null);

        return response()->json($levels->map(function ($row) {
            return [
                'product_id' => $row->product_id,
                'product_name' => $row->product?->name,
                'store_id' => $row->store_id,
                'store_name' => $row->store?->name,
                'current_stock' => (int) $row->current_stock,
            ];
        })->values());
    }

    public function records(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['opening', 'adjustment', 'damage', 'transfer'])],
        ]);

        // A transfer is stored as two linked rows; list it once via its "out" leg.
        $movementType = $validated['type'] === 'transfer' ? 'transfer_out' : $validated['type'];

        $records = StockMovement::where('type', $movementType)
            ->with(['product:id,name', 'store:id,name', 'relatedMovement.store:id,name'])
            ->latest()
            ->latest('id')
            ->paginate((int) $request->query('per_page', 15))
            ->through(fn (StockMovement $movement) => [
                'id' => $movement->id,
                'created_at' => $movement->created_at?->format('Y-m-d H:i'),
                'product_name' => $movement->product?->name,
                'store_name' => $movement->store?->name,
                'to_store_name' => $movement->relatedMovement?->store?->name,
                'quantity' => $movement->quantity,
                'note' => $movement->note,
            ]);

        return response()->json($records);
    }

    public function movements(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', Rule::exists(Product::class, 'id')],
            'store_id' => ['required', 'integer', Rule::exists(Store::class, 'id')],
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $store = Store::findOrFail($validated['store_id']);

        return response()->json([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'store_id' => $store->id,
            'store_name' => $store->name,
            'current_stock' => $this->stock->currentStock($product->id, $store->id),
            'movements' => $this->stock->movementHistory($product->id, $store->id),
        ]);
    }

    public function storeOpening(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', Rule::exists(Product::class, 'id')],
            'store_id' => ['required', 'integer', Rule::exists(Store::class, 'id')],
            'quantity' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $cost = $product->average_cost !== null && (float) $product->average_cost > 0
            ? (float) $product->average_cost
            : ($product->purchase_price !== null && (float) $product->purchase_price > 0 ? (float) $product->purchase_price : null);

        DB::connection('company')->transaction(function () use ($validated, $cost) {
            $this->stock->recordOpening($validated);

            if ($cost !== null) {
                $this->ledger->postInventoryOpening(
                    $validated['product_id'],
                    $validated['store_id'],
                    (int) $validated['quantity'],
                    $cost,
                    $validated['note'] ?? null
                );
            }
        });

        return response()->json([
            'message' => 'Opening stock recorded.',
            'current_stock' => $this->stock->currentStock($validated['product_id'], $validated['store_id']),
        ], 201);
    }

    public function adjust(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', Rule::exists(Product::class, 'id')],
            'store_id' => ['required', 'integer', Rule::exists(Store::class, 'id')],
            'quantity' => ['required', 'integer', 'not_in:0'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        if ($validated['quantity'] < 0) {
            if ($response = $this->insufficientStockViolation($validated['product_id'], $validated['store_id'], abs($validated['quantity']))) {
                return $response;
            }
        }

        $product = Product::findOrFail($validated['product_id']);
        $cost = $product->average_cost !== null && (float) $product->average_cost > 0
            ? (float) $product->average_cost
            : ($product->purchase_price !== null && (float) $product->purchase_price > 0 ? (float) $product->purchase_price : null);

        DB::connection('company')->transaction(function () use ($validated, $cost) {
            $this->stock->recordAdjustment($validated);

            if ($cost !== null) {
                $this->ledger->postInventoryAdjustment(
                    $validated['product_id'],
                    $validated['store_id'],
                    (int) $validated['quantity'],
                    $cost,
                    $validated['note'] ?? null
                );
            }
        });

        return response()->json([
            'message' => 'Stock adjustment recorded.',
            'current_stock' => $this->stock->currentStock($validated['product_id'], $validated['store_id']),
        ], 201);
    }

    public function damage(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', Rule::exists(Product::class, 'id')],
            'store_id' => ['required', 'integer', Rule::exists(Store::class, 'id')],
            'quantity' => ['required', 'integer', 'min:1'],
            'note' => ['required', 'string', 'max:500'],
        ]);

        if ($response = $this->insufficientStockViolation($validated['product_id'], $validated['store_id'], $validated['quantity'])) {
            return $response;
        }

        $product = Product::findOrFail($validated['product_id']);
        $cost = $product->average_cost !== null && (float) $product->average_cost > 0
            ? (float) $product->average_cost
            : ($product->purchase_price !== null && (float) $product->purchase_price > 0 ? (float) $product->purchase_price : null);

        DB::connection('company')->transaction(function () use ($validated, $cost) {
            $this->stock->recordDamage($validated);

            if ($cost !== null) {
                $this->ledger->postInventoryAdjustment(
                    $validated['product_id'],
                    $validated['store_id'],
                    -abs((int) $validated['quantity']),
                    $cost,
                    $validated['note'] ?? null
                );
            }
        });

        return response()->json([
            'message' => 'Damaged stock recorded.',
            'current_stock' => $this->stock->currentStock($validated['product_id'], $validated['store_id']),
        ], 201);
    }

    public function transfer(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', Rule::exists(Product::class, 'id')],
            'from_store_id' => ['required', 'integer', Rule::exists(Store::class, 'id')],
            'to_store_id' => ['required', 'integer', 'different:from_store_id', Rule::exists(Store::class, 'id')],
            'quantity' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        if ($response = $this->insufficientStockViolation($validated['product_id'], $validated['from_store_id'], $validated['quantity'])) {
            return $response;
        }

        $this->stock->recordTransfer($validated);

        return response()->json([
            'message' => 'Stock transferred.',
            'from_store_stock' => $this->stock->currentStock($validated['product_id'], $validated['from_store_id']),
            'to_store_stock' => $this->stock->currentStock($validated['product_id'], $validated['to_store_id']),
        ], 201);
    }
}
