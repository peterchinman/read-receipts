<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Update on your submission</title>
</head>
<body>
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.4; color: #000; max-width: 600px; margin: 0 auto;">
        <h2>Update on your submission</h2>

        <p>Thank you for submitting "<strong>{{ $threadName }}</strong>" to {{ $appName }}.</p>

        <p>After careful consideration, we've decided not to publish this piece at this time.</p>

        @if($notes)
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 10px 0;">
            <strong>Editor's notes:</strong>
            <p>{{ $notes }}</p>
        </div>
        @endif

        <p>We encourage you to continue writing and to submit again in the future.</p>

        <a href="{{ $createUrl }}" style="display: inline-block; background-color: #0d84ff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 10px 0;">Create New Piece</a>

        <div style="font-size: 14px; color: #333;">
            <p>Thank you for sharing your work with us.</p>
            <p>— The {{ $appName }} Team</p>
        </div>
    </div>
</body>
</html>
