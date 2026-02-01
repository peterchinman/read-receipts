<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ThreadController extends Controller
{
    public function submit(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'recipient_name' => 'nullable|string|max:255',
            'recipient_location' => 'nullable|string|max:255',
            'messages' => 'required|array|min:1',
            'messages.*.sender' => 'required|in:self,other',
            'messages.*.message' => 'required|string',
            'messages.*.timestamp' => 'nullable|date',
        ]);

        $thread = $request->user()->threads()->create([
            'name' => $validated['name'] ?? null,
            'recipient_name' => $validated['recipient_name'] ?? null,
            'recipient_location' => $validated['recipient_location'] ?? null,
            'messages' => collect($validated['messages'])->map(fn($m, $i) => [
                'sender' => $m['sender'],
                'message' => $m['message'],
                'timestamp' => $m['timestamp'] ?? now()->toISOString(),
                'position' => $i,
            ])->all(),
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $thread->submissionEvents()->create([
            'event_type' => 'submitted',
        ]);

        return response()->json([
            'message' => 'Submission received',
            'id' => $thread->id,
        ], 201);
    }
}
