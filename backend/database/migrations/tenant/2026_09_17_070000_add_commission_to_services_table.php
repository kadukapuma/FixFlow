<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('commission_type')->nullable()->after('advance_amount');
            $table->decimal('commission_value', 10, 2)->nullable()->after('commission_type');
            $table->decimal('commission_amount', 10, 2)->nullable()->after('commission_value');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['commission_type', 'commission_value', 'commission_amount']);
        });
    }
};
