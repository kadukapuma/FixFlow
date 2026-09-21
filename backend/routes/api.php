<?php

use App\Http\Controllers\Central\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Central\Admin\CompanyApprovalController;
use App\Http\Controllers\Central\Admin\SubscriptionReceiptController as AdminSubscriptionReceiptController;
use App\Http\Controllers\Central\CompanyLoginLookupController;
use App\Http\Controllers\Central\CompanyRegistrationController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CommissionController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\CompanySettingsController;
use App\Http\Controllers\CustomerBalanceController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\GettingItemsFromCustomerController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\LedgerAccountController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\PurchaseReturnController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ServicePaymentController;
use App\Http\Controllers\ServiceProductController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\SupplierBalanceController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\SupplierPaymentController;
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

        Route::get('/categories', [CategoryController::class, 'index']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{id}', [CategoryController::class, 'update']);
        Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
        Route::post('/categories/{id}/activate', [CategoryController::class, 'activate']);
        Route::post('/categories/{id}/deactivate', [CategoryController::class, 'deactivate']);

        Route::get('/brands', [BrandController::class, 'index']);
        Route::post('/brands', [BrandController::class, 'store']);
        Route::put('/brands/{id}', [BrandController::class, 'update']);
        Route::delete('/brands/{id}', [BrandController::class, 'destroy']);
        Route::post('/brands/{id}/activate', [BrandController::class, 'activate']);
        Route::post('/brands/{id}/deactivate', [BrandController::class, 'deactivate']);

        Route::get('/stores', [StoreController::class, 'index']);
        Route::post('/stores', [StoreController::class, 'store']);
        Route::put('/stores/{id}', [StoreController::class, 'update']);
        Route::delete('/stores/{id}', [StoreController::class, 'destroy']);
        Route::post('/stores/{id}/activate', [StoreController::class, 'activate']);
        Route::post('/stores/{id}/deactivate', [StoreController::class, 'deactivate']);

        Route::get('/suppliers', [SupplierController::class, 'index']);
        Route::post('/suppliers', [SupplierController::class, 'store']);
        Route::put('/suppliers/{id}', [SupplierController::class, 'update']);
        Route::delete('/suppliers/{id}', [SupplierController::class, 'destroy']);
        Route::post('/suppliers/{id}/activate', [SupplierController::class, 'activate']);
        Route::post('/suppliers/{id}/deactivate', [SupplierController::class, 'deactivate']);

        Route::get('/received-items', [GettingItemsFromCustomerController::class, 'index']);
        Route::post('/received-items', [GettingItemsFromCustomerController::class, 'store']);
        Route::put('/received-items/{id}', [GettingItemsFromCustomerController::class, 'update']);
        Route::delete('/received-items/{id}', [GettingItemsFromCustomerController::class, 'destroy']);

        Route::get('/customers/{id}/items', [ItemController::class, 'forCustomer']);
        Route::post('/items', [ItemController::class, 'store']);

        Route::get('/products', [ProductController::class, 'index']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{id}', [ProductController::class, 'update']);
        Route::delete('/products/{id}', [ProductController::class, 'destroy']);
        Route::post('/products/{id}/activate', [ProductController::class, 'activate']);
        Route::post('/products/{id}/deactivate', [ProductController::class, 'deactivate']);

        Route::get('/stock/levels', [StockController::class, 'levels']);
        Route::get('/stock/movements', [StockController::class, 'movements']);
        Route::get('/stock/records', [StockController::class, 'records']);
        Route::post('/stock/opening', [StockController::class, 'storeOpening']);
        Route::post('/stock/adjustments', [StockController::class, 'adjust']);
        Route::post('/stock/damage', [StockController::class, 'damage']);
        Route::post('/stock/transfers', [StockController::class, 'transfer']);

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
        Route::get('/services/{id}/payments', [ServicePaymentController::class, 'index']);
        Route::post('/services/{id}/payments', [ServicePaymentController::class, 'store']);

        Route::get('/commissions', [CommissionController::class, 'index']);
        Route::get('/commissions/{employeeId}', [CommissionController::class, 'show']);
        Route::post('/commissions/{employeeId}/payouts', [CommissionController::class, 'payout']);

        Route::get('/ledger-accounts', [LedgerAccountController::class, 'index']);
        Route::get('/ledger-accounts/{id}', [LedgerAccountController::class, 'show']);

        Route::get('/customer-balances', [CustomerBalanceController::class, 'index']);
        Route::get('/customer-balances/{customerId}', [CustomerBalanceController::class, 'show']);

        Route::get('/work', [WorkController::class, 'index']);
        Route::post('/work', [WorkController::class, 'store']);

        Route::get('/service-products', [ServiceProductController::class, 'index']);
        Route::post('/service-products', [ServiceProductController::class, 'store']);
        Route::put('/service-products/{id}', [ServiceProductController::class, 'update']);
        Route::delete('/service-products/{id}', [ServiceProductController::class, 'destroy']);

        Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
        Route::get('/purchase-orders/{id}', [PurchaseOrderController::class, 'show']);
        Route::post('/purchase-orders', [PurchaseOrderController::class, 'store']);
        Route::put('/purchase-orders/{id}', [PurchaseOrderController::class, 'update']);
        Route::post('/purchase-orders/{id}/cancel', [PurchaseOrderController::class, 'cancel']);

        Route::get('/purchases', [PurchaseController::class, 'index']);
        Route::get('/purchases/{id}', [PurchaseController::class, 'show']);
        Route::post('/purchases', [PurchaseController::class, 'store']);
        Route::post('/purchases/{id}/cancel', [PurchaseController::class, 'cancel']);

        Route::get('/supplier-payments', [SupplierPaymentController::class, 'index']);
        Route::post('/supplier-payments', [SupplierPaymentController::class, 'store']);

        Route::get('/purchase-returns', [PurchaseReturnController::class, 'index']);
        Route::get('/purchase-returns/{id}', [PurchaseReturnController::class, 'show']);
        Route::post('/purchase-returns', [PurchaseReturnController::class, 'store']);

        Route::get('/supplier-balances', [SupplierBalanceController::class, 'index']);
        Route::get('/supplier-balances/{supplierId}', [SupplierBalanceController::class, 'show']);
    });
});
