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

## Further Developments

We need a backend.

Currently this app is entirely client side. Which I love! We love local first, local-storage based apps.

My vision for this site is that this will be an online literary journal for pieces which take place entirely inside of an iMessage frame.

The current site, as it exists now, will be one part of that. Let's say the site is called `magazine.com`. (I'm not sure yet what it should be called.) This would be `magazine.com/create`.

The landing page of `magazine.com` should be be so simple. It is just a list——in the style of thread-list.js——of published pieces. Clicking on a piece opens a thread-preview.js of that piece, with a back button to get back to the list.

At desktop widths there should be a subtle header bar that contains a "create" button, that take users to the `/create` page, i.e. the site as it currently exits. This will be pretty much what it is now, EXCEPT that I also need to add a "Submit" button.

Users should be able to log-in. We'll need auth for this. The only thing that logging-in does is: 1) allow them to submit and 2) allow them to store their stories on the server instead of in localStorage.

We'll need an admin page, accessed by me logging in, where I can review people's submissions and accept or reject them. Accepting and rejecting triggers an email to be sent to the user, either asking for further details so that I can pay them for their submission, or graciously thanking them for the submission.

I don't have a strong opinion about what language the back-end should be written in.

I have written backends in Python and in PHP before. At work, we use Rust, which I am interested in learning, but doesn't seem like an obvious choice for this project. 

## Todo 

- [ ] make sure Models are correct, esp'ly Threads.
- [ ] I want to be able to upload new threads from Admin. Not just approve submitted Threads.
- [ ] in addition to accept/reject, should there also be request for edits?
- [ ] Ability to preview threads from admin?



