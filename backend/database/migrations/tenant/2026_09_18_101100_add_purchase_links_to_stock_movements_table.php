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
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignId('purchase_item_id')->nullable()->after('service_product_id')->constrained('purchase_items')->restrictOnDelete();
            $table->foreignId('purchase_return_item_id')->nullable()->after('purchase_item_id')->constrained('purchase_return_items')->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropForeign(['purchase_item_id']);
            $table->dropColumn('purchase_item_id');

            $table->dropForeign(['purchase_return_item_id']);
            $table->dropColumn('purchase_return_item_id');
        });
    }
};
