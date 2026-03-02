<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\ThreadController;
use App\Http\Middleware\AdminMiddleware;
use Illuminate\Support\Facades\Route;

// Public routes
Route::prefix('auth')->group(function () {
    Route::post('/magic-link', [AuthController::class, 'requestMagicLink']);
    Route::get('/verify/{token}', [AuthController::class, 'verifyToken']);
    Route::post('/dev-login', [AuthController::class, 'devLogin']);
});

Route::prefix('published')->group(function () {
    Route::get('/', [PublicController::class, 'index']);
    Route::get('/{thread}', [PublicController::class, 'show']);
});

// Token-gated submission access (no auth required)
Route::get('/submissions/{thread}/edit', [ThreadController::class, 'showByEditToken']);
Route::post('/submit/{thread}/resubmit', [ThreadController::class, 'resubmit']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Submit
    Route::post('/submit', [ThreadController::class, 'submit']);

    // Admin routes
    Route::prefix('admin')->middleware(AdminMiddleware::class)->group(function () {
        Route::get('/submissions', [AdminController::class, 'submissions']);
        Route::get('/submissions/{thread}', [AdminController::class, 'showSubmission']);
        Route::post('/submissions/{thread}/accept', [AdminController::class, 'accept']);
        Route::post('/submissions/{thread}/reject', [AdminController::class, 'reject']);
        Route::post('/submissions/{thread}/publish', [AdminController::class, 'publish']);
        Route::post('/submissions/{thread}/request-changes', [AdminController::class, 'requestChanges']);
        Route::post('/submissions/{thread}/mark-paid', [AdminController::class, 'markPaid']);
        Route::delete('/submissions/{thread}', [AdminController::class, 'destroy']);
    });
});
