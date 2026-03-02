<?php

namespace App\Mail;

use App\Models\Thread;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubmissionReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Thread $thread
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'We\'ve received your submission',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.submission-received',
            with: [
                'threadName' => $this->thread->displayName(),
                'appName' => config('app.name'),
            ],
        );
    }
}
