## Todo

### BEFORE RELEASE

- [ ] Improve Submission flow Dialogs
  - [ ] More informative, make it clear what the steps are
- [ ] Submission email styling
- [ ] Think thru where submit button lives
- [ ] Think thru how being "logged in" works with no top bar
- [ ] Think thru what info we'll want to collect and display for each Author?
  - [ ] where does this live in the database?
  - [ ] when do I collect it? On piece approval?
- [ ] Fully test admin approval flows.
- [ ] Figure out how I want to handle date/time for message schema / thread editor.
  - [ ] Menu where uses pick "Time since last message"?
    - [ ] With options: 5 minute, 1 hr, 24. Corresponding to short margin, big margin, day break
- [ ] Display date in Preview, new "system message" class type
  - [ ] Should we allow Users to write to this type as "Stage Directions"??

### DEPOLOYMENT TASKS

- [ ] Digital Ocean Droplet: new one, or use my existing?
- [ ] Apache or Nginx?
- [ ] how to set up .env
- [ ] how to store who is admin, how to add new admins?
- [ ] set up resend.com for email (generous free tier)

### TODO AFTER RELEASE:

- [ ] Set up info page for each piece author
- [ ] I want to be able to upload new threads from Admin. Not just approve submitted Threads.
  - [ ] Also edit existing thrads.
- [ ] User avatars are wrong in thread-list?

### Future Features:

- [ ] Group Chats
- [ ] Emoji Reactions
- [ ] Green Bubble
- [ ] Photos
  - [ ] But do I want to host photos?
- [ ] "Animate" messages arriving.
- [ ] Set preview input box placeholder text
- [ ] Device top row: time, signal, wifi, battery
- [ ] Message Statuses: delivered, not delivered, read