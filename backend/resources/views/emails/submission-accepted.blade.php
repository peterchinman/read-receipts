<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your submission has been accepted!</title>
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
            background-color: #34C759;
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
    <h1>Congratulations!</h1>

    <p>Your submission "<strong>{{ $threadName }}</strong>" has been accepted for publication!</p>

    <p>Your piece will be published on our site shortly. We'll send you another email once it's live.</p>

    <a href="{{ $viewUrl }}" class="button">View Your Piece</a>

    <div class="footer">
        <p>Thank you for sharing your work with us.</p>
        <p>— The {{ $appName }} Team</p>
    </div>
</body>
</html>
