<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $invAccountId = DB::table('ledger_accounts')->where('code', '1200')->value('id');
        $eqAccountId = DB::table('ledger_accounts')->where('code', '3000')->value('id');

        $products = DB::table('products')
            ->whereNotNull('purchase_price')
            ->where('purchase_price', '>', 0)
            ->get();

        foreach ($products as $product) {
            DB::table('products')
                ->where('id', $product->id)
                ->update(['average_cost' => $product->purchase_price]);

            $totalStock = (int) DB::table('stock_movements')
                ->where('product_id', $product->id)
                ->sum('quantity');

            if ($totalStock > 0 && $invAccountId && $eqAccountId) {
                $alreadyPosted = DB::table('journal_entries')
                    ->where('source_type', 'inventory_opening')
                    ->where('source_id', $product->id)
                    ->exists();

                if (! $alreadyPosted) {
                    $totalValue = round($totalStock * (float) $product->purchase_price, 2);

                    $entryId = DB::table('journal_entries')->insertGetId([
                        'entry_date' => now()->toDateString(),
                        'description' => 'Initial opening inventory backfill for product #'.$product->id.' ('.$product->name.')',
                        'source_type' => 'inventory_opening',
                        'source_id' => $product->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    DB::table('journal_entry_lines')->insert([
                        [
                            'journal_entry_id' => $entryId,
                            'account_id' => $invAccountId,
                            'debit' => $totalValue,
                            'credit' => 0,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ],
                        [
                            'journal_entry_id' => $entryId,
                            'account_id' => $eqAccountId,
                            'debit' => 0,
                            'credit' => $totalValue,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ],
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $entryIds = DB::table('journal_entries')
            ->where('source_type', 'inventory_opening')
            ->pluck('id');

        DB::table('journal_entry_lines')->whereIn('journal_entry_id', $entryIds)->delete();
        DB::table('journal_entries')->whereIn('id', $entryIds)->delete();
    }
};
