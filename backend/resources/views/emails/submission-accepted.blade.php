<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Your submission has been accepted!</title>
</head>
<body>
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.4; color: #000; max-width: 600px;">
        <h2>Congratulations!</h2>

        <p>Your submission "<strong>{{ $threadName }}</strong>" has been accepted for publication!</p>

        <p>I need a few more details before we can publish.</p>
       
        <p>Click the button below to provide your payment details and any author info that you would like displayed with the piece.</p>

        <a href="{{ $authorInfoUrl }}" style="display: inline-block; background-color: #0d84ff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 10px 0;">Provide Author Info</a>

        <p>Or copy and paste this link into a browser:</p>
        <p style="word-break: break-all;">{!! $authorInfoUrl !!}</p>

        <p>After I process the payment, your piece will be published on the site shortly. I'll send you another email once it's live.</p>

        <div style="font-size: 14px; color: #333;">
            <p>Thank you for sharing your work with us.</p>
        </div>
    </div>
</body>
</html>
