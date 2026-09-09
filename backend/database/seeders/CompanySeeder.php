<?php

namespace Database\Seeders;

use App\Models\Company;
use Illuminate\Database\Seeder;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        Company::updateOrCreate(
            ['subdomain' => 'company01'],
            [
                'name' => 'Company 01',
                'database_name' => 'database01',
                'database_host' => '127.0.0.1',
                'database_port' => 3306,
                'database_username' => 'root',
                'database_password' => '',
                'is_active' => true,
                'status' => Company::STATUS_APPROVED,
            ]
        );

        Company::updateOrCreate(
            ['subdomain' => 'company02'],
            [
                'name' => 'Company 02',
                'database_name' => 'database02',
                'database_host' => '127.0.0.1',
                'database_port' => 3306,
                'database_username' => 'root',
                'database_password' => '',
                'is_active' => true,
                'status' => Company::STATUS_APPROVED,
            ]
        );
    }
}
