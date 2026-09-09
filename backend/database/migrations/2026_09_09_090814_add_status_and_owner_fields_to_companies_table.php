<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('status')->default('pending')->after('subdomain');

            $table->string('owner_name')->nullable()->after('status');
            $table->string('owner_email')->nullable()->after('owner_name');
            $table->string('owner_password')->nullable()->after('owner_email');

            $table->text('rejection_reason')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn([
                'status',
                'owner_name',
                'owner_email',
                'owner_password',
                'rejection_reason',
            ]);
        });
    }
};
