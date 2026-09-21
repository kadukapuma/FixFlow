<?php

namespace App\Services;

use App\Models\CommissionPayout;
use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\Service;
use App\Models\ServicePayment;
use Illuminate\Support\Facades\DB;

/**
 * Posts balanced double-entry journal entries for the money movements the
 * app knows about. Every method writes exactly one JournalEntry with two
 * JournalEntryLines (one debit, one credit) inside a DB transaction.
 */
class LedgerService
{
    private function account(string $code): LedgerAccount
    {
        return LedgerAccount::where('code', $code)->firstOrFail();
    }

    /**
     * Cash for "cash" payments, Bank for everything else (bank transfer,
     * UPI, card, etc).
     */
    private function cashOrBankAccount(string $method): LedgerAccount
    {
        return $this->account($method === 'cash' ? '1000' : '1010');
    }

    /**
     * Customer money received against a service: Dr Cash/Bank, Cr Service
     * Revenue.
     */
    public function postServicePayment(ServicePayment $payment): JournalEntry
    {
        return DB::connection('company')->transaction(function () use ($payment) {
            $entry = JournalEntry::create([
                'entry_date' => $payment->paid_at,
                'description' => 'Payment received for Service #'.$payment->service_id,
                'source_type' => 'service_payment',
                'source_id' => $payment->id,
                'service_id' => $payment->service_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->cashOrBankAccount($payment->method)->id, 'debit' => $payment->amount, 'credit' => 0],
                ['account_id' => $this->account('4000')->id, 'debit' => 0, 'credit' => $payment->amount],
            ]);

            $payment->update(['journal_entry_id' => $entry->id]);

            return $entry;
        });
    }

    /**
     * Customer refund against a service (e.g. advance refunded on unrepairable return):
     * Dr 4000 Service Revenue, Cr Cash/Bank.
     */
    public function postServiceRefund(ServicePayment $payment): JournalEntry
    {
        return DB::connection('company')->transaction(function () use ($payment) {
            $entry = JournalEntry::create([
                'entry_date' => $payment->paid_at,
                'description' => 'Customer refund for Service #'.$payment->service_id,
                'source_type' => 'service_refund',
                'source_id' => $payment->id,
                'service_id' => $payment->service_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->account('4000')->id, 'debit' => $payment->amount, 'credit' => 0],
                ['account_id' => $this->cashOrBankAccount($payment->method)->id, 'debit' => 0, 'credit' => $payment->amount],
            ]);

            $payment->update(['journal_entry_id' => $entry->id]);

            return $entry;
        });
    }

    /**
     * Technician commission accrued on service completion: Dr Commission
     * Expense, Cr Commission Payable. This is what makes "how much do we
     * currently owe this technician" answerable before any cash moves.
     */
    public function postCommissionAccrual(Service $service): JournalEntry
    {
        return DB::connection('company')->transaction(function () use ($service) {
            $entry = JournalEntry::create([
                'entry_date' => $service->completed_date ?? now()->toDateString(),
                'description' => 'Commission accrued for Service #'.$service->id,
                'source_type' => 'commission_accrual',
                'source_id' => $service->id,
                'service_id' => $service->id,
                'employee_id' => $service->employee_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->account('5000')->id, 'debit' => $service->commission_amount, 'credit' => 0],
                ['account_id' => $this->account('2100')->id, 'debit' => 0, 'credit' => $service->commission_amount],
            ]);

            return $entry;
        });
    }

    /**
     * Cash/bank paid out to a technician against their accrued commission:
     * Dr Commission Payable, Cr Cash/Bank.
     */
    public function postCommissionPayout(CommissionPayout $payout): JournalEntry
    {
        return DB::connection('company')->transaction(function () use ($payout) {
            $entry = JournalEntry::create([
                'entry_date' => $payout->paid_at,
                'description' => 'Commission paid out to technician #'.$payout->employee_id,
                'source_type' => 'commission_payout',
                'source_id' => $payout->id,
                'employee_id' => $payout->employee_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->account('2100')->id, 'debit' => $payout->amount, 'credit' => 0],
                ['account_id' => $this->cashOrBankAccount($payout->method)->id, 'debit' => 0, 'credit' => $payout->amount],
            ]);

            $payout->update(['journal_entry_id' => $entry->id]);

            return $entry;
        });
    }

    /**
     * Purchase received: Dr 1200 Inventory, Cr 2000 Accounts Payable.
     */
    public function postPurchaseReceipt(\App\Models\Purchase $purchase): JournalEntry
    {
        return DB::connection('company')->transaction(function () use ($purchase) {
            $entry = JournalEntry::create([
                'entry_date' => $purchase->purchase_date,
                'description' => 'Purchase receipt #'.($purchase->ref_no ?: $purchase->id),
                'source_type' => 'purchase',
                'source_id' => $purchase->id,
                'supplier_id' => $purchase->supplier_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->account('1200')->id, 'debit' => $purchase->total, 'credit' => 0],
                ['account_id' => $this->account('2000')->id, 'debit' => 0, 'credit' => $purchase->total],
            ]);

            $purchase->update(['journal_entry_id' => $entry->id]);

            return $entry;
        });
    }

    /**
     * Purchase cancelled: Dr 2000 Accounts Payable, Cr 1200 Inventory.
     */
    public function postPurchaseCancel(\App\Models\Purchase $purchase): JournalEntry
    {
        return DB::connection('company')->transaction(function () use ($purchase) {
            $entry = JournalEntry::create([
                'entry_date' => now()->toDateString(),
                'description' => 'Cancellation of Purchase #'.($purchase->ref_no ?: $purchase->id),
                'source_type' => 'purchase_cancel',
                'source_id' => $purchase->id,
                'supplier_id' => $purchase->supplier_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->account('2000')->id, 'debit' => $purchase->total, 'credit' => 0],
                ['account_id' => $this->account('1200')->id, 'debit' => 0, 'credit' => $purchase->total],
            ]);

            $purchase->update(['cancel_journal_entry_id' => $entry->id]);

            return $entry;
        });
    }

    /**
     * Supplier payment: Dr 2000 Accounts Payable, Cr Cash/Bank.
     */
    public function postSupplierPayment(\App\Models\SupplierPayment $payment): JournalEntry
    {
        return DB::connection('company')->transaction(function () use ($payment) {
            $purchase = $payment->purchase;

            $entry = JournalEntry::create([
                'entry_date' => $payment->paid_at,
                'description' => 'Supplier payment #'.($payment->ref_no ?: $payment->id).' for Purchase #'.($purchase->ref_no ?: $purchase->id),
                'source_type' => 'supplier_payment',
                'source_id' => $payment->id,
                'supplier_id' => $purchase->supplier_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->account('2000')->id, 'debit' => $payment->amount, 'credit' => 0],
                ['account_id' => $this->cashOrBankAccount($payment->method)->id, 'debit' => 0, 'credit' => $payment->amount],
            ]);

            $payment->update(['journal_entry_id' => $entry->id]);

            return $entry;
        });
    }

    /**
     * Supplier refund: Dr Cash/Bank, Cr 2000 Accounts Payable.
     */
    public function postSupplierRefund(\App\Models\SupplierPayment $payment): JournalEntry
    {
        return DB::connection('company')->transaction(function () use ($payment) {
            $purchase = $payment->purchase;

            $entry = JournalEntry::create([
                'entry_date' => $payment->paid_at,
                'description' => 'Supplier refund #'.($payment->ref_no ?: $payment->id).' for Purchase #'.($purchase->ref_no ?: $purchase->id),
                'source_type' => 'supplier_refund',
                'source_id' => $payment->id,
                'supplier_id' => $purchase->supplier_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->cashOrBankAccount($payment->method)->id, 'debit' => $payment->amount, 'credit' => 0],
                ['account_id' => $this->account('2000')->id, 'debit' => 0, 'credit' => $payment->amount],
            ]);

            $payment->update(['journal_entry_id' => $entry->id]);

            return $entry;
        });
    }

    /**
     * Purchase return: Dr 2000 Accounts Payable, Cr 1200 Inventory.
     */
    public function postPurchaseReturn(\App\Models\PurchaseReturn $return): JournalEntry
    {
        return DB::connection('company')->transaction(function () use ($return) {
            $purchase = $return->purchase;

            $entry = JournalEntry::create([
                'entry_date' => $return->return_date,
                'description' => 'Purchase return #'.($return->ref_no ?: $return->id).' for Purchase #'.($purchase?->ref_no ?: $return->purchase_id),
                'source_type' => 'purchase_return',
                'source_id' => $return->id,
                'supplier_id' => $purchase?->supplier_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->account('2000')->id, 'debit' => $return->total, 'credit' => 0],
                ['account_id' => $this->account('1200')->id, 'debit' => 0, 'credit' => $return->total],
            ]);

            $return->update(['journal_entry_id' => $entry->id]);

            return $entry;
        });
    }

    /**
     * COGS on service product use: Dr 5100 COGS, Cr 1200 Inventory.
     */
    public function postCogs(\App\Models\ServiceProduct $serviceProduct, int $quantity): ?JournalEntry
    {
        if ($serviceProduct->unit_cost === null || (float) $serviceProduct->unit_cost <= 0) {
            return null;
        }

        $amount = round($quantity * (float) $serviceProduct->unit_cost, 2);
        if ($amount <= 0) {
            return null;
        }

        return DB::connection('company')->transaction(function () use ($serviceProduct, $quantity, $amount) {
            $entry = JournalEntry::create([
                'entry_date' => now()->toDateString(),
                'description' => "COGS for {$quantity} unit(s) of product #{$serviceProduct->product_id} on Service #{$serviceProduct->service_id}",
                'source_type' => 'cogs',
                'source_id' => $serviceProduct->id,
                'service_id' => $serviceProduct->service_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->account('5100')->id, 'debit' => $amount, 'credit' => 0],
                ['account_id' => $this->account('1200')->id, 'debit' => 0, 'credit' => $amount],
            ]);

            return $entry;
        });
    }

    /**
     * COGS reversal (quantity reduced or line removed): Dr 1200 Inventory, Cr 5100 COGS.
     */
    public function postCogsReversal(\App\Models\ServiceProduct $serviceProduct, int $quantity): ?JournalEntry
    {
        if ($serviceProduct->unit_cost === null || (float) $serviceProduct->unit_cost <= 0) {
            return null;
        }

        $amount = round($quantity * (float) $serviceProduct->unit_cost, 2);
        if ($amount <= 0) {
            return null;
        }

        return DB::connection('company')->transaction(function () use ($serviceProduct, $quantity, $amount) {
            $entry = JournalEntry::create([
                'entry_date' => now()->toDateString(),
                'description' => "COGS reversal for {$quantity} unit(s) of product #{$serviceProduct->product_id} from Service #{$serviceProduct->service_id}",
                'source_type' => 'cogs_reversal',
                'source_id' => $serviceProduct->id,
                'service_id' => $serviceProduct->service_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->account('1200')->id, 'debit' => $amount, 'credit' => 0],
                ['account_id' => $this->account('5100')->id, 'debit' => 0, 'credit' => $amount],
            ]);

            return $entry;
        });
    }

    /**
     * Service part write-off / scrap when an item cannot be repaired and the part
     * cannot be restocked: Dr 5200 Inventory Adjustments & Write-offs, Cr 5100 COGS.
     */
    public function postServicePartWriteOff(\App\Models\ServiceProduct $serviceProduct, int $quantity): ?JournalEntry
    {
        if ($serviceProduct->unit_cost === null || (float) $serviceProduct->unit_cost <= 0) {
            return null;
        }

        $amount = round($quantity * (float) $serviceProduct->unit_cost, 2);
        if ($amount <= 0) {
            return null;
        }

        return DB::connection('company')->transaction(function () use ($serviceProduct, $quantity, $amount) {
            $entry = JournalEntry::create([
                'entry_date' => now()->toDateString(),
                'description' => "Write-off for {$quantity} unit(s) of product #{$serviceProduct->product_id} from unrepairable Service #{$serviceProduct->service_id}",
                'source_type' => 'service_part_write_off',
                'source_id' => $serviceProduct->id,
                'service_id' => $serviceProduct->service_id,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->account('5200')->id, 'debit' => $amount, 'credit' => 0],
                ['account_id' => $this->account('5100')->id, 'debit' => 0, 'credit' => $amount],
            ]);

            return $entry;
        });
    }

    /**
     * Opening inventory recorded: Dr 1200 Inventory, Cr 3000 Opening Balance Equity.
     */
    public function postInventoryOpening(int $productId, int $storeId, int $quantity, float $cost, ?string $note = null): ?JournalEntry
    {
        $amount = round($quantity * $cost, 2);
        if ($amount <= 0) {
            return null;
        }

        return DB::connection('company')->transaction(function () use ($productId, $quantity, $amount, $note) {
            $entry = JournalEntry::create([
                'entry_date' => now()->toDateString(),
                'description' => "Opening inventory for product #{$productId}: {$quantity} unit(s)".($note ? " ({$note})" : ''),
                'source_type' => 'inventory_opening',
                'source_id' => $productId,
            ]);

            $entry->lines()->createMany([
                ['account_id' => $this->account('1200')->id, 'debit' => $amount, 'credit' => 0],
                ['account_id' => $this->account('3000')->id, 'debit' => 0, 'credit' => $amount],
            ]);

            return $entry;
        });
    }

    /**
     * Damage or adjustment:
     * Positive qty: Dr 1200 Inventory, Cr 5200 Inventory Adjustments.
     * Negative qty: Dr 5200 Inventory Adjustments, Cr 1200 Inventory.
     */
    public function postInventoryAdjustment(int $productId, int $storeId, int $quantity, float $cost, ?string $note = null): ?JournalEntry
    {
        $amount = round(abs($quantity) * $cost, 2);
        if ($amount <= 0) {
            return null;
        }

        return DB::connection('company')->transaction(function () use ($productId, $quantity, $amount, $note) {
            $desc = $quantity > 0
                ? "Positive stock adjustment (+{$quantity}) for product #{$productId}".($note ? " ({$note})" : '')
                : "Stock write-off/adjustment ({$quantity}) for product #{$productId}".($note ? " ({$note})" : '');

            $entry = JournalEntry::create([
                'entry_date' => now()->toDateString(),
                'description' => $desc,
                'source_type' => 'inventory_adjustment',
                'source_id' => $productId,
            ]);

            if ($quantity > 0) {
                $entry->lines()->createMany([
                    ['account_id' => $this->account('1200')->id, 'debit' => $amount, 'credit' => 0],
                    ['account_id' => $this->account('5200')->id, 'debit' => 0, 'credit' => $amount],
                ]);
            } else {
                $entry->lines()->createMany([
                    ['account_id' => $this->account('5200')->id, 'debit' => $amount, 'credit' => 0],
                    ['account_id' => $this->account('1200')->id, 'debit' => 0, 'credit' => $amount],
                ]);
            }

            return $entry;
        });
    }
}
