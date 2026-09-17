<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ledger_accounts', function (Blueprint $table) {
            $table->id();

            $table->string('code')->unique();
            $table->string('name');
            $table->string('type');
            $table->boolean('is_system')->default(true);

            $table->timestamps();
        });

        // Seeded here (rather than a separate seeder) so every tenant
        // database picks these up automatically, both on first provisioning
        // and via `migrate:companies` for existing companies.
        DB::table('ledger_accounts')->insert([
            ['code' => '1000', 'name' => 'Cash', 'type' => 'asset', 'is_system' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => '1010', 'name' => 'Bank', 'type' => 'asset', 'is_system' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => '4000', 'name' => 'Service Revenue', 'type' => 'revenue', 'is_system' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => '5000', 'name' => 'Technician Commission Expense', 'type' => 'expense', 'is_system' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => '2100', 'name' => 'Technician Commission Payable', 'type' => 'liability', 'is_system' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ledger_accounts');
    }
};
