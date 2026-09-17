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
}
