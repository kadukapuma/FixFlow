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
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('store_id')->constrained()->restrictOnDelete();

            $table->string('type');
            $table->integer('quantity');

            $table->foreignId('service_product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('related_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete();

            $table->text('note')->nullable();

            $table->timestamps();

            $table->index(['product_id', 'store_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
