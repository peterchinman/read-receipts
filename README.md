# Message Simulator

## Project Goals

The goal of this project is not necessarily accuracy. I value accuracy in so far as it allows us to harness the uncanniness of familiarity.

For example, I do not intend to implement a Liquid-Glass-ified version of the UI (though if someone does want to take that on and create multiple UI "skins" I would welcome that.)

## Features I'd Like To Implement

- [ ] Support for photos
- [ ] Saving/loading "drafts" in local storage

## Development

### Running Locally

**Backend (Laravel):**

```bash
cd backend
php artisan serve
```

This starts the Laravel API server at `http://localhost:8000`.

**Troubleshooting:** If you change any config files (in `backend/config/`) and the changes don't take effect, clear Laravel's config cache:

```bash
cd backend && php artisan config:clear
```

Then restart `php artisan serve`.

**Frontend:**

```bash
npm run dev
```

Then visit `http://localhost:3000` in your browser.

### Email in Development

Emails are logged instead of sent. View them with:

```bash
tail -f backend/storage/logs/laravel.log
```

When you request a magic link, the verification URL will appear in this log.

### Database

SQLite database is at `backend/database/database.sqlite`.

```bash
# Reset database
cd backend && php artisan migrate:fresh

# Create an admin user (after logging in once)
cd backend && php artisan tinker
>>> $user = App\Models\User::first();
>>> $user->is_admin = true;
>>> $user->save();
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



