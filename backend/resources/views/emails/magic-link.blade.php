<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Thank you for submitting to {{ $appName }}</title>
</head>
<body>
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.4; color: #000; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for submitting to {{ $appName }}.</h2>
        
        <p>Click the button below to complete your submission.</p>

        <a href="{{ $url }}" style="display: inline-block; background-color: #0d84ff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 10px 0;">Submit</a>

        <p>Or copy and paste this link into a browser:</p>
        <p style="word-break: break-all;">{{ $url }}</p>

        <p><strong>IMPORTANT NOTE:</strong> your drafts are only ever stored locally, in your browser. So, you'll need to open this link in the same browser you used to compose the draft.</p>

        <div style="font-size: 14px; color: #333;">
            <p>This link will expire {{ $expiresAt }}.</p>
            <p>If you didn't request this email, you can safely ignore it.</p>
        </div>
    </div>
</body>
</html>
