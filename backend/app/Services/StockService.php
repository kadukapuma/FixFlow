<?php

namespace App\Services;

use App\Models\ServiceProduct;
use App\Models\StockMovement;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StockService
{
    public function currentStock(int $productId, int $storeId): int
    {
        return (int) StockMovement::where('product_id', $productId)
            ->where('store_id', $storeId)
            ->sum('quantity');
    }

    public function levels(?int $productId = null, ?int $storeId = null): Collection
    {
        $query = StockMovement::query()
            ->select('product_id', 'store_id')
            ->selectRaw('SUM(quantity) as current_stock')
            ->groupBy('product_id', 'store_id')
            ->with(['product:id,name', 'store:id,name']);

        if ($productId !== null) {
            $query->where('product_id', $productId);
        }

        if ($storeId !== null) {
            $query->where('store_id', $storeId);
        }

        return $query->get();
    }

    public function movementHistory(int $productId, int $storeId): Collection
    {
        $running = 0;

        return StockMovement::where('product_id', $productId)
            ->where('store_id', $storeId)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(function (StockMovement $movement) use (&$running) {
                $running += $movement->quantity;

                return [
                    'id' => $movement->id,
                    'type' => $movement->type,
                    'quantity' => $movement->quantity,
                    'note' => $movement->note,
                    'created_at' => $movement->created_at?->format('Y-m-d H:i:s'),
                    'running_balance' => $running,
                    'service_product_id' => $movement->service_product_id,
                    'related_movement_id' => $movement->related_movement_id,
                ];
            });
    }

    public function recordOpening(array $data): StockMovement
    {
        return StockMovement::create([
            'product_id' => $data['product_id'],
            'store_id' => $data['store_id'],
            'type' => 'opening',
            'quantity' => abs((int) $data['quantity']),
            'note' => $data['note'] ?? null,
        ]);
    }

    public function recordAdjustment(array $data): StockMovement
    {
        return StockMovement::create([
            'product_id' => $data['product_id'],
            'store_id' => $data['store_id'],
            'type' => 'adjustment',
            'quantity' => (int) $data['quantity'],
            'note' => $data['note'] ?? null,
        ]);
    }

    public function recordDamage(array $data): StockMovement
    {
        return StockMovement::create([
            'product_id' => $data['product_id'],
            'store_id' => $data['store_id'],
            'type' => 'damage',
            'quantity' => -abs((int) $data['quantity']),
            'note' => $data['note'],
        ]);
    }

    public function recordTransfer(array $data): array
    {
        return DB::connection('company')->transaction(function () use ($data) {
            $quantity = abs((int) $data['quantity']);

            $out = StockMovement::create([
                'product_id' => $data['product_id'],
                'store_id' => $data['from_store_id'],
                'type' => 'transfer_out',
                'quantity' => -$quantity,
                'note' => $data['note'] ?? null,
            ]);

            $in = StockMovement::create([
                'product_id' => $data['product_id'],
                'store_id' => $data['to_store_id'],
                'type' => 'transfer_in',
                'quantity' => $quantity,
                'related_movement_id' => $out->id,
                'note' => $data['note'] ?? null,
            ]);

            $out->update(['related_movement_id' => $in->id]);

            return [$out, $in];
        });
    }

    public function recordServiceConsumption(ServiceProduct $serviceProduct, int $quantity): StockMovement
    {
        return StockMovement::create([
            'product_id' => $serviceProduct->product_id,
            'store_id' => $serviceProduct->store_id,
            'type' => 'service_consumption',
            'quantity' => -abs($quantity),
            'service_product_id' => $serviceProduct->id,
            'note' => 'Used on service #'.$serviceProduct->service_id,
        ]);
    }

    public function recordServiceRestock(ServiceProduct $serviceProduct, int $quantity): StockMovement
    {
        return StockMovement::create([
            'product_id' => $serviceProduct->product_id,
            'store_id' => $serviceProduct->store_id,
            'type' => 'service_restock',
            'quantity' => abs($quantity),
            'service_product_id' => $serviceProduct->id,
            'note' => 'Returned from service #'.$serviceProduct->service_id,
        ]);
    }
}
