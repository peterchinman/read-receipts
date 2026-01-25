<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\ThreadController;
use App\Http\Middleware\AdminMiddleware;
use Illuminate\Support\Facades\Route;

// Public routes
Route::prefix('auth')->group(function () {
    Route::post('/magic-link', [AuthController::class, 'requestMagicLink']);
    Route::get('/verify/{token}', [AuthController::class, 'verifyToken']);
});

Route::prefix('published')->group(function () {
    Route::get('/', [PublicController::class, 'index']);
    Route::get('/{thread}', [PublicController::class, 'show']);
});

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Threads
    Route::apiResource('threads', ThreadController::class);
    Route::post('/threads/{thread}/submit', [ThreadController::class, 'submit']);

    // Messages
    Route::post('/threads/{thread}/messages', [MessageController::class, 'store']);
    Route::put('/messages/{message}', [MessageController::class, 'update']);
    Route::delete('/messages/{message}', [MessageController::class, 'destroy']);
    Route::post('/messages/{message}/images', [MessageController::class, 'uploadImage']);

    // Admin routes
    Route::prefix('admin')->middleware(AdminMiddleware::class)->group(function () {
        Route::get('/submissions', [AdminController::class, 'submissions']);
        Route::get('/submissions/{thread}', [AdminController::class, 'showSubmission']);
        Route::post('/submissions/{thread}/accept', [AdminController::class, 'accept']);
        Route::post('/submissions/{thread}/reject', [AdminController::class, 'reject']);
        Route::post('/submissions/{thread}/publish', [AdminController::class, 'publish']);
    });
});
