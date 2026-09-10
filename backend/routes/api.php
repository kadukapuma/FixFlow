<?php

use App\Http\Controllers\Central\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Central\Admin\CompanyApprovalController;
use App\Http\Controllers\Central\CompanyLoginLookupController;
use App\Http\Controllers\Central\CompanyRegistrationController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\Tenant\AuthController as TenantAuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Central routes (root domain — no tenant database involved)
|--------------------------------------------------------------------------
*/

Route::post('/register-company', [CompanyRegistrationController::class, 'store']);
Route::post('/login-lookup', [CompanyLoginLookupController::class, 'lookup']);

Route::post('/admin/login', [AdminAuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'super_admin'])->prefix('admin')->group(function () {
    Route::post('/logout', [AdminAuthController::class, 'logout']);

    Route::get('/companies', [CompanyApprovalController::class, 'index']);
    Route::post('/companies/{company}/approve', [CompanyApprovalController::class, 'approve']);
    Route::post('/companies/{company}/reject', [CompanyApprovalController::class, 'reject']);
    Route::post('/companies/{company}/deactivate', [CompanyApprovalController::class, 'deactivate']);
    Route::post('/companies/{company}/activate', [CompanyApprovalController::class, 'activate']);
});

/*
|--------------------------------------------------------------------------
| Tenant routes (subdomain — resolved to a per-company database)
|--------------------------------------------------------------------------
*/

Route::middleware('company')->group(function () {

    Route::post('/login', [TenantAuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [TenantAuthController::class, 'logout']);
        Route::get('/me', [TenantAuthController::class, 'me']);

        Route::get('/company', [CompanyController::class, 'test']);

        Route::get('/customers', [CustomerController::class, 'index']);
        Route::get('/customers/search', [CustomerController::class, 'search']);
        Route::post('/customers', [CustomerController::class, 'store']);

        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{id}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
        Route::post('/employees/{id}/activate', [EmployeeController::class, 'activate']);
        Route::post('/employees/{id}/deactivate', [EmployeeController::class, 'deactivate']);

        Route::post('/items', [ItemController::class, 'store']);

        Route::get('/services', [ServiceController::class, 'index']);
        Route::post('/services', [ServiceController::class, 'store']);
    });
});
