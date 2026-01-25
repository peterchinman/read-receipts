<?php

namespace App\Mail;

use App\Models\Thread;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubmissionAcceptedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Thread $thread
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your submission has been accepted!',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.submission-accepted',
            with: [
                'threadName' => $this->thread->name ?? 'Untitled',
                'viewUrl' => config('app.frontend_url') . '/piece/' . $this->thread->id,
                'appName' => config('app.name'),
            ],
        );
    }
}
