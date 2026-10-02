<?php

namespace App\Mail;

use App\Models\Company;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class CompanyRejectedMail extends Mailable
{
    public function __construct(public Company $company)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Update on your {$this->company->name} registration",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.company-rejected');
    }
}
