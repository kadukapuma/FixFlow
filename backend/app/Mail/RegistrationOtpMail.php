<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class RegistrationOtpMail extends Mailable
{
    public function __construct(
        public string $code,
        public string $companyName,
        public int $expiresInMinutes,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your ' . config('mail.from.name') . ' verification code',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.registration-otp');
    }
}
