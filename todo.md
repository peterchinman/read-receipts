## Todo

### BEFORE RELEASE

When admin accepts a user's submission we need to collect a few additional details from them. Specfically we need:

1. Their preferred payment platform (e.g. venmo, cashapp, paypal)
2. Their username on payment platform
3. Their Name, optional
4. A link they want to include (e.g. social media, or website), optional
5. Their Author Bio, optional
6. Any comments they have about the piece, optional.

We should send a link to complete this form in the submission-accepted email. Clicking the link should work similar to the magic link in the Changes Req'd email, that is, it downloads the accepted piece, but instead, of the message-cards for editing a piece, it has a form for the user to fill out.

In the admin panel, in the Approved Tab, we should add a flag on the Approved threads indicating whether we have received this info. If we have received it, it should be displayed in the admin-action-content pane.

For published pieces, in the piece-reader header, the icon on the right should not be a compose icon, but instead an info icon. Clicking this info Icon should open up a special drawer/dialog that shows these additional details from the author. If the user did not provide a name we list them as "Anonymous". 

- [ ] Improve Submission flow Dialogs
  - [ ] More informative, make it clear what the steps are
- [ ] Submission email styling
- [ ] we should have an email template for resubmissions.
- [ ] Think thru where submit button lives
- [ ] Think thru how being "logged in" works with no top bar
- [ ] Think thru what info we'll want to collect and display for each Author?
  - [ ] where does this live in the database?
  - [ ] when do I collect it? On piece approval?
- [ ] Fully test admin approval flows.
  - [ ] make sure Submission magic link only works once
  - [ ] test Submission Received email 
  - [ ] Does Changes Request link expire? It shouldn't. BUT! it also shouldn't work if there is a newer Changes Requested for the "same" piece. How is this tracked.
  - [ ] Does Changes Requested link work multiple times? It should.
  - [ ] When user is "logged in" and submits a new piece, we should ask them to confirm the email address and give them a chance to change it. 
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