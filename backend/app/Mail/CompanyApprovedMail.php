<?php

namespace App\Mail;

use App\Models\Company;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class CompanyApprovedMail extends Mailable
{
    public function __construct(public Company $company)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->company->name} has been approved",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.company-approved',
            with: ['loginUrl' => $this->loginUrl()],
        );
    }

    /**
     * "https://fixflow.kreethya.com" + "acme" -> "https://acme.fixflow.kreethya.com/"
     */
    private function loginUrl(): string
    {
        $base = parse_url(config('app.frontend_url'));
        $port = isset($base['port']) ? ":{$base['port']}" : '';

        return "{$base['scheme']}://{$this->company->subdomain}.{$base['host']}{$port}/";
    }
}
