<?php

namespace App\Mail;

use App\Models\Thread;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubmissionRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Thread $thread,
        public ?string $notes = null
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Update on your submission',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.submission-rejected',
            with: [
                'threadName' => $this->thread->name ?? 'Untitled',
                'notes' => $this->notes,
                'createUrl' => config('app.frontend_url') . '/create',
                'appName' => config('app.name'),
            ],
        );
    }
}
