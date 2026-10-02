@extends('emails.layout')

@section('title', 'Your registration was not approved')

@section('content')
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
        Hi {{ $company->owner_name }},
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
        Unfortunately, the registration for <strong>{{ $company->name }}</strong> has not been approved.
    </p>
    @if ($company->rejection_reason)
        <p style="margin:0 0 8px;font-size:13px;font-weight:bold;">Reason</p>
        <p style="margin:0 0 16px;padding:12px;background:#f9fafb;border-left:3px solid #ef4444;font-size:14px;line-height:1.5;white-space:pre-line;">{{ $company->rejection_reason }}</p>
    @endif
    <p style="margin:0;font-size:13px;color:#6b7280;">
        If you have questions, just reply to this email.
    </p>
@endsection
