<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Update on your submission</title>
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
        .notes {
            background-color: #f5f5f5;
            padding: 15px;
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
    <h1>Update on your submission</h1>

    <p>Thank you for submitting "<strong>{{ $threadName }}</strong>" to {{ $appName }}.</p>

    <p>After careful consideration, we've decided not to publish this piece at this time.</p>

    @if($notes)
    <div class="notes">
        <strong>Editor's notes:</strong>
        <p>{{ $notes }}</p>
    </div>
    @endif

    <p>We encourage you to continue writing and to submit again in the future.</p>

    <a href="{{ $createUrl }}" class="button">Create New Piece</a>

    <div class="footer">
        <p>Thank you for sharing your work with us.</p>
        <p>— The {{ $appName }} Team</p>
    </div>
</body>
</html>
