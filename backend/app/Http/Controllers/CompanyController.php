<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class CompanyController extends Controller
{
    public function test()
    {
        $company = app('currentCompany');

        $database = DB::connection('company')
            ->getDatabaseName();

        return response()->json([
            'company' => $company->name,
            'subdomain' => $company->subdomain,
            'database' => $database,
        ]);
    }
}
