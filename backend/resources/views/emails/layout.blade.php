<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>@yield('title')</title>
</head>
<body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px;">
                    <tr>
                        <td>
                            <h2 style="margin:0 0 16px;font-size:20px;">@yield('title')</h2>
                            @yield('content')
                        </td>
                    </tr>
                </table>
                <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">{{ config('mail.from.name') }}</p>
            </td>
        </tr>
    </table>
</body>
</html>
