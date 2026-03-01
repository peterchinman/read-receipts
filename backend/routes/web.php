<?php

use App\Mail\MagicLinkMail;
use App\Mail\SubmissionAcceptedMail;
use App\Mail\SubmissionChangesRequestedMail;
use App\Mail\SubmissionReceivedMail;
use App\Mail\SubmissionRejectedMail;
use App\Models\AuthToken;
use App\Models\Thread;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Mail preview routes — remove before deploying to production
Route::prefix('preview/mail')->group(function () {
    Route::get('/magic-link', function () {
        $token = new AuthToken([
            'token' => 'fake-token-for-preview-only',
            'expires_at' => now()->addMinutes(30),
        ]);

        return new MagicLinkMail($token);
    });

    Route::get('/submission-received', function () {
        $thread = new Thread([
            'name' => 'My Example Submission',
            'id' => 1,
        ]);

        return new SubmissionReceivedMail($thread);
    });

    Route::get('/submission-accepted', function () {
        $thread = new Thread([
            'name' => 'My Example Submission',
            'id' => 1,
        ]);

        return new SubmissionAcceptedMail($thread);
    });

    Route::get('/submission-changes-requested', function () {
        $thread = new Thread([
            'name' => 'My Example Submission',
            'id' => 1,
            'edit_token' => 'fake-edit-token-for-preview-only',
        ]);

        return new SubmissionChangesRequestedMail($thread, 'Please revise the third paragraph — the tone feels off, and the ending needs more clarity.');
    });

    Route::get('/submission-rejected', function () {
        $thread = new Thread([
            'name' => 'My Example Submission',
            'id' => 1,
        ]);

        return new SubmissionRejectedMail($thread, 'Unfortunately this piece isn\'t the right fit for us at this time. We encourage you to submit again in the future!');
    });
});
