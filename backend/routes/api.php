<?php

use App\Http\Controllers\Central\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Central\Admin\CompanyApprovalController;
use App\Http\Controllers\Central\Admin\SubscriptionReceiptController as AdminSubscriptionReceiptController;
use App\Http\Controllers\Central\CompanyLoginLookupController;
use App\Http\Controllers\Central\CompanyRegistrationController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\CompanySettingsController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\GettingItemsFromCustomerController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\Tenant\AuthController as TenantAuthController;
use App\Http\Controllers\WorkController;
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

    Route::get('/companies/stats', [CompanyApprovalController::class, 'stats']);
    Route::get('/companies', [CompanyApprovalController::class, 'index']);
    Route::post('/companies/{company}/approve', [CompanyApprovalController::class, 'approve']);
    Route::post('/companies/{company}/reject', [CompanyApprovalController::class, 'reject']);
    Route::post('/companies/{company}/deactivate', [CompanyApprovalController::class, 'deactivate']);
    Route::post('/companies/{company}/activate', [CompanyApprovalController::class, 'activate']);
    Route::put('/companies/{company}/subscription-price', [CompanyApprovalController::class, 'updatePrice']);
    Route::delete('/companies/{company}', [CompanyApprovalController::class, 'destroy']);

    Route::get('/receipts', [AdminSubscriptionReceiptController::class, 'index']);
    Route::get('/receipts/{receipt}/file', [AdminSubscriptionReceiptController::class, 'file']);
    Route::delete('/receipts/{receipt}/file', [AdminSubscriptionReceiptController::class, 'destroyFile']);
    Route::post('/receipts/{receipt}/approve', [AdminSubscriptionReceiptController::class, 'approve']);
    Route::post('/receipts/{receipt}/reject', [AdminSubscriptionReceiptController::class, 'reject']);
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

        Route::get('/company/settings', [CompanySettingsController::class, 'show']);
        Route::post('/company/settings', [CompanySettingsController::class, 'update']);
        Route::post('/company/settings/preview', [CompanySettingsController::class, 'preview']);
        Route::get('/company/logo', [CompanySettingsController::class, 'logo']);

        Route::get('/company/subscription', [SubscriptionController::class, 'show']);
        Route::post('/company/subscription/receipts', [SubscriptionController::class, 'storeReceipt']);
        Route::get('/company/subscription/receipts/{receipt}', [SubscriptionController::class, 'receiptFile']);

        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

        Route::get('/customers', [CustomerController::class, 'index']);
        Route::get('/customers/search', [CustomerController::class, 'search']);
        Route::post('/customers', [CustomerController::class, 'store']);
        Route::put('/customers/{id}', [CustomerController::class, 'update']);
        Route::delete('/customers/{id}', [CustomerController::class, 'destroy']);
        Route::post('/customers/{id}/suspend', [CustomerController::class, 'suspend']);
        Route::post('/customers/{id}/unsuspend', [CustomerController::class, 'unsuspend']);

        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::put('/employees/{id}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
        Route::post('/employees/{id}/activate', [EmployeeController::class, 'activate']);
        Route::post('/employees/{id}/deactivate', [EmployeeController::class, 'deactivate']);

        Route::get('/received-items', [GettingItemsFromCustomerController::class, 'index']);
        Route::post('/received-items', [GettingItemsFromCustomerController::class, 'store']);
        Route::put('/received-items/{id}', [GettingItemsFromCustomerController::class, 'update']);
        Route::delete('/received-items/{id}', [GettingItemsFromCustomerController::class, 'destroy']);

        Route::get('/customers/{id}/items', [ItemController::class, 'forCustomer']);
        Route::post('/items', [ItemController::class, 'store']);

        Route::get('/services', [ServiceController::class, 'index']);
        Route::post('/services', [ServiceController::class, 'store']);
        Route::get('/services/search', [ServiceController::class, 'search']);
        Route::get('/services/{id}', [ServiceController::class, 'show']);
        Route::get('/services/{id}/pdf', [ServiceController::class, 'pdf']);
        Route::get('/services/{id}/invoice', [ServiceController::class, 'invoice']);
        Route::post('/services/{id}/start', [ServiceController::class, 'start']);
        Route::post('/services/{id}/complete', [ServiceController::class, 'complete']);
        Route::post('/services/{id}/deliver', [ServiceController::class, 'deliver']);
        Route::put('/services/{id}/price', [ServiceController::class, 'updatePrice']);

        Route::get('/work', [WorkController::class, 'index']);
        Route::post('/work', [WorkController::class, 'store']);
    });
});
