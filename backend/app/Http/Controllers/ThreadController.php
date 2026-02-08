<?php

namespace App\Http\Controllers;

use App\Models\Thread;
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

    public function mySubmission(Request $request, Thread $thread)
    {
        if ($thread->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $thread->load('submissionEvents');

        return response()->json([
            'id' => $thread->id,
            'name' => $thread->name,
            'recipient_name' => $thread->recipient_name,
            'recipient_location' => $thread->recipient_location,
            'status' => $thread->status,
            'messages' => $thread->messages,
            'events' => $thread->submissionEvents->map(fn($event) => [
                'type' => $event->event_type,
                'notes' => $event->notes,
                'created_at' => $event->created_at->toISOString(),
            ]),
        ]);
    }

    public function resubmit(Request $request, Thread $thread)
    {
        if ($thread->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        if ($thread->status !== 'changes_requested') {
            return response()->json(['error' => 'Can only resubmit pieces with requested changes'], 422);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'recipient_name' => 'nullable|string|max:255',
            'recipient_location' => 'nullable|string|max:255',
            'messages' => 'required|array|min:1',
            'messages.*.sender' => 'required|in:self,other',
            'messages.*.message' => 'required|string',
            'messages.*.timestamp' => 'nullable|date',
        ]);

        $thread->resubmit([
            'name' => $validated['name'] ?? null,
            'recipient_name' => $validated['recipient_name'] ?? null,
            'recipient_location' => $validated['recipient_location'] ?? null,
            'messages' => collect($validated['messages'])->map(fn($m, $i) => [
                'sender' => $m['sender'],
                'message' => $m['message'],
                'timestamp' => $m['timestamp'] ?? now()->toISOString(),
                'position' => $i,
            ])->all(),
        ]);

        return response()->json(['message' => 'Resubmission received']);
    }
}
