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
            $table->text('unrepairable_reason')->nullable()->after('fault');
            $table->date('unrepairable_date')->nullable()->after('completed_date');
            $table->date('returned_date')->nullable()->after('delivered_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['unrepairable_reason', 'unrepairable_date', 'returned_date']);
        });
    }
};
