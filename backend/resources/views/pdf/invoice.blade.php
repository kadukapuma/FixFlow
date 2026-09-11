<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #{{ $service->ref_no ?? $service->id }}</title>
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

        hr.rule {
            border: none;
            border-top: 1px solid #d1d5db;
            margin: 10px 0;
        }

        .fault-line {
            margin: 0 0 14px;
        }

        table.works {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
        }

        table.works th, table.works td {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            font-size: 11px;
            text-align: left;
        }

        table.works th {
            background: #f3f4f6;
        }

        table.works td.amount, table.works th.amount {
            text-align: right;
            width: 100px;
        }

        table.works tfoot td {
            font-weight: bold;
        }

        .total-row {
            display: table;
            width: 100%;
            margin: 18px 0 14px;
        }

        .total-row .note {
            display: table-cell;
            vertical-align: middle;
            font-size: 10px;
            color: #6b7280;
        }

        .total-row .total-box {
            display: table-cell;
            width: 220px;
            vertical-align: middle;
            text-align: right;
        }

        .total-box .box {
            display: inline-block;
            border: 1px solid #1f2937;
            border-radius: 4px;
            padding: 10px 14px;
            text-align: right;
        }

        .total-box .box-label {
            font-size: 9px;
            color: #6b7280;
            margin: 0 0 3px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .total-box .box-amount {
            font-size: 18px;
            font-weight: bold;
        }

        .callout-row {
            display: table;
            width: 100%;
            margin: 14px 0;
        }

        .callout-row .fields {
            display: table-cell;
            vertical-align: middle;
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

    <h1 class="doc-title">Service Invoice</h1>

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
            <td><span class="label">Service Date:</span> <span class="value">{{ $service->service_date?->format('d M Y') }}</span></td>
            <td><span class="label">Contact No:</span> <span class="value">{{ $service->customer->phone ?: '—' }}</span></td>
        </tr>
        <tr>
            <td><span class="label">Delivered Date:</span> <span class="value">{{ $service->delivered_date?->format('d M Y') ?: '—' }}</span></td>
            <td><span class="label">Serial No:</span> <span class="value">{{ $service->item->serial_number ?: '—' }}</span></td>
        </tr>
    </table>

    <hr class="rule">

    <p class="fault-line"><strong>Fault reported:</strong> {{ $service->fault ?: '—' }}</p>

    <table class="works">
        <thead>
            <tr>
                <th>Work performed</th>
                <th class="amount">Cost</th>
            </tr>
        </thead>
        <tbody>
            @forelse($service->work as $entry)
                <tr>
                    <td>{{ $entry->description ?: '—' }}</td>
                    <td class="amount">{{ number_format((float) $entry->cost, 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="2">No work items logged.</td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr>
                <td>Work total</td>
                <td class="amount">{{ number_format($workTotal, 2) }}</td>
            </tr>
        </tfoot>
    </table>

    <div class="total-row">
        <div class="note">
            @if((float) $service->price !== $workTotal)
                Final price adjusted from the logged work total.
            @endif
        </div>
        <div class="total-box">
            <div class="box">
                <p class="box-label">Total amount due</p>
                <p class="box-amount">{{ number_format((float) $service->price, 2) }}</p>
            </div>
        </div>
    </div>

    <div class="callout-row">
        <div class="fields">
            <p>Thank you for choosing {{ $company->name }}.</p>
        </div>

        @if($company->phone)
            <div class="phone-box">
                <p class="box-label">For inquiries, call</p>
                <div class="box">{{ $company->phone }}</div>
            </div>
        @endif
    </div>

    <p class="consent">
        I hereby confirm that I have received the item described above in working condition, and that the amount
        stated has been paid in full.
    </p>

    <div class="signatures">
        <div class="sig">Handed over by&nbsp;<span class="sig-line">&nbsp;</span></div>
        <div class="sig">Customer signature&nbsp;<span class="sig-line">&nbsp;</span></div>
    </div>
</body>
</html>
