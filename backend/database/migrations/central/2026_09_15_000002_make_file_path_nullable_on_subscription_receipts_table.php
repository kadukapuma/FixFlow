<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// A plain Schema::table(...)->nullable()->change() needs doctrine/dbal,
// which isn't installed in this project — raw SQL avoids adding it just for
// one column tweak.
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE subscription_receipts MODIFY file_path VARCHAR(255) NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE subscription_receipts MODIFY file_path VARCHAR(255) NOT NULL');
    }
};
