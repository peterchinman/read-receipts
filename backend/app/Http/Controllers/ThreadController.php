<?php

namespace App\Http\Controllers;

use App\Models\Thread;
use Illuminate\Http\Request;

class ThreadController extends Controller
{
    public function index(Request $request)
    {
        $threads = $request->user()
            ->threads()
            ->with(['messages.images'])
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json($threads->map(fn($thread) => $this->formatThread($thread)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'recipient_name' => 'nullable|string|max:255',
            'recipient_location' => 'nullable|string|max:255',
            'messages' => 'nullable|array',
            'messages.*.sender' => 'required|in:self,other',
            'messages.*.message' => 'required|string',
            'messages.*.timestamp' => 'nullable|date',
        ]);

        $thread = $request->user()->threads()->create([
            'name' => $validated['name'] ?? null,
            'recipient_name' => $validated['recipient_name'] ?? null,
            'recipient_location' => $validated['recipient_location'] ?? null,
            'status' => 'draft',
        ]);

        if (!empty($validated['messages'])) {
            foreach ($validated['messages'] as $position => $messageData) {
                $thread->messages()->create([
                    'sender' => $messageData['sender'],
                    'message' => $messageData['message'],
                    'timestamp' => $messageData['timestamp'] ?? now(),
                    'position' => $position,
                ]);
            }
        }

        $thread->load('messages.images');

        return response()->json($this->formatThread($thread), 201);
    }

    public function show(Request $request, Thread $thread)
    {
        $this->authorize('view', $thread);

        $thread->load('messages.images');

        return response()->json($this->formatThread($thread));
    }

    public function update(Request $request, Thread $thread)
    {
        $this->authorize('update', $thread);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'recipient_name' => 'nullable|string|max:255',
            'recipient_location' => 'nullable|string|max:255',
        ]);

        $thread->update($validated);
        $thread->load('messages.images');

        return response()->json($this->formatThread($thread));
    }

    public function destroy(Request $request, Thread $thread)
    {
        $this->authorize('delete', $thread);

        $thread->delete();

        return response()->json(['message' => 'Thread deleted']);
    }

    public function submit(Request $request, Thread $thread)
    {
        $this->authorize('update', $thread);

        if ($thread->status !== 'draft') {
            return response()->json([
                'error' => 'Only drafts can be submitted',
            ], 422);
        }

        $thread->submit();
        $thread->load('messages.images');

        return response()->json($this->formatThread($thread));
    }

    protected function formatThread(Thread $thread): array
    {
        return [
            'id' => $thread->id,
            'name' => $thread->name,
            'recipient_name' => $thread->recipient_name,
            'recipient_location' => $thread->recipient_location,
            'status' => $thread->status,
            'submitted_at' => $thread->submitted_at?->toISOString(),
            'published_at' => $thread->published_at?->toISOString(),
            'created_at' => $thread->created_at->toISOString(),
            'updated_at' => $thread->updated_at->toISOString(),
            'messages' => $thread->messages->map(fn($msg) => [
                'id' => $msg->id,
                'sender' => $msg->sender,
                'message' => $msg->message,
                'timestamp' => $msg->timestamp?->toISOString(),
                'position' => $msg->position,
                'images' => $msg->images->map(fn($img) => [
                    'id' => $img->id,
                    'filename' => $img->filename,
                    'alt_text' => $img->alt_text,
                    'position' => $img->position,
                    'url' => asset('storage/images/' . $img->filename),
                ]),
            ]),
        ];
    }
}
