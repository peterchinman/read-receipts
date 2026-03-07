<?php

namespace App\Mail;

use App\Models\Thread;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResubmissionReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Thread $thread
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'We\'ve received your resubmission',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.resubmission-received',
            with: [
                'threadName' => $this->thread->displayName(),
            ],
        );
    }
}
