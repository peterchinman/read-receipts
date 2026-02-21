# Message Simulator

## Project Goals

The goal of this project is not necessarily accuracy. I value accuracy in so far as it allows us to harness the uncanniness of familiarity.

For example, I do not intend to implement a Liquid-Glass-ified version of the UI (though if someone does want to take that on and create multiple UI "skins" I would welcome that.)

## Features I'd Like To Implement

- [ ] Support for photos
- [ ] Saving/loading "drafts" in local storage

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



