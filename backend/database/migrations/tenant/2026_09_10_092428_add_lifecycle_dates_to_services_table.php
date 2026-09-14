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
            $table->date('service_date')->nullable()->after('price');
            $table->date('started_date')->nullable()->after('service_date');
            $table->date('completed_date')->nullable()->after('started_date');
            $table->date('delivered_date')->nullable()->after('completed_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['service_date', 'started_date', 'completed_date', 'delivered_date']);
        });
    }
};
