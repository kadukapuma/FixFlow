<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #{{ $service->ref_no ?? $service->id }}</title>
    <style>
        @page {
            margin: 30px 36px;
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
            border-bottom: 3px solid #14151a;
            padding-bottom: 12px;
            margin-bottom: 18px;
        }

        .header .brand {
            display: table-cell;
            vertical-align: middle;
            width: 60%;
        }

        .header .brand-inner {
            display: table;
        }

        .header .logo-cell {
            display: table-cell;
            vertical-align: middle;
            width: 56px;
        }

        .header .logo-cell img {
            max-width: 48px;
            max-height: 48px;
        }

        .header .name-cell {
            display: table-cell;
            vertical-align: middle;
            padding-left: 10px;
        }

        .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
            margin: 0 0 3px;
        }

        .company-contact {
            font-size: 9.5px;
            color: #6b7280;
            margin: 0;
            line-height: 1.5;
        }

        .header .doc-heading {
            display: table-cell;
            vertical-align: middle;
            text-align: right;
        }

        .doc-title-lg {
            font-size: 22px;
            font-weight: bold;
            letter-spacing: 0.06em;
            color: #14151a;
            margin: 0 0 6px;
        }

        .doc-meta {
            font-size: 10px;
            color: #4b5563;
            margin: 2px 0;
        }

        .doc-meta span {
            display: inline-block;
            min-width: 62px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-size: 8.5px;
        }

        table.info-grid {
            width: 100%;
            border-collapse: separate;
            border-spacing: 10px 0;
            margin: 0 -10px 16px;
        }

        .info-box {
            width: 50%;
            vertical-align: top;
            background: #f8f8f5;
            border: 1px solid #e6e4da;
            border-radius: 5px;
            padding: 10px 13px;
        }

        .info-box-title {
            font-size: 8.5px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #9b9a8f;
            font-weight: bold;
            margin: 0 0 6px;
        }

        .info-box-name {
            font-size: 13px;
            font-weight: bold;
            color: #111827;
            margin: 0 0 3px;
        }

        .info-box-line {
            font-size: 10.5px;
            color: #374151;
            margin: 3px 0;
        }

        .info-box-line .k {
            color: #6b7280;
            font-weight: 600;
        }

        .note-block {
            margin: 0 0 16px;
            font-size: 10.5px;
            line-height: 1.6;
        }

        .note-block strong {
            color: #111827;
        }

        table.works {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
        }

        table.works th {
            background: #14151a;
            color: #f4f3ec;
            border: 1px solid #14151a;
            padding: 8px 10px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            text-align: left;
        }

        table.works td {
            border: 1px solid #e6e4da;
            padding: 7px 10px;
            font-size: 11px;
            text-align: left;
        }

        table.works tbody tr:nth-child(even) td {
            background: #fbfaf6;
        }

        table.works td.amount, table.works th.amount {
            text-align: right;
            width: 110px;
        }

        table.works tfoot td {
            font-weight: bold;
            border-top: 2px solid #14151a;
            background: #f2f1ea;
        }

        .summary-wrap {
            display: table;
            width: 100%;
            margin: 8px 0 18px;
        }

        .summary-wrap .note {
            display: table-cell;
            vertical-align: bottom;
            font-size: 9.5px;
            color: #9b9a8f;
            font-style: italic;
        }

        .summary-wrap .summary-cell {
            display: table-cell;
            width: 250px;
            vertical-align: top;
        }

        table.summary {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e6e4da;
            border-radius: 5px;
            overflow: hidden;
        }

        table.summary td {
            padding: 7px 12px;
            font-size: 10.5px;
        }

        table.summary tr + tr td {
            border-top: 1px solid #e6e4da;
        }

        table.summary .summary-label {
            color: #6b7280;
        }

        table.summary .summary-amount {
            text-align: right;
            font-weight: 600;
            color: #111827;
        }

        table.summary tr.summary-total {
            background: #14151a;
        }

        table.summary tr.summary-total td {
            border-top: none;
            color: #ffffff;
            font-size: 14px;
            font-weight: bold;
            padding: 11px 12px;
        }

        table.summary tr.summary-total .summary-label {
            color: #ddfb5e;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-size: 9.5px;
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
            font-size: 11px;
            color: #374151;
        }

        .callout-row .phone-box {
            display: table-cell;
            width: 150px;
            vertical-align: middle;
            text-align: center;
        }

        .phone-box .box {
            border: 1px solid #14151a;
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
            color: #4b5563;
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
                    <p class="company-contact">
                        @if($company->address){{ $company->address }}@endif
                        @if($company->phone) &middot; Tel: {{ $company->phone }}@endif
                    </p>
                </div>
            </div>
        </div>
        <div class="doc-heading">
            <p class="doc-title-lg">INVOICE</p>
            <p class="doc-meta"><span>Invoice No.</span> {{ $service->ref_no ?: ('SV-' . str_pad((string) $service->id, 5, '0', STR_PAD_LEFT)) }}</p>
            <p class="doc-meta"><span>Date</span> {{ ($service->delivered_date ?? $service->service_date)?->format('d M Y') ?: '—' }}</p>
        </div>
    </div>

    <table class="info-grid">
        <tr>
            <td class="info-box">
                <p class="info-box-title">Billed To</p>
                <p class="info-box-name">{{ $service->customer->name }}</p>
                <p class="info-box-line">{{ $service->customer->phone ?: '—' }}</p>
            </td>
            <td class="info-box">
                <p class="info-box-title">Service Details</p>
                <p class="info-box-line"><span class="k">Item:</span> {{ $service->item->name }}@if($service->item->model) ({{ $service->item->model }})@endif</p>
                <p class="info-box-line"><span class="k">Serial No:</span> {{ $service->item->serial_number ?: '—' }}</p>
                <p class="info-box-line"><span class="k">Service Date:</span> {{ $service->service_date?->format('d M Y') ?: '—' }}</p>
                <p class="info-box-line"><span class="k">Delivered:</span> {{ $service->delivered_date?->format('d M Y') ?: '—' }}</p>
            </td>
        </tr>
    </table>

    <p class="note-block">
        <strong>Fault reported:</strong> {{ $service->fault ?: '—' }}<br>
        <strong>Items received:</strong> {{ $service->receivedItems->isNotEmpty() ? $service->receivedItems->pluck('item_name')->join(', ') : '—' }}
    </p>

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

    <table class="works" style="margin-top: 14px;">
        <thead>
            <tr>
                <th>Product</th>
                <th style="width: 60px; text-align: center;">Qty</th>
                <th class="amount">Unit Price</th>
                <th class="amount">Line Total</th>
            </tr>
        </thead>
        <tbody>
            @forelse($service->serviceProducts as $entry)
                <tr>
                    <td>{{ $entry->product->name ?? '—' }}</td>
                    <td style="text-align: center;">{{ $entry->quantity }}</td>
                    <td class="amount">{{ number_format((float) $entry->unit_price, 2) }}</td>
                    <td class="amount">{{ number_format($entry->line_total, 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="4">No products added.</td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3">Products total</td>
                <td class="amount">{{ number_format($productsTotal, 2) }}</td>
            </tr>
        </tfoot>
    </table>

    <div class="summary-wrap">
        <div class="note">
            @if((float) $service->price !== $combinedTotal)
                Final price adjusted from the logged work and product totals.
            @endif
        </div>
        <div class="summary-cell">
            <table class="summary">
                @if($paidTotal > 0)
                    <tr>
                        <td class="summary-label">Total price</td>
                        <td class="summary-amount">{{ number_format((float) $service->price, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="summary-label">Paid</td>
                        <td class="summary-amount">- {{ number_format($paidTotal, 2) }}</td>
                    </tr>
                    <tr class="summary-total">
                        <td class="summary-label">Balance due</td>
                        <td class="summary-amount">{{ number_format((float) $service->price - $paidTotal, 2) }}</td>
                    </tr>
                @else
                    <tr class="summary-total">
                        <td class="summary-label">Total amount due</td>
                        <td class="summary-amount">{{ number_format((float) $service->price, 2) }}</td>
                    </tr>
                @endif
            </table>
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
