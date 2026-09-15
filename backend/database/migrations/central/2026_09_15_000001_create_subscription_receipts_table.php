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
        Schema::create('subscription_receipts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('company_id')->constrained()->cascadeOnDelete();

            $table->string('file_path');
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->decimal('amount', 10, 2)->nullable();
            $table->string('note')->nullable();
            $table->string('rejection_reason')->nullable();

            $table->string('reviewed_by')->nullable();
            $table->dateTime('reviewed_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_receipts');
    }
};
