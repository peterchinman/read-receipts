# Message Simulator

## Project Goals

The medium is the message.

The goal of this project is not accuracy. I value accuracy in so far as it allows us to harness the uncanniness of familiarity.

But, for example, my goal is not for you to be able to take screenshots that can trick people.

Or, for example, I do not intend to implement a Liquid-Glass-ified version of the UI (though if someone does want to take that on and create multiple UI "skins" (Different iOS versions, WhatsApp, etc) submit a PR.)

## Development

### First-Time Setup

```bash
npm run setup
```

This installs dependencies, creates the `.env` file, generates an app key, creates the SQLite database, and runs migrations with seed data.

### Running Locally

```bash
npm run dev
```

This starts both the frontend (`http://localhost:3000`) and the backend API (`http://localhost:8000`) together.

**Troubleshooting:** If you change any config files (in `backend/config/`) and the changes don't take effect:

```bash
cd backend && php artisan config:clear
```

### Email in Development

Emails are logged instead of sent. View them with:

```bash
tail -f backend/storage/logs/laravel.log
```

When you request a magic link, the verification URL will appear in this log.

#### Previewing Email Templates

While the backend is running, you can preview each email template in the browser at:

- `http://localhost:8000/preview/mail/magic-link`
- `http://localhost:8000/preview/mail/submission-accepted`
- `http://localhost:8000/preview/mail/submission-changes-requested`
- `http://localhost:8000/preview/mail/submission-rejected`

These routes render each template with fake data and are defined in `backend/routes/web.php`.

### Database

SQLite database is at `backend/database/database.sqlite`.

```bash
# Reset database and seed with test data
npm run db:seed
```

This creates test users, and sample threads in every status (submitted, accepted, changes_requested, rejected, published). The seeded admin account is `admin@example.com`.

```bash
# Reset database without test data
cd backend && php artisan migrate:fresh

# Grant admin access to an existing user
cd backend && php artisan tinker
>>> User::where('email', 'your@email.com')->update(['is_admin' => true]);
```

### Formatting and Tests

```bash
npm install

npm test

# write formatting changes
npm run format

# check formatting (CI-style)
npm run format:check
```



