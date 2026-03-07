<?php

namespace App\Http\Controllers;

use App\Models\Thread;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    public function index(Request $request)
    {
        $threads = Thread::published()
            ->with(['user:id,name,display_name', 'authorInfo'])
            ->orderBy('published_at', 'desc')
            ->paginate(20);

        return response()->json([
            'data' => $threads->map(fn($thread) => $this->formatPublicThread($thread)),
            'meta' => [
                'current_page' => $threads->currentPage(),
                'last_page' => $threads->lastPage(),
                'per_page' => $threads->perPage(),
                'total' => $threads->total(),
            ],
        ]);
    }

    public function show(Thread $thread)
    {
        if ($thread->status !== 'published') {
            return response()->json(['error' => 'Thread not found'], 404);
        }

        $thread->load(['user:id,name,display_name', 'authorInfo']);

        return response()->json($this->formatPublicThread($thread));
    }

    protected function formatPublicThread(Thread $thread): array
    {
        return [
            'id' => $thread->id,
            'name' => $thread->name,
            'participants' => $thread->participants,
            'published_at' => $thread->published_at?->toISOString(),
            'author' => [
                'name' => $thread->user->display_name ?? $thread->user->name,
            ],
            'messages' => collect($thread->messages)->map(fn($msg) => [
                'sender' => $msg['sender'],
                'message' => $msg['message'],
                'timestamp' => $msg['timestamp'] ?? null,
            ]),
            'author_info' => $thread->authorInfo ? [
                'name' => $thread->authorInfo->name,
                'bio' => $thread->authorInfo->bio,
                'link' => $thread->authorInfo->link,
            ] : null,
        ];
    }
}
