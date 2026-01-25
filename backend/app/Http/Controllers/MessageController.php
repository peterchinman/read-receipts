<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Thread;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MessageController extends Controller
{
    public function store(Request $request, Thread $thread)
    {
        $this->authorize('update', $thread);

        $validated = $request->validate([
            'sender' => 'required|in:self,other',
            'message' => 'required|string',
            'timestamp' => 'nullable|date',
            'position' => 'nullable|integer',
        ]);

        $position = $validated['position'] ?? $thread->messages()->max('position') + 1;

        $message = $thread->messages()->create([
            'sender' => $validated['sender'],
            'message' => $validated['message'],
            'timestamp' => $validated['timestamp'] ?? now(),
            'position' => $position,
        ]);

        $thread->touch();

        return response()->json([
            'id' => $message->id,
            'sender' => $message->sender,
            'message' => $message->message,
            'timestamp' => $message->timestamp?->toISOString(),
            'position' => $message->position,
            'images' => [],
        ], 201);
    }

    public function update(Request $request, Message $message)
    {
        $this->authorize('update', $message->thread);

        $validated = $request->validate([
            'sender' => 'sometimes|in:self,other',
            'message' => 'sometimes|string',
            'timestamp' => 'nullable|date',
            'position' => 'nullable|integer',
        ]);

        $message->update($validated);
        $message->thread->touch();
        $message->load('images');

        return response()->json([
            'id' => $message->id,
            'sender' => $message->sender,
            'message' => $message->message,
            'timestamp' => $message->timestamp?->toISOString(),
            'position' => $message->position,
            'images' => $message->images->map(fn($img) => [
                'id' => $img->id,
                'filename' => $img->filename,
                'alt_text' => $img->alt_text,
                'position' => $img->position,
                'url' => asset('storage/images/' . $img->filename),
            ]),
        ]);
    }

    public function destroy(Message $message)
    {
        $this->authorize('update', $message->thread);

        $thread = $message->thread;
        $message->delete();
        $thread->touch();

        return response()->json(['message' => 'Message deleted']);
    }

    public function uploadImage(Request $request, Message $message)
    {
        $this->authorize('update', $message->thread);

        $request->validate([
            'image' => 'required|image|max:10240',
            'alt_text' => 'nullable|string|max:255',
        ]);

        $path = $request->file('image')->store('images', 'public');
        $filename = basename($path);

        $position = $message->images()->max('position') + 1;

        $image = $message->images()->create([
            'filename' => $filename,
            'alt_text' => $request->alt_text,
            'position' => $position,
        ]);

        return response()->json([
            'id' => $image->id,
            'filename' => $image->filename,
            'alt_text' => $image->alt_text,
            'position' => $image->position,
            'url' => asset('storage/images/' . $image->filename),
        ], 201);
    }
}
