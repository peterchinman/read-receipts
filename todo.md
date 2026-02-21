-[ ] We need to rethink how Changes Requested work. Right now, the admin sets a Thread to Changes Requested, which sends an email to the Author with a link to access that thread from the server, which adds it to the Author's local storage.

Issues: 
1. The user needs to be already logged in for this link to work. We don't have a formal way to "log in", only magic links that are sent whenever the user tries to do something requiring auth, e.g. submitting a thread.
2. Each time the user clicks that link, the thread gets downloaded and added to their local storage. It should only be able to be uploaded once.
3. The user has no indication that a thread in their local thread list is one that has had Changes Requested. We show the notes for changes requested in the edit panel, which is good, but we should also show a flag in the thread-list.

How can we address this first issue? What if the link we sent the user allowed them to download the piece, as long as it they had the link? 