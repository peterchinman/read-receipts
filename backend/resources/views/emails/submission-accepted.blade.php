<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your submission has been accepted!</title>
</head>
<body>
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.4; color: #000; max-width: 600px; margin: 0 auto;">
        <h2>Congratulations!</h2>

        <p>Your submission "<strong>{{ $threadName }}</strong>" has been accepted for publication!</p>

        <p>Your piece will be published on our site shortly. We'll send you another email once it's live.</p>

        <a href="{{ $viewUrl }}" style="display: inline-block; background-color: #0d84ff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 10px 0;">View Your Piece</a>

        <div style="font-size: 14px; color: #333;">
            <p>Thank you for sharing your work with us.</p>
        </div>
    </div>
</body>
</html>
