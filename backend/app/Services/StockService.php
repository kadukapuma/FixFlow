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

    public function totalStock(int $productId): int
    {
        return (int) StockMovement::where('product_id', $productId)->sum('quantity');
    }

    public function recordPurchaseReceipt(\App\Models\Purchase $purchase, \App\Models\PurchaseItem $item): StockMovement
    {
        return StockMovement::create([
            'product_id' => $item->product_id,
            'store_id' => $purchase->store_id,
            'type' => 'purchase',
            'quantity' => abs((int) $item->quantity),
            'purchase_item_id' => $item->id,
            'note' => 'Purchase #'.($purchase->ref_no ?: $purchase->id),
        ]);
    }

    public function recordPurchaseCancel(\App\Models\Purchase $purchase, \App\Models\PurchaseItem $item): StockMovement
    {
        return StockMovement::create([
            'product_id' => $item->product_id,
            'store_id' => $purchase->store_id,
            'type' => 'purchase_cancel',
            'quantity' => -abs((int) $item->quantity),
            'purchase_item_id' => $item->id,
            'note' => 'Cancelled purchase #'.($purchase->ref_no ?: $purchase->id),
        ]);
    }

    public function recordPurchaseReturn(\App\Models\PurchaseReturn $return, \App\Models\PurchaseReturnItem $returnItem): StockMovement
    {
        return StockMovement::create([
            'product_id' => $returnItem->purchaseItem->product_id,
            'store_id' => $return->store_id,
            'type' => 'purchase_return',
            'quantity' => -abs((int) $returnItem->quantity),
            'purchase_return_item_id' => $returnItem->id,
            'note' => 'Return #'.($return->ref_no ?: $return->id).' for purchase #'.($return->purchase?->ref_no ?: $return->purchase_id),
        ]);
    }

    /**
     * Update product average_cost on receiving stock.
     * Formula: (onhand * base + V) / (onhand + q), where base is current average or purchase_price.
     * When nothing on hand (or base null): V / q.
     */
    public function recalculateAverageCostOnReceipt(int $productId, int $quantity, float $netLineTotal, int $onHandBefore): float
    {
        $product = \App\Models\Product::where('id', $productId)->lockForUpdate()->firstOrFail();

        $base = $product->average_cost !== null && (float) $product->average_cost > 0
            ? (float) $product->average_cost
            : ($product->purchase_price !== null && (float) $product->purchase_price > 0 ? (float) $product->purchase_price : null);

        if ($onHandBefore <= 0 || $base === null) {
            $newAvg = round($netLineTotal / $quantity, 4);
        } else {
            $newAvg = round(($onHandBefore * $base + $netLineTotal) / ($onHandBefore + $quantity), 4);
        }

        $product->update(['average_cost' => $newAvg]);

        return $newAvg;
    }

    /**
     * Update product average_cost on removing stock via cancel or return.
     * Formula: (onhand * avg - V) / (onhand - q), floored at 0, left unchanged if remaining <= 0.
     */
    public function recalculateAverageCostOnRemoval(int $productId, int $quantity, float $netLineTotal, int $onHandBefore): ?float
    {
        $product = \App\Models\Product::where('id', $productId)->lockForUpdate()->firstOrFail();

        $remaining = $onHandBefore - $quantity;
        if ($remaining <= 0) {
            return $product->average_cost !== null ? (float) $product->average_cost : null;
        }

        $avg = $product->average_cost !== null ? (float) $product->average_cost : (float) ($product->purchase_price ?? 0);
        $newAvg = round(max(0.0, ($onHandBefore * $avg - $netLineTotal) / $remaining), 4);

        $product->update(['average_cost' => $newAvg]);

        return $newAvg;
    }
}
