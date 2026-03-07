<?php

namespace App\Http\Controllers;

use App\Mail\ResubmissionReceivedMail;
use App\Mail\SubmissionReceivedMail;
use App\Models\Thread;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ThreadController extends Controller
{
    public function submit(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'participants' => 'nullable|array',
            'participants.*.id' => 'nullable|string|max:255',
            'participants.*.full_name' => 'nullable|string|max:255',
            'participants.*.location' => 'nullable|string|max:255',
            'participants.*.avatar_url' => 'nullable|string|max:2048',
            'messages' => 'required|array|min:1',
            'messages.*.sender' => 'required|string|max:255',
            'messages.*.message' => 'required|string',
            'messages.*.timestamp' => 'nullable|date',
        ]);

        $thread = $request->user()->threads()->create([
            'name' => $validated['name'] ?? null,
            'participants' => $validated['participants'] ?? null,
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

        Mail::to($request->user()->email)->queue(new SubmissionReceivedMail($thread));

        return response()->json([
            'message' => 'Submission received',
            'id' => $thread->id,
        ], 201);
    }

    public function showByEditToken(Request $request, Thread $thread)
    {
        $token = $request->query('token');

        if (!$token || !$thread->edit_token || $thread->status !== 'changes_requested') {
            return response()->json(['error' => 'Not found'], 404);
        }

        if (!hash_equals($thread->edit_token, $token)) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $thread->load('submissionEvents');

        return response()->json([
            'id' => $thread->id,
            'name' => $thread->name,
            'participants' => $thread->participants,
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
        $editToken = $request->input('edit_token');

        if ($editToken) {
            if (!$thread->edit_token || !hash_equals($thread->edit_token, $editToken)) {
                return response()->json(['error' => 'Not found'], 404);
            }
        } elseif ($request->user()?->id !== $thread->user_id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        if ($thread->status !== 'changes_requested') {
            return response()->json(['error' => 'Can only resubmit pieces with requested changes'], 422);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'participants' => 'nullable|array',
            'participants.*.id' => 'nullable|string|max:255',
            'participants.*.full_name' => 'nullable|string|max:255',
            'participants.*.location' => 'nullable|string|max:255',
            'participants.*.avatar_url' => 'nullable|string|max:2048',
            'messages' => 'required|array|min:1',
            'messages.*.sender' => 'required|string|max:255',
            'messages.*.message' => 'required|string',
            'messages.*.timestamp' => 'nullable|date',
        ]);

        $thread->resubmit([
            'name' => $validated['name'] ?? null,
            'participants' => $validated['participants'] ?? null,
            'messages' => collect($validated['messages'])->map(fn($m, $i) => [
                'sender' => $m['sender'],
                'message' => $m['message'],
                'timestamp' => $m['timestamp'] ?? now()->toISOString(),
                'position' => $i,
            ])->all(),
        ]);

        $email = $request->user()?->email ?? $thread->user->email;
        Mail::to($email)->queue(new ResubmissionReceivedMail($thread));

        return response()->json(['message' => 'Resubmission received']);
    }
}
