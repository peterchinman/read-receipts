<?php

namespace App\Mail;

use App\Models\Thread;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubmissionChangesRequestedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Thread $thread,
        public string $notes
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Changes requested for your submission',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.submission-changes-requested',
            with: [
                'threadName' => $this->thread->name ?? 'Untitled',
                'notes' => $this->notes,
                'editUrl' => config('app.frontend_url') . '/create?edit=' . $this->thread->id,
                'appName' => config('app.name'),
            ],
        );
    }
}
