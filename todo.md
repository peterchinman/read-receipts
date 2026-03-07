## Todo

### BEFORE RELEASE

- [ ] we should have an email template for resubmissions.
- [ ] If user already has a bio from a previous piece, we should prepopulate author info form with that
- [ ] Fully test admin approval flows.
  - [ ] make sure Submission magic link only works once
  - [ ] Does Changes Request link expire? It shouldn't. BUT! it also shouldn't work if there is a newer Changes Requested for the "same" piece. How is this tracked.
  - [ ] Does Changes Requested link work multiple times? It should.
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
- [ ] Profile Pics for Recipients
- [ ] Emoji Reactions
- [ ] Green Bubble
- [ ] Photos
  - [ ] But do I want to host photos?
- [ ] "Animate" messages arriving.
- [ ] Set preview input box placeholder text
- [ ] Device top row: time, signal, wifi, battery
- [ ] Message Statuses: delivered, not delivered, read