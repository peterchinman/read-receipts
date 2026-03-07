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

        $authorInfo = $thread->authorInfo;

        // If this thread has no author info yet, look for info from a previous piece by the same user
        if (!$authorInfo) {
            $authorInfo = AuthorInfo::whereHas('thread', fn($q) => $q->where('user_id', $thread->user_id))
                ->where('thread_id', '!=', $thread->id)
                ->latest()
                ->first();
        }

        return response()->json([
            'id'           => $thread->id,
            'name'         => $thread->name,
            'participants' => $thread->participants,
            'messages'     => $thread->messages,
            'status'       => $thread->status,
            'events'       => [],
            'existing'     => $authorInfo ? [
                'payment_platform' => $authorInfo->payment_platform,
                'payment_username' => $authorInfo->payment_username,
                'name'             => $authorInfo->name,
                'link'             => $authorInfo->link,
                'bio'              => $authorInfo->bio,
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
