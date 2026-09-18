<?php

namespace App\Http\Controllers;

use App\Models\JournalEntryLine;
use App\Models\LedgerAccount;

class LedgerAccountController extends Controller
{
    private const CREDIT_NORMAL_TYPES = ['liability', 'revenue', 'equity'];

    public function index()
    {
        $accounts = LedgerAccount::withSum('lines as total_debit', 'debit')
            ->withSum('lines as total_credit', 'credit')
            ->orderBy('code')
            ->get()
            ->map(function (LedgerAccount $account) {
                return [
                    'id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'type' => $account->type,
                    'balance' => $this->balance(
                        $account->type,
                        (float) $account->total_debit,
                        (float) $account->total_credit
                    ),
                ];
            });

        return response()->json($accounts);
    }

    public function show(int $id)
    {
        $account = LedgerAccount::findOrFail($id);
        $creditNormal = in_array($account->type, self::CREDIT_NORMAL_TYPES, true);

        $lines = $account->lines()
            ->with(['journalEntry.lines.account'])
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->orderBy('journal_entries.entry_date')
            ->orderBy('journal_entry_lines.id')
            ->select('journal_entry_lines.*')
            ->get();

        $running = 0.0;

        $entries = $lines->map(function (JournalEntryLine $line) use (&$running, $creditNormal) {
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;
            $running += $creditNormal ? ($credit - $debit) : ($debit - $credit);

            $contraAccounts = $line->journalEntry->lines
                ->where('id', '!=', $line->id)
                ->map(fn ($otherLine) => $otherLine->account->name)
                ->unique()
                ->values();

            return [
                'id' => $line->id,
                'entry_date' => $line->journalEntry->entry_date->format('Y-m-d'),
                'description' => $line->journalEntry->description,
                'source_type' => $line->journalEntry->source_type,
                'debit' => $debit,
                'credit' => $credit,
                'running_balance' => round($running, 2),
                'contra_accounts' => $contraAccounts,
            ];
        });

        return response()->json([
            'id' => $account->id,
            'code' => $account->code,
            'name' => $account->name,
            'type' => $account->type,
            'balance' => round($running, 2),
            'entries' => $entries,
        ]);
    }

    private function balance(string $type, float $totalDebit, float $totalCredit): float
    {
        $creditNormal = in_array($type, self::CREDIT_NORMAL_TYPES, true);

        return round($creditNormal ? $totalCredit - $totalDebit : $totalDebit - $totalCredit, 2);
    }
}
