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
        DB::table('ledger_accounts')->insertOrIgnore([
            ['code' => '1200', 'name' => 'Inventory', 'type' => 'asset', 'is_system' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => '2000', 'name' => 'Accounts Payable', 'type' => 'liability', 'is_system' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => '5100', 'name' => 'Cost of Goods Sold', 'type' => 'expense', 'is_system' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => '3000', 'name' => 'Opening Balance Equity', 'type' => 'equity', 'is_system' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => '5200', 'name' => 'Inventory Adjustments & Write-offs', 'type' => 'expense', 'is_system' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('ledger_accounts')
            ->whereIn('code', ['1200', '2000', '5100', '3000', '5200'])
            ->delete();
    }
};
