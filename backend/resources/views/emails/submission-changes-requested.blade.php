<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Changes requested for your submission</title>
</head>
<body>
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.4; color: #000; max-width: 600px;">
        <h2>Changes requested</h2>

        <p>Thank you for submitting "<strong>{{ $threadName }}</strong>" to {{ $appName }}.</p>

        <p>I am interested in publishing your piece, but I have a few changes I'd like to see first.</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 10px 0;">
            <strong>Editor's notes:</strong>
            <p>{{ $notes }}</p>
        </div>

        <p>Please review the notes above and edit your piece. Once you're happy with the changes, resubmit it for review.</p>

        <p>Click the link below to edit your piece.</p>

        <a href="{{ $editUrl }}" style="display: inline-block; background-color: #0d84ff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 10px 0;">Edit Your Piece</a>

        <p>Or copy and paste this link into a browser:</p>
        <p style="word-break: break-all;">{!! $editUrl !!}</p>
    </div>
</body>
</html>
