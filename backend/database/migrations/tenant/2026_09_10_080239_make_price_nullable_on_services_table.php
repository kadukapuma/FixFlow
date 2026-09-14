<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // doctrine/dbal isn't installed, so ->nullable()->change() isn't available.
        // Schema::getConnection() (rather than the DB facade) keeps this targeting
        // whichever connection --database=company routed this migration to.
        Schema::getConnection()->statement(
            'ALTER TABLE services MODIFY price DECIMAL(10, 2) NULL DEFAULT NULL'
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::getConnection()->statement(
            'ALTER TABLE services MODIFY price DECIMAL(10, 2) NOT NULL DEFAULT 0'
        );
    }
};
