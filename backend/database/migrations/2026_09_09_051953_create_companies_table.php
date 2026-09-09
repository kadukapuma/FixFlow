<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();

            $table->string('name');

            // company01, company02, etc.
            $table->string('subdomain')->unique();

            // database01, database02, etc.
            $table->string('database_name');

            $table->string('database_host')->default('127.0.0.1');
            $table->unsignedInteger('database_port')->default(3306);
            $table->string('database_username');
            $table->string('database_password')->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
