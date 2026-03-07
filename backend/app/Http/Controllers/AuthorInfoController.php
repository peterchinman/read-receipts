<?php

namespace App\Http\Controllers;

use App\Models\AuthorInfo;
use App\Models\Thread;
use Illuminate\Http\Request;

class AuthorInfoController extends Controller
{
    public function show(Thread $thread, Request $request)
    {
        $token = $request->query('token', '');

        if (
            !$thread->author_info_token ||
            !hash_equals($thread->author_info_token, $token)
        ) {
            return response()->json(['error' => 'Invalid or missing token'], 403);
        }

        if ($thread->status !== 'accepted') {
            return response()->json(['error' => 'This link is no longer valid'], 403);
        }

        $thread->load('authorInfo');

        return response()->json([
            'id'           => $thread->id,
            'name'         => $thread->name,
            'participants' => $thread->participants,
            'messages'     => $thread->messages,
            'status'       => $thread->status,
            'events'       => [],
            'existing'     => $thread->authorInfo ? [
                'payment_platform' => $thread->authorInfo->payment_platform,
                'payment_username' => $thread->authorInfo->payment_username,
                'name'             => $thread->authorInfo->name,
                'link'             => $thread->authorInfo->link,
                'bio'              => $thread->authorInfo->bio,
            ] : null,
        ]);
    }

    public function store(Thread $thread, Request $request)
    {
        $token = $request->query('token', '');

        if (
            !$thread->author_info_token ||
            !hash_equals($thread->author_info_token, $token)
        ) {
            return response()->json(['error' => 'Invalid or missing token'], 403);
        }

        if ($thread->status !== 'accepted') {
            return response()->json(['error' => 'This link is no longer valid'], 403);
        }

        $validated = $request->validate([
            'payment_platform' => 'required|string|max:255',
            'payment_username' => 'required|string|max:255',
            'name' => 'nullable|string|max:255',
            'link' => 'nullable|url|max:2048',
            'bio' => 'nullable|string',
        ]);

        AuthorInfo::updateOrCreate(
            ['thread_id' => $thread->id],
            $validated + ['thread_id' => $thread->id],
        );

        return response()->json(['message' => 'Author info submitted']);
    }
}
