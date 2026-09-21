<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
use App\Models\SupplierPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseService
{
    public function __construct(
        private StockService $stock,
        private LedgerService $ledger
    ) {
    }

    /**
     * Compute net line total after percentage or fixed amount discount.
     */
    public function computeNetLineTotal(int $quantity, float $unitCost, string $discountType, float $discountValue): float
    {
        $gross = round($quantity * $unitCost, 2);

        if ($discountType === 'percent') {
            $discountAmount = round($gross * ($discountValue / 100), 2);
        } else {
            $discountAmount = round($discountValue, 2);
        }

        return round(max(0.0, $gross - $discountAmount), 2);
    }

    /**
     * Create a Purchase Order (status = ordered, no financial or stock effect).
     */
    public function createPurchaseOrder(array $data): PurchaseOrder
    {
        return DB::connection('company')->transaction(function () use ($data) {
            $processedItems = [];
            $orderTotal = 0.0;

            foreach ($data['items'] as $item) {
                $qty = (int) $item['quantity'];
                $unitCost = round((float) $item['unit_cost'], 2);
                $discType = $item['discount_type'] ?? 'percent';
                $discVal = round((float) ($item['discount_value'] ?? 0), 2);

                $lineTotal = $this->computeNetLineTotal($qty, $unitCost, $discType, $discVal);

                if ($lineTotal < 0.01) {
                    throw ValidationException::withMessages([
                        'items' => ["Line total for product #{$item['product_id']} must be at least 0.01."],
                    ]);
                }

                $orderTotal = round($orderTotal + $lineTotal, 2);
                $processedItems[] = [
                    'product_id' => $item['product_id'],
                    'quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'discount_type' => $discType,
                    'discount_value' => $discVal,
                    'line_total' => $lineTotal,
                ];
            }

            $order = PurchaseOrder::create([
                'supplier_id' => $data['supplier_id'],
                'store_id' => $data['store_id'] ?? null,
                'order_date' => $data['order_date'],
                'expected_date' => $data['expected_date'] ?? null,
                'status' => 'ordered',
                'total' => $orderTotal,
                'note' => $data['note'] ?? null,
            ]);

            foreach ($processedItems as $pItem) {
                $order->items()->create($pItem);
            }

            return $order->load(['supplier', 'store', 'items.product']);
        });
    }

    /**
     * Update an ordered Purchase Order.
     */
    public function updatePurchaseOrder(PurchaseOrder $order, array $data): PurchaseOrder
    {
        return DB::connection('company')->transaction(function () use ($order, $data) {
            $lockedOrder = PurchaseOrder::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status !== 'ordered') {
                throw ValidationException::withMessages([
                    'status' => ["Only purchase orders in 'ordered' status can be edited."],
                ]);
            }

            $processedItems = [];
            $orderTotal = 0.0;

            foreach ($data['items'] as $item) {
                $qty = (int) $item['quantity'];
                $unitCost = round((float) $item['unit_cost'], 2);
                $discType = $item['discount_type'] ?? 'percent';
                $discVal = round((float) ($item['discount_value'] ?? 0), 2);

                $lineTotal = $this->computeNetLineTotal($qty, $unitCost, $discType, $discVal);

                if ($lineTotal < 0.01) {
                    throw ValidationException::withMessages([
                        'items' => ["Line total for product #{$item['product_id']} must be at least 0.01."],
                    ]);
                }

                $orderTotal = round($orderTotal + $lineTotal, 2);
                $processedItems[] = [
                    'product_id' => $item['product_id'],
                    'quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'discount_type' => $discType,
                    'discount_value' => $discVal,
                    'line_total' => $lineTotal,
                ];
            }

            $lockedOrder->update([
                'supplier_id' => $data['supplier_id'],
                'store_id' => $data['store_id'] ?? null,
                'order_date' => $data['order_date'],
                'expected_date' => $data['expected_date'] ?? null,
                'total' => $orderTotal,
                'note' => $data['note'] ?? null,
            ]);

            $lockedOrder->items()->delete();
            foreach ($processedItems as $pItem) {
                $lockedOrder->items()->create($pItem);
            }

            return $lockedOrder->load(['supplier', 'store', 'items.product']);
        });
    }

    /**
     * Cancel an ordered Purchase Order.
     */
    public function cancelPurchaseOrder(PurchaseOrder $order): PurchaseOrder
    {
        return DB::connection('company')->transaction(function () use ($order) {
            $lockedOrder = PurchaseOrder::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status !== 'ordered') {
                throw ValidationException::withMessages([
                    'status' => ["Only purchase orders in 'ordered' status can be cancelled."],
                ]);
            }

            $lockedOrder->update(['status' => 'cancelled']);

            return $lockedOrder;
        });
    }

    /**
     * Create a Purchase: records stock receipt, updates moving average cost,
     * posts double entry Dr 1200 Inventory / Cr 2000 Accounts Payable, and marks PO received if linked.
     */
    public function createPurchase(array $data): Purchase
    {
        return DB::connection('company')->transaction(function () use ($data) {
            $po = null;
            if (! empty($data['purchase_order_id'])) {
                $po = PurchaseOrder::where('id', $data['purchase_order_id'])->lockForUpdate()->firstOrFail();

                if ($po->status !== 'ordered') {
                    throw ValidationException::withMessages([
                        'purchase_order_id' => ["The selected purchase order is '{$po->status}' and cannot be received."],
                    ]);
                }

                if (Purchase::where('purchase_order_id', $po->id)->exists()) {
                    throw ValidationException::withMessages([
                        'purchase_order_id' => ['A purchase has already been recorded for this purchase order.'],
                    ]);
                }
            }

            $processedItems = [];
            $purchaseTotal = 0.0;

            foreach ($data['items'] as $item) {
                $qty = (int) $item['quantity'];
                $unitCost = round((float) $item['unit_cost'], 2);
                $discType = $item['discount_type'] ?? 'percent';
                $discVal = round((float) ($item['discount_value'] ?? 0), 2);

                $lineTotal = $this->computeNetLineTotal($qty, $unitCost, $discType, $discVal);

                if ($lineTotal < 0.01) {
                    throw ValidationException::withMessages([
                        'items' => ["Line total for product #{$item['product_id']} must be at least 0.01."],
                    ]);
                }

                $purchaseTotal = round($purchaseTotal + $lineTotal, 2);
                $processedItems[] = [
                    'product_id' => $item['product_id'],
                    'quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'discount_type' => $discType,
                    'discount_value' => $discVal,
                    'line_total' => $lineTotal,
                ];
            }

            $purchase = Purchase::create([
                'supplier_id' => $data['supplier_id'],
                'store_id' => $data['store_id'],
                'purchase_order_id' => $po?->id,
                'purchase_date' => $data['purchase_date'],
                'supplier_invoice_no' => $data['supplier_invoice_no'] ?? null,
                'status' => 'received',
                'total' => $purchaseTotal,
                'note' => $data['note'] ?? null,
            ]);

            foreach ($processedItems as $pItem) {
                $purchaseItem = $purchase->items()->create($pItem);

                $onHandBefore = $this->stock->totalStock($pItem['product_id']);

                $this->stock->recordPurchaseReceipt($purchase, $purchaseItem);
                $this->stock->recalculateAverageCostOnReceipt($pItem['product_id'], $pItem['quantity'], $pItem['line_total'], $onHandBefore);
            }

            if ($po) {
                $po->update(['status' => 'received']);
            }

            $this->ledger->postPurchaseReceipt($purchase);

            return $purchase->load(['supplier', 'store', 'items.product', 'purchaseOrder']);
        });
    }

    /**
     * Cancel a purchase by full reversal: blocked if payments or returns exist or if stock is insufficient.
     */
    public function cancelPurchase(Purchase $purchase): Purchase
    {
        return DB::connection('company')->transaction(function () use ($purchase) {
            $lockedPurchase = Purchase::where('id', $purchase->id)->lockForUpdate()->firstOrFail();

            if ($lockedPurchase->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'purchase' => ['This purchase is already cancelled.'],
                ]);
            }

            if ($lockedPurchase->payments()->exists()) {
                throw ValidationException::withMessages([
                    'purchase' => ['Cannot cancel a purchase that has payments or refunds recorded.'],
                ]);
            }

            if ($lockedPurchase->returns()->exists()) {
                throw ValidationException::withMessages([
                    'purchase' => ['Cannot cancel a purchase that has returns recorded.'],
                ]);
            }

            // Verify store has enough stock to reverse all purchase items
            foreach ($lockedPurchase->items as $item) {
                $available = $this->stock->currentStock($item->product_id, $lockedPurchase->store_id);
                if ($item->quantity > $available) {
                    throw ValidationException::withMessages([
                        'stock' => ["Not enough stock to cancel purchase: product #{$item->product_id} has only {$available} unit(s) available at this store."],
                    ]);
                }
            }

            foreach ($lockedPurchase->items as $item) {
                $onHandBefore = $this->stock->totalStock($item->product_id);

                $this->stock->recordPurchaseCancel($lockedPurchase, $item);
                $this->stock->recalculateAverageCostOnRemoval($item->product_id, $item->quantity, (float) $item->line_total, $onHandBefore);
            }

            $this->ledger->postPurchaseCancel($lockedPurchase);

            $lockedPurchase->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ]);

            return $lockedPurchase;
        });
    }

    /**
     * Record supplier payment or refund against a purchase under row lock.
     */
    public function recordSupplierPayment(Purchase $purchase, array $data): SupplierPayment
    {
        return DB::connection('company')->transaction(function () use ($purchase, $data) {
            $lockedPurchase = Purchase::where('id', $purchase->id)->lockForUpdate()->firstOrFail();

            if ($lockedPurchase->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'purchase' => ['Cannot record payments or refunds on a cancelled purchase.'],
                ]);
            }

            $kind = $data['kind'] ?? 'payment';
            $amount = round((float) $data['amount'], 2);
            $balance = $lockedPurchase->balance();

            $amountCents = (int) round($amount * 100);
            $balCents = (int) round($balance * 100);

            if ($amountCents <= 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Amount must be at least 0.01.'],
                ]);
            }

            if ($kind === 'payment') {
                if ($balCents <= 0) {
                    throw ValidationException::withMessages([
                        'amount' => ['This purchase has no balance due (balance is Rs. '.number_format($balance, 2).').'],
                    ]);
                }

                if ($amountCents > $balCents) {
                    throw ValidationException::withMessages([
                        'amount' => ['Payment amount (Rs. '.number_format($amount, 2).') exceeds outstanding balance (Rs. '.number_format($balance, 2).').'],
                    ]);
                }
            } elseif ($kind === 'refund') {
                if ($balCents >= 0) {
                    throw ValidationException::withMessages([
                        'amount' => ['Refund is only allowed when there is a negative balance / supplier credit.'],
                    ]);
                }

                $creditCents = abs($balCents);
                if ($amountCents > $creditCents) {
                    throw ValidationException::withMessages([
                        'amount' => ['Refund amount (Rs. '.number_format($amount, 2).') exceeds supplier credit (Rs. '.number_format(abs($balance), 2).').'],
                    ]);
                }
            } else {
                throw ValidationException::withMessages([
                    'kind' => ["Invalid payment kind '{$kind}'."],
                ]);
            }

            $payment = SupplierPayment::create([
                'purchase_id' => $lockedPurchase->id,
                'kind' => $kind,
                'amount' => $amount,
                'method' => $data['method'] ?? 'cash',
                'paid_at' => $data['paid_at'] ?? now()->toDateString(),
                'note' => $data['note'] ?? null,
            ]);

            if ($kind === 'payment') {
                $this->ledger->postSupplierPayment($payment);
            } else {
                $this->ledger->postSupplierRefund($payment);
            }

            return $payment->load(['purchase.supplier', 'journalEntry']);
        });
    }

    /**
     * Create a purchase return: checks returnable quantity, store stock, computes exact net return value,
     * reduces stock, updates average cost, and posts Dr 2000 Accounts Payable / Cr 1200 Inventory.
     */
    public function createPurchaseReturn(Purchase $purchase, array $data): PurchaseReturn
    {
        return DB::connection('company')->transaction(function () use ($purchase, $data) {
            $lockedPurchase = Purchase::where('id', $purchase->id)->lockForUpdate()->firstOrFail();

            if ($lockedPurchase->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'purchase' => ['Cannot return items on a cancelled purchase.'],
                ]);
            }

            $storeId = $data['store_id'] ?? $lockedPurchase->store_id;
            $itemsData = $data['items'] ?? [];

            if (empty($itemsData)) {
                throw ValidationException::withMessages([
                    'items' => ['At least one return item is required.'],
                ]);
            }

            $processedReturnItems = [];
            $returnTotal = 0.0;

            foreach ($itemsData as $item) {
                /** @var PurchaseItem $pItem */
                $pItem = $lockedPurchase->items()->where('id', $item['purchase_item_id'])->first();
                if (! $pItem) {
                    throw ValidationException::withMessages([
                        'items' => ["Invalid purchase item ID #{$item['purchase_item_id']} for this purchase."],
                    ]);
                }

                $retQty = (int) $item['quantity'];
                if ($retQty < 1) {
                    continue;
                }

                $alreadyQty = (int) $pItem->returnItems()->sum('quantity');
                $alreadyVal = (float) $pItem->returnItems()->sum('line_total');
                $remainingQty = $pItem->quantity - $alreadyQty;

                if ($retQty > $remainingQty) {
                    throw ValidationException::withMessages([
                        'items' => ["Return quantity ({$retQty}) exceeds remaining returnable quantity ({$remainingQty}) for product {$pItem->product?->name}."],
                    ]);
                }

                $availableStock = $this->stock->currentStock($pItem->product_id, $storeId);
                if ($retQty > $availableStock) {
                    throw ValidationException::withMessages([
                        'items' => ["Not enough stock: only {$availableStock} unit(s) available at this store for product {$pItem->product?->name}."],
                    ]);
                }

                // Return value calculation avoiding cent drift on final return
                if ($alreadyQty + $retQty === $pItem->quantity) {
                    $returnLineTotal = round((float) $pItem->line_total - $alreadyVal, 2);
                } else {
                    $returnLineTotal = round(((float) $pItem->line_total * $retQty) / $pItem->quantity, 2);
                }

                $returnTotal = round($returnTotal + $returnLineTotal, 2);
                $processedReturnItems[] = [
                    'purchase_item' => $pItem,
                    'quantity' => $retQty,
                    'line_total' => $returnLineTotal,
                ];
            }

            if (empty($processedReturnItems)) {
                throw ValidationException::withMessages([
                    'items' => ['At least one item with quantity greater than zero must be returned.'],
                ]);
            }

            $return = PurchaseReturn::create([
                'purchase_id' => $lockedPurchase->id,
                'store_id' => $storeId,
                'return_date' => $data['return_date'] ?? now()->toDateString(),
                'total' => $returnTotal,
                'reason' => $data['reason'] ?? null,
            ]);

            foreach ($processedReturnItems as $row) {
                /** @var PurchaseItem $pItem */
                $pItem = $row['purchase_item'];
                $retQty = $row['quantity'];
                $lineTotal = $row['line_total'];

                $returnItem = $return->items()->create([
                    'purchase_item_id' => $pItem->id,
                    'quantity' => $retQty,
                    'line_total' => $lineTotal,
                ]);

                $onHandBefore = $this->stock->totalStock($pItem->product_id);

                $this->stock->recordPurchaseReturn($return, $returnItem);
                $this->stock->recalculateAverageCostOnRemoval($pItem->product_id, $retQty, $lineTotal, $onHandBefore);
            }

            $this->ledger->postPurchaseReturn($return);

            return $return->load(['purchase.supplier', 'store', 'items.purchaseItem.product']);
        });
    }
}
