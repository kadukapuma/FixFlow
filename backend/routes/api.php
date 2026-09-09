<?php

use App\Http\Controllers\CompanyController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CustomerController;

Route::middleware('company')->group(function () {

    Route::get('/company', [CompanyController::class, 'test']);
    
    Route::get('/customers', [CustomerController::class, 'index']);

    Route::post('/customers', [CustomerController::class, 'store']);
});
