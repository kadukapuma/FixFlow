<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\JsonResponse;

trait ChecksStock
{
    /**
     * Check if a store has sufficient stock for a product, returning a standardized 422 JsonResponse if not.
     */
    protected function insufficientStockViolation(int $productId, int $storeId, int $requiredQuantity): ?JsonResponse
    {
        $available = $this->stock->currentStock($productId, $storeId);

        if ($requiredQuantity > $available) {
            return response()->json([
                'message' => "Not enough stock: only {$available} unit(s) available at this store.",
                'errors' => [
                    'quantity' => ["Not enough stock: only {$available} unit(s) available at this store."],
                ],
            ], 422);
        }

        return null;
    }
}
