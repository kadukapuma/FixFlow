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
        Schema::table('companies', function (Blueprint $table) {
            $table->decimal('subscription_price', 10, 2)->nullable();
            $table->dateTime('active_until')->nullable();
            $table->dateTime('grace_ends_at')->nullable();
            $table->dateTime('subscription_deactivated_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn([
                'subscription_price',
                'active_until',
                'grace_ends_at',
                'subscription_deactivated_at',
            ]);
        });
    }
};
