@extends('emails.layout')

@section('title', 'Your company has been approved')

@section('content')
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
        Hi {{ $company->owner_name }},
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
        Good news! <strong>{{ $company->name }}</strong> has been approved and your workspace is ready.
        Sign in with the email and password you used when registering.
    </p>
    <p style="margin:0 0 24px;text-align:center;">
        <a href="{{ $loginUrl }}"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">
            Sign in to {{ $company->name }}
        </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
        Your workspace address: <a href="{{ $loginUrl }}" style="color:#2563eb;">{{ $loginUrl }}</a>
    </p>
    @if ($company->subscription_price !== null)
        <p style="margin:0;font-size:13px;color:#6b7280;">
            Subscription: {{ number_format((float) $company->subscription_price, 2) }} per month
            @if ($company->active_until)
                &middot; first period ends {{ $company->active_until->format('d M Y') }}
            @endif
        </p>
    @endif
@endsection
