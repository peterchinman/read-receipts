<?php

namespace App\Mail;

use App\Models\AuthToken;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminMagicLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public AuthToken $authToken
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Sign in to ' . config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.admin-magic-link',
            with: [
                'url' => config('app.frontend_url') . '/auth/verify/' . $this->authToken->token,
                'expiresAt' => $this->authToken->expires_at->diffForHumans(),
                'appName' => config('app.name'),
            ],
        );
    }
}
