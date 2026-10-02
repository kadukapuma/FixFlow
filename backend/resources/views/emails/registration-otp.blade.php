@extends('emails.layout')

@section('title', 'Verify your email')

@section('content')
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
        Use the code below to finish registering <strong>{{ $companyName }}</strong>
        on {{ config('mail.from.name') }}.
    </p>
    <p style="margin:0 0 16px;font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;">
        {{ $code }}
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
        This code expires in {{ $expiresInMinutes }} minutes.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
        If you didn't request this, you can ignore this email.
    </p>
@endsection
