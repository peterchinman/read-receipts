## Todo

- [ ] I want to be able to upload new threads from Admin. Not just approve submitted Threads.
- [ ] how to store who is admin, how to add new admins?
- [ ] Make sure admin panel makes the request changes workflow feel good.
- [ ] context menu on thread-list, right click on desktop, slide on mobile
- [ ] "Your piece has been submitted for review! You will receive an email when it is reviewed." make this a dialog instead of a browser alert. Style it the same as the thread-editor submission dialog 	_showSubmitDialog(). Abstract the dialog styling so that it can be re-used.
- [ ] Make Mobile Width good again:
  - [ ] Hide header and footer.

---

We need to rethink how Changes Requested work. Right now, the admin sets a Thread to Changes Requested, which sends an email to the Author with a link to access that thread from the server, which adds it to the Author's local storage.

Issues:
1. The user needs to be already logged in for this link to work. We don't have a formal way to "log in", only magic links that are sent whenever the user tries to do something requiring auth, e.g. submitting a thread.
2. Each time the user clicks that link, the thread gets downloaded and added to their local storage. It should only be able to be uploaded once.
3. The user has no indication that a thread in their local thread list is one that has had Changes Requested. We show the notes for changes requested in the edit panel, which is good, but we should also show a flag in the thread-list.

How can we address this first issue? What if the link we sent the user allowed them to download the piece, as long as they had the link?
