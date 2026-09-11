<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Service Note #{{ $service->ref_no ?? $service->id }}</title>
    <style>
        @page {
            margin: 28px 34px;
        }

        body {
            font-family: "DejaVu Sans", sans-serif;
            font-size: 11.5px;
            color: #1f2937;
            margin: 0;
        }

        .header {
            display: table;
            width: 100%;
            border-bottom: 2px solid #1f2937;
            padding-bottom: 10px;
            margin-bottom: 14px;
        }

        .header .brand {
            display: table-cell;
            vertical-align: middle;
        }

        .header .brand-inner {
            display: table;
        }

        .header .logo-cell {
            display: table-cell;
            vertical-align: middle;
            width: 60px;
        }

        .header .logo-cell img {
            max-width: 52px;
            max-height: 52px;
        }

        .header .name-cell {
            display: table-cell;
            vertical-align: middle;
            padding-left: 10px;
        }

        .company-name {
            font-size: 19px;
            font-weight: bold;
            color: #111827;
            margin: 0;
        }

        .header .contact {
            display: table-cell;
            vertical-align: middle;
            text-align: right;
            font-size: 10px;
            color: #4b5563;
            line-height: 1.5;
        }

        h1.doc-title {
            font-size: 14px;
            text-decoration: underline;
            margin: 0 0 14px;
        }

        table.info {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        table.info td {
            vertical-align: top;
            width: 50%;
            padding: 4px 0;
            font-size: 11.5px;
        }

        table.info .label {
            font-weight: bold;
        }

        table.info .value {
            margin-left: 4px;
        }

        .callout-row {
            display: table;
            width: 100%;
            margin: 10px 0 14px;
        }

        .callout-row .fields {
            display: table-cell;
            vertical-align: top;
        }

        .callout-row .fields p {
            margin: 3px 0;
        }

        .callout-row .phone-box {
            display: table-cell;
            width: 150px;
            vertical-align: middle;
            text-align: center;
        }

        .phone-box .box {
            border: 1px solid #1f2937;
            border-radius: 4px;
            padding: 10px 8px;
            font-size: 15px;
            font-weight: bold;
        }

        .phone-box .box-label {
            font-size: 9px;
            color: #6b7280;
            margin: 0 0 3px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        hr.rule {
            border: none;
            border-top: 1px solid #d1d5db;
            margin: 10px 0;
        }

        .terms h3 {
            font-size: 12px;
            font-weight: bold;
            text-decoration: underline;
            margin: 0 0 8px;
            text-align: center;
        }

        .terms ol {
            margin: 0;
            padding-left: 16px;
        }

        .terms li {
            font-size: 9px;
            color: #374151;
            line-height: 1.45;
            margin-bottom: 3px;
        }

        .consent {
            margin-top: 16px;
            font-size: 10.5px;
            line-height: 1.5;
        }

        .signatures {
            display: table;
            width: 100%;
            margin-top: 34px;
        }

        .signatures .sig {
            display: table-cell;
            width: 50%;
            font-size: 11px;
        }

        .signatures .sig-line {
            display: inline-block;
            border-bottom: 1px solid #1f2937;
            width: 180px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">
            <div class="brand-inner">
                @if($logoData)
                    <div class="logo-cell">
                        <img src="{{ $logoData }}" alt="Logo">
                    </div>
                @endif
                <div class="name-cell">
                    <p class="company-name">{{ $company->name }}</p>
                </div>
            </div>
        </div>
        <div class="contact">
            @if($company->address){{ $company->address }}<br>@endif
            @if($company->phone)Tel: {{ $company->phone }}@endif
        </div>
    </div>

    <h1 class="doc-title">Service Note</h1>

    <table class="info">
        <tr>
            <td><span class="label">Service ID:</span> <span class="value">{{ $service->id }}</span></td>
            <td>
                <span class="label">Item:</span>
                <span class="value">{{ $service->item->name }}@if($service->item->model) ({{ $service->item->model }})@endif</span>
            </td>
        </tr>
        <tr>
            <td><span class="label">Reference No:</span> <span class="value">{{ $service->ref_no ?: '—' }}</span></td>
            <td><span class="label">Customer Name:</span> <span class="value">{{ $service->customer->name }}</span></td>
        </tr>
        <tr>
            <td><span class="label">Serial No:</span> <span class="value">{{ $service->item->serial_number ?: '—' }}</span></td>
            <td><span class="label">Contact No:</span> <span class="value">{{ $service->customer->phone ?: '—' }}</span></td>
        </tr>
        <tr>
            <td><span class="label">Date:</span> <span class="value">{{ $service->service_date?->format('d M Y') }}</span></td>
            <td>
                <span class="label">Price:</span>
                <span class="value">{{ $service->price !== null ? number_format((float) $service->price, 2) : '—' }}</span>
            </td>
        </tr>
    </table>

    <hr class="rule">

    <div class="callout-row">
        <div class="fields">
            <p><strong>Fault:</strong> {{ $service->fault ?: '—' }}</p>
            <p><strong>Technician:</strong> {{ $service->employee->name ?? '—' }}</p>
            @if($service->note)
                <p><strong>Note:</strong> {{ $service->note }}</p>
            @endif
        </div>

        @if($company->phone)
            <div class="phone-box">
                <p class="box-label">For inquiries, call</p>
                <div class="box">{{ $company->phone }}</div>
            </div>
        @endif
    </div>

    @if($termsLines->isNotEmpty())
        <div class="terms">
            <h3>Terms &amp; Conditions</h3>
            <ol>
                @foreach($termsLines as $line)
                    <li>{{ $line }}</li>
                @endforeach
            </ol>
        </div>
    @endif

    <p class="consent">
        I hereby verify and confirm all information &amp; product stated above is correct, and agree that
        {{ $company->name }} may take in this product for diagnostic and repair under the terms above.
    </p>

    <div class="signatures">
        <div class="sig">Authorize officer&nbsp;<span class="sig-line">&nbsp;</span></div>
        <div class="sig">Customer signature&nbsp;<span class="sig-line">&nbsp;</span></div>
    </div>
</body>
</html>
