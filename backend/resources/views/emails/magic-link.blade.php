<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sign in to {{ $appName }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .button {
            display: inline-block;
            background-color: #007AFF;
            color: white !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>Sign in to {{ $appName }}</h1>

    <p>Click the button below to sign in to your account:</p>

    <a href="{{ $url }}" class="button">Sign In</a>

    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all;">{{ $url }}</p>

    <div class="footer">
        <p>This link will expire {{ $expiresAt }}.</p>
        <p>If you didn't request this email, you can safely ignore it.</p>
    </div>
</body>
</html>
