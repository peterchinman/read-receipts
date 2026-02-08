<?php

namespace App\Http\Controllers;

use App\Mail\SubmissionAcceptedMail;
use App\Mail\SubmissionChangesRequestedMail;
use App\Mail\SubmissionRejectedMail;
use App\Models\Thread;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;

class AdminController extends Controller
{
    public function submissions(Request $request)
    {
        $status = $request->query('status');

        if ($status) {
            $statuses = [$status];
        } else {
            $statuses = ['submitted', 'accepted'];
        }

        $threads = Thread::whereIn('status', $statuses)
            ->with(['user:id,name,display_name,email', 'submissionEvents'])
            ->orderBy('submitted_at', 'asc')
            ->paginate(20);

        $data = $threads->map(fn($thread) => $this->formatSubmission($thread));

        // Sort resubmissions to the top
        $data = $data->sortByDesc(fn($item) => $item['is_resubmission'] ? 1 : 0)->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $threads->currentPage(),
                'last_page' => $threads->lastPage(),
                'per_page' => $threads->perPage(),
                'total' => $threads->total(),
            ],
        ]);
    }

    public function showSubmission(Thread $thread)
    {
        if (!in_array($thread->status, ['submitted', 'accepted', 'changes_requested', 'published'])) {
            return response()->json(['error' => 'Submission not found'], 404);
        }

        $thread->load(['user:id,name,display_name,email', 'submissionEvents.admin']);

        return response()->json($this->formatSubmission($thread));
    }

    public function accept(Request $request, Thread $thread)
    {
        if ($thread->status !== 'submitted') {
            return response()->json(['error' => 'Can only accept submitted pieces'], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $thread->accept(Auth::user(), $validated['notes'] ?? null);

        Mail::to($thread->user->email)->send(new SubmissionAcceptedMail($thread));

        return response()->json(['message' => 'Submission accepted']);
    }

    public function reject(Request $request, Thread $thread)
    {
        if ($thread->status !== 'submitted') {
            return response()->json(['error' => 'Can only reject submitted pieces'], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $thread->reject(Auth::user(), $validated['notes'] ?? null);

        Mail::to($thread->user->email)->send(new SubmissionRejectedMail($thread, $validated['notes'] ?? null));

        return response()->json(['message' => 'Submission rejected']);
    }

    public function requestChanges(Request $request, Thread $thread)
    {
        if ($thread->status !== 'submitted') {
            return response()->json(['error' => 'Can only request changes on submitted pieces'], 422);
        }

        $validated = $request->validate([
            'notes' => 'required|string',
        ]);

        $thread->requestChanges(Auth::user(), $validated['notes']);

        Mail::to($thread->user->email)->send(new SubmissionChangesRequestedMail($thread, $validated['notes']));

        return response()->json(['message' => 'Changes requested']);
    }

    public function publish(Request $request, Thread $thread)
    {
        if ($thread->status !== 'accepted') {
            return response()->json(['error' => 'Can only publish accepted submissions'], 422);
        }

        $thread->publish(Auth::user());

        return response()->json(['message' => 'Piece published']);
    }

    public function markPaid(Thread $thread)
    {
        if ($thread->status !== 'accepted') {
            return response()->json(['error' => 'Can only mark accepted submissions as paid'], 422);
        }

        $thread->submissionEvents()->create([
            'event_type' => 'paid',
            'admin_id' => Auth::id(),
        ]);

        return response()->json(['message' => 'Marked as paid']);
    }

    public function destroy(Thread $thread)
    {
        $thread->submissionEvents()->delete();
        $thread->delete();

        return response()->json(['message' => 'Piece deleted']);
    }

    protected function formatSubmission(Thread $thread): array
    {
        return [
            'id' => $thread->id,
            'name' => $thread->name,
            'recipient_name' => $thread->recipient_name,
            'recipient_location' => $thread->recipient_location,
            'status' => $thread->status,
            'submitted_at' => $thread->submitted_at?->toISOString(),
            'is_resubmission' => $thread->submissionEvents->contains('event_type', 'resubmitted'),
            'author' => [
                'id' => $thread->user->id,
                'name' => $thread->user->display_name ?? $thread->user->name,
                'email' => $thread->user->email,
            ],
            'messages' => collect($thread->messages)->map(fn($msg) => [
                'sender' => $msg['sender'],
                'message' => $msg['message'],
                'timestamp' => $msg['timestamp'] ?? null,
            ]),
            'events' => $thread->submissionEvents?->map(fn($event) => [
                'type' => $event->event_type,
                'admin' => $event->admin?->name,
                'notes' => $event->notes,
                'snapshot' => $event->snapshot,
                'created_at' => $event->created_at->toISOString(),
            ]) ?? [],
        ];
    }
}
