<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sign in to {{ $appName }}</title>
</head>
<body>
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.4; color: #000; max-width: 600px;">
        <h2>Sign in to {{ $appName }}</h2>

        <p>Click the button below to sign in.</p>

        <a href="{{ $url }}" style="display: inline-block; background-color: #0d84ff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 10px 0;">Sign in</a>

        <p>Or copy and paste this link into a browser:</p>
        <p style="word-break: break-all;">{!! $url !!}</p>

        <div style="font-size: 14px; color: #333;">
            <p>This link will expire {{ $expiresAt }}.</p>
            <p>If you didn't request this email, you can safely ignore it.</p>
        </div>
    </div>
</body>
</html>
