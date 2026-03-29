import test from 'node:test';
import assert from 'node:assert/strict';

import {
	ThreadStore,
	THREADS_STORAGE_KEY,
	CURRENT_SCHEMA_VERSION,
	parseDuration,
	computeTimestamps,
	inferTimeSince,
} from '../components/store.js';

function createLocalStorageMock() {
	let map = new Map<string, string>();
	return {
		clear() {
			map = new Map();
		},
		getItem(key: string) {
			return map.has(String(key)) ? map.get(String(key)) : null;
		},
		setItem(key: string, value: string) {
			map.set(String(key), String(value));
		},
		removeItem(key: string) {
			map.delete(String(key));
		},
		_dump() {
			return new Map(map);
		},
	} as unknown as Storage & { _dump(): Map<string, string> };
}

function installBrowserPolyfills() {
	if (!(globalThis as any).localStorage)
		(globalThis as any).localStorage = createLocalStorageMock();

	// Store uses rAF for debounced saves.
	if (!(globalThis as any).requestAnimationFrame) {
		(globalThis as any).requestAnimationFrame = (cb: (t: number) => void) =>
			setTimeout(() => cb(Date.now()), 0);
	}
	if (!(globalThis as any).cancelAnimationFrame) {
		(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
	}

	// Node supports CustomEvent in newer versions; define a minimal fallback if missing.
	if (!(globalThis as any).CustomEvent) {
		(globalThis as any).CustomEvent = class CustomEvent extends Event {
			detail: unknown;
			constructor(type: string, params?: Record<string, unknown>) {
				super(
					type,
					params as unknown as {
						bubbles?: boolean;
						cancelable?: boolean;
						composed?: boolean;
					},
				);
				this.detail = params && 'detail' in params ? params.detail : undefined;
			}
		} as unknown as typeof CustomEvent;
	}
}

function flushTimers() {
	return new Promise((r) => setTimeout(r, 10));
}

installBrowserPolyfills();

// ===== Thread Management Tests =====

test('load() with empty storage creates default thread and persists', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();

	let lastEvent: Event | null = null;
	s.addEventListener('messages:changed', (e) => {
		lastEvent = e;
	});

	s.load();
	await flushTimers();

	const threads = s.listThreads();
	assert.equal(threads.length, 1, 'should have exactly one thread');

	const thread = threads[0];
	assert.ok(
		typeof thread.id === 'string' && thread.id.length > 0,
		'thread should have id',
	);
	assert.ok(
		Array.isArray(thread.messages),
		'thread should have messages array',
	);
	assert.ok(thread.messages.length > 0, 'thread should have default messages');
	assert.ok(
		Array.isArray(thread.participants),
		'thread should have participants',
	);
	assert.equal(
		typeof thread.createdAt,
		'string',
		'thread should have createdAt',
	);
	assert.equal(
		typeof thread.updatedAt,
		'string',
		'thread should have updatedAt',
	);

	assert.ok(lastEvent, 'should emit messages:changed event');
	assert.equal((lastEvent as CustomEvent).detail.reason, 'init-defaults');

	const raw = globalThis.localStorage.getItem(THREADS_STORAGE_KEY);
	assert.ok(raw, 'should persist to localStorage');
	const parsed = JSON.parse(raw);
	assert.equal(parsed.version, CURRENT_SCHEMA_VERSION);
	assert.ok(Array.isArray(parsed.threads));
	assert.equal(parsed.threads.length, 1);
});

test('createThread() generates unique ID and returns thread object', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const thread1 = s.createThread();
	const thread2 = s.createThread();

	assert.ok(thread1.id !== thread2.id, 'threads should have unique IDs');
	assert.ok(Array.isArray(thread1.messages), 'thread should have messages');
	assert.ok(
		Array.isArray(thread1.participants),
		'thread should have participants',
	);
	assert.equal(typeof thread1.createdAt, 'string', 'should have createdAt');
	assert.equal(typeof thread1.updatedAt, 'string', 'should have updatedAt');
	assert.equal(
		thread1.name,
		undefined,
		'new thread should have no custom name',
	);

	await flushTimers();

	const threads = s.listThreads();
	assert.equal(
		threads.length,
		3,
		'should have 3 threads (1 default + 2 created)',
	);
});

test('duplicateThread() creates copy with new ID', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();
	await flushTimers();

	const threads = s.listThreads();
	const original = threads[0];

	const copy = s.duplicateThread(original.id);
	await flushTimers();

	assert.ok(copy, 'should return duplicated thread');
	assert.ok(copy.id !== original.id, 'copy should have different ID');
	assert.equal(
		copy.messages.length,
		original.messages.length,
		'should copy all messages',
	);
	assert.deepEqual(
		copy.participants,
		original.participants,
		'should copy participants',
	);

	const allThreads = s.listThreads();
	assert.equal(allThreads.length, 2, 'should have 2 threads');
});

test('duplicateThread() returns null for non-existent thread', () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const result = s.duplicateThread('non-existent-id');
	assert.equal(result, null);
});

test('deleteThread() removes thread from storage', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const thread1 = s.createThread();
	const thread2 = s.createThread();
	await flushTimers();

	assert.equal(s.listThreads().length, 3, 'should have 3 threads');

	const result = s.deleteThread(thread1.id);
	assert.equal(result, true, 'delete should return true');
	await flushTimers();

	const remaining = s.listThreads();
	assert.equal(remaining.length, 2, 'should have 2 threads remaining');
	assert.ok(
		!remaining.some((t) => t.id === thread1.id),
		'deleted thread should not exist',
	);
});

test('deleteThread() returns false for non-existent thread', () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const result = s.deleteThread('non-existent-id');
	assert.equal(result, false);
});

test('deleteThread() on last thread creates new default thread', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();
	await flushTimers();

	const threads = s.listThreads();
	assert.equal(threads.length, 1, 'should start with 1 default thread');

	const onlyThreadId = threads[0].id;
	const result = s.deleteThread(onlyThreadId);
	assert.equal(result, true, 'delete should succeed');
	await flushTimers();

	const remainingThreads = s.listThreads();
	assert.equal(remainingThreads.length, 1, 'should have exactly 1 thread');
	assert.ok(
		remainingThreads[0].id !== onlyThreadId,
		'should be a new thread with different ID',
	);
	assert.ok(
		Array.isArray(remainingThreads[0].messages),
		'new thread should have messages',
	);
	assert.ok(
		remainingThreads[0].messages.length > 0,
		'new thread should have default messages',
	);

	const currentThread = s.getCurrentThread();
	assert.equal(
		currentThread!.id,
		remainingThreads[0].id,
		'new thread should be active',
	);
});

test('loadThread() switches active thread and emits event', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const thread1 = s.createThread();
	const thread2 = s.createThread();

	let events: unknown[] = [];
	s.addEventListener('messages:changed', (e) => {
		if ((e as CustomEvent).detail.reason === 'thread-changed') {
			events.push((e as CustomEvent).detail);
		}
	});

	const loaded = s.loadThread(thread2.id);
	assert.equal(loaded.id, thread2.id, 'should return loaded thread');
	assert.equal(
		s.getCurrentThread()!.id,
		thread2.id,
		'current thread should be updated',
	);

	await flushTimers();
	assert.ok(events.length > 0, 'should emit thread-changed event');
	assert.equal((events[0] as any).threadId, thread2.id);
});

test('loadThread() handles non-existent thread gracefully', () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const result = s.loadThread('non-existent-id');
	assert.ok(result, 'should return a valid thread');
	assert.ok(s.getCurrentThread(), 'should have a current thread');
});

test('listThreads() returns sorted by updatedAt descending', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const thread1 = s.createThread();
	await flushTimers();

	// Wait a bit to ensure different timestamps
	await new Promise((r) => setTimeout(r, 10));

	const thread2 = s.createThread();
	await flushTimers();

	const threads = s.listThreads();
	assert.equal(threads.length, 3);

	// Most recent should be first
	const timestamps = threads.map((t) => new Date(t.updatedAt).getTime());
	for (let i = 0; i < timestamps.length - 1; i++) {
		assert.ok(
			timestamps[i] >= timestamps[i + 1],
			'threads should be sorted by updatedAt descending',
		);
	}
});

test('getCurrentThread() returns active thread state', () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const current = s.getCurrentThread();
	assert.ok(current, 'should return current thread');
	assert.ok(current.id, 'current thread should have id');
	assert.ok(Array.isArray(current.messages), 'should have messages');
});

test('updateThreadName() sets or clears custom thread name', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const threads = s.listThreads();
	const thread = threads[0];

	s.updateThreadName(thread.id, '  My Custom Name  ');
	await flushTimers();

	const updated = s.listThreads().find((t) => t.id === thread.id)!;
	assert.equal(updated.name, 'My Custom Name', 'should trim and set name');

	s.updateThreadName(thread.id, '   ');
	await flushTimers();

	const cleared = s.listThreads().find((t) => t.id === thread.id)!;
	assert.equal(cleared.name, undefined, 'empty string should clear name');
});

test('getThreadDisplayName() returns name or falls back to recipient name', () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const thread1 = s.createThread();
	assert.equal(
		s.getThreadDisplayName(thread1),
		thread1.participants?.[0]?.full_name,
		'should fall back to participant name',
	);

	s.updateThreadName(thread1.id, 'Custom Name');
	const updated = s.listThreads().find((t) => t.id === thread1.id)!;
	assert.equal(
		s.getThreadDisplayName(updated),
		'Custom Name',
		'should return custom name',
	);
});

// ===== Message Methods Tests =====

test('add/update/delete message modifies current thread and emits events', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const events: string[] = [];
	s.addEventListener('messages:changed', (e) =>
		events.push((e as CustomEvent).detail.reason),
	);

	const created = s.addMessage(null);
	assert.ok(created, 'addMessage should return a message');
	assert.equal(created!.sender, 'self');
	assert.equal(created!.message, '');

	s.updateMessage(created!.id, { message: 'hello', sender: 'other' });
	let afterUpdate = s.getMessages().find((m) => m.id === created!.id)!;
	assert.equal(afterUpdate.message, 'hello');
	assert.equal(afterUpdate.sender, 'other');

	s.deleteMessage(created!.id);
	assert.equal(
		s.getMessages().some((m) => m.id === created!.id),
		false,
	);

	await flushTimers();
	assert.ok(events.includes('add'));
	assert.ok(events.includes('update'));
	assert.ok(events.includes('delete'));
});

test('insertImage() appends to images[] in current thread', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const created = s.addMessage(null);
	assert.ok(created, 'addMessage should return a message');
	s.insertImage(created!.id, 'data:image/png;base64,abc');
	await flushTimers();

	const msg = s.getMessages().find((m) => m.id === created!.id)!;
	assert.ok(Array.isArray(msg.images));
	assert.equal(msg.images!.length, 1);
	assert.equal(msg.images![0].src, 'data:image/png;base64,abc');
});

test('updateRecipient() updates current thread recipient', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	let count = 0;
	s.addEventListener('messages:changed', (e) => {
		if ((e as CustomEvent).detail.reason === 'recipient') count++;
	});

	const before = s.getRecipient();
	s.updateRecipient({
		name: ` ${before.name} `,
		location: ` ${before.location} `,
	});
	assert.equal(count, 0, 'no-op after trimming should not emit');

	s.updateRecipient({ name: 'Alice' });
	assert.equal(s.getRecipient().name, 'Alice');
	assert.equal(count, 1);

	await flushTimers();
});

test('clear() resets current thread messages to empty', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const extra = s.addMessage(null);
	s.updateMessage(extra!.id, { message: 'changed', sender: 'other' });

	assert.ok(s.getMessages().length > 0, 'should have messages before clear');

	s.clear();
	await flushTimers();

	assert.equal(
		s.getMessages().length,
		0,
		'clear() should reset to empty (DEFAULT_MESSAGES is [])',
	);
});

test('exportJson() exports current thread', () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const json = s.exportJson(true);
	const parsed = JSON.parse(json);

	assert.equal(parsed.version, CURRENT_SCHEMA_VERSION);
	assert.ok(Array.isArray(parsed.messages));
	assert.ok(Array.isArray(parsed.participants));
});

test('importJson() creates new thread and switches to it', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();
	await flushTimers();

	const originalThreads = s.listThreads();
	assert.equal(originalThreads.length, 1, 'should start with 1 default thread');
	const defaultThreadId = originalThreads[0].id;
	const defaultRecipientName = originalThreads[0].participants?.[0]?.full_name;

	// Create additional threads to test switching behavior
	const thread1 = s.createThread();
	const thread2 = s.createThread();
	await flushTimers();

	// Make thread2 the active thread
	s.loadThread(thread2.id);
	assert.equal(
		s.getCurrentThread()!.id,
		thread2.id,
		'thread2 should be active before import',
	);

	// Import a new thread
	const payload = {
		version: CURRENT_SCHEMA_VERSION,
		recipient: { name: '  Imported User  ', location: '  Tokyo  ' },
		messages: [
			{ sender: 'self', message: 'imported message 1', timestamp: Date.now() },
			{ sender: 'other', message: 'imported message 2' },
			{ sender: 'nope', message: 'bad' }, // invalid sender -> filtered out
		],
	};

	const importedThread = s.importJson(JSON.stringify(payload));
	await flushTimers();

	// Verify import created new thread and switched to it
	assert.ok(importedThread, 'importJson should return the new thread');
	assert.equal(
		s.getCurrentThread()!.id,
		importedThread.id,
		'imported thread should now be the active thread',
	);
	assert.ok(
		s.getCurrentThread()!.id !== thread2.id,
		'active thread should have changed from thread2',
	);

	const allThreads = s.listThreads();
	assert.equal(allThreads.length, 4, 'should have 4 threads total');

	// Verify the imported data is in the active thread
	const messages = s.getMessages();
	assert.equal(messages.length, 2, 'should import 2 valid messages');
	assert.ok(messages.every((m) => typeof m.id === 'string' && m.id.length > 0));
	assert.ok(
		messages.every(
			(m) => typeof m.timestamp === 'string' && m.timestamp.length > 0,
		),
	);
	assert.ok(
		messages.some((m) => m.message === 'imported message 1'),
		'should have imported messages',
	);

	const recipient = s.getRecipient();
	assert.equal(recipient.name, 'Imported User', 'should trim recipient name');
	assert.equal(recipient.location, 'Tokyo', 'should trim recipient location');

	// Verify original threads still exist with original data unchanged
	s.loadThread(defaultThreadId);
	const defaultThread = s.getCurrentThread()!;
	assert.equal(
		defaultThread.participants?.[0]?.full_name,
		defaultRecipientName,
		'default thread should be unchanged',
	);
});

test('load() with pre-existing threads sets a current thread', async () => {
	globalThis.localStorage.clear();

	// First: create a store, add a thread with a custom message, and persist it
	const s1 = new ThreadStore();
	s1.load();
	const thread = s1.getCurrentThread();
	s1.addMessage(null);
	s1.updateMessage(s1.getMessages().at(-1)!.id, { message: 'persisted msg' });
	await flushTimers(); // let debounced save run

	// Verify data is in localStorage
	const raw = globalThis.localStorage.getItem(THREADS_STORAGE_KEY);
	assert.ok(raw, 'data should be persisted');

	// Second: create a fresh store (simulates page reload) and load from storage
	const s2 = new ThreadStore();
	s2.load();

	const current = s2.getCurrentThread();
	assert.ok(
		current,
		'getCurrentThread() should not be null after loading existing threads',
	);
	assert.ok(current.id, 'current thread should have an id');
	assert.ok(
		s2.getMessages().some((m) => m.message === 'persisted msg'),
		'should have the persisted message in the current thread',
	);
});

test('importFromBackend() does not duplicate thread with same backendId', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();
	await flushTimers();

	const backendThread = {
		id: '99',
		name: 'Backend Thread',
		participants: [
			{ id: 'p1', full_name: 'Alice', location: 'Paris', avatar_url: null },
		],
		status: 'changes_requested',
		messages: [
			{ sender: 'self', message: 'Hello', timestamp: new Date().toISOString() },
		],
		events: [
			{
				type: 'changes_requested',
				notes: 'Fix this',
				created_at: new Date().toISOString(),
			},
		],
	};

	const countBefore = s.listThreads().length;

	// First import
	const thread1 = s.importFromBackend(backendThread);
	await flushTimers();
	assert.equal(
		s.listThreads().length,
		countBefore + 1,
		'first import should create a new thread',
	);
	assert.equal(thread1.backendId, '99');

	// Second import of the same backend thread (user clicks link again)
	const thread2 = s.importFromBackend(backendThread);
	await flushTimers();
	assert.equal(
		s.listThreads().length,
		countBefore + 1,
		'second import should NOT create another thread',
	);
	assert.equal(thread2.id, thread1.id, 'should return the same local thread');
	assert.equal(thread2.backendId, '99');
	assert.equal(thread2.participants?.[0]?.full_name, 'Alice');
});
// ===== Submitted Thread Tests =====

test('markThreadSubmitted() sets submittedAt and isCurrentThreadSubmitted() returns true', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();
	await flushTimers();

	const thread = s.getCurrentThread()!;
	assert.equal(
		s.isCurrentThreadSubmitted(),
		false,
		'should not be submitted initially',
	);
	assert.equal(
		thread.submittedAt,
		undefined,
		'submittedAt should be undefined',
	);

	let lastReason: string | null = null;
	s.addEventListener('messages:changed', (e) => {
		lastReason = (e as CustomEvent).detail.reason;
	});

	s.markThreadSubmitted(thread.id);
	await flushTimers();

	assert.equal(
		s.isCurrentThreadSubmitted(),
		true,
		'should be submitted after marking',
	);
	const updated = s.getCurrentThread()!;
	assert.ok(
		typeof updated.submittedAt === 'string',
		'submittedAt should be an ISO string',
	);
	assert.equal(
		lastReason,
		'thread-submitted',
		'should emit thread-submitted event',
	);
});

test('mutation methods are no-ops on submitted thread', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();
	await flushTimers();

	const thread = s.getCurrentThread()!;
	const originalMessages = s.getMessages();
	const originalRecipient = s.getRecipient();
	const originalName = thread.name;

	s.markThreadSubmitted(thread.id);
	await flushTimers();

	// addMessage should return null
	const added = s.addMessage(null);
	assert.equal(
		added,
		null,
		'addMessage should return null on submitted thread',
	);

	// updateMessage should be no-op
	const firstMsg = s.getMessages()[0];
	s.updateMessage(firstMsg.id, { message: 'changed' });
	assert.equal(
		s.getMessages()[0].message,
		firstMsg.message,
		'updateMessage should be no-op',
	);

	// deleteMessage should be no-op
	const msgCount = s.getMessages().length;
	s.deleteMessage(firstMsg.id);
	assert.equal(
		s.getMessages().length,
		msgCount,
		'deleteMessage should be no-op',
	);

	// insertImage should be no-op
	s.insertImage(firstMsg.id, 'data:image/png;base64,abc');
	const msg = s.getMessages()[0];
	assert.ok(
		!msg.images || msg.images.length === 0,
		'insertImage should be no-op',
	);

	// updateRecipient should be no-op
	s.updateRecipient({ name: 'Changed Name' });
	assert.equal(
		s.getRecipient().name,
		originalRecipient.name,
		'updateRecipient should be no-op',
	);

	// updateThreadName should be no-op
	s.updateThreadName(thread.id, 'New Name');
	const afterNameUpdate = s.getCurrentThread()!;
	assert.equal(
		afterNameUpdate.name,
		originalName,
		'updateThreadName should be no-op',
	);

	// clear should be no-op
	s.clear();
	assert.equal(
		s.getMessages().length,
		originalMessages.length,
		'clear should be no-op',
	);
});

test('duplicateThread() does NOT copy submittedAt', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();
	await flushTimers();

	const thread = s.getCurrentThread()!;
	s.markThreadSubmitted(thread.id);
	await flushTimers();

	assert.equal(
		s.isCurrentThreadSubmitted(),
		true,
		'original should be submitted',
	);

	const copy = s.duplicateThread(thread.id);
	assert.ok(copy, 'should return duplicated thread');
	assert.equal(
		copy!.submittedAt,
		undefined,
		'copy should not have submittedAt',
	);

	// Switch to the copy and verify it's editable
	s.loadThread(copy!.id);
	assert.equal(
		s.isCurrentThreadSubmitted(),
		false,
		'copy should not be submitted',
	);

	// Verify mutations work on the copy
	const added = s.addMessage(null);
	assert.ok(added, 'should be able to add messages to copy');
});

test('deleteThread() still works on submitted threads', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const thread1 = s.createThread();
	await flushTimers();

	s.markThreadSubmitted(thread1.id);
	await flushTimers();

	const result = s.deleteThread(thread1.id);
	assert.equal(result, true, 'should be able to delete submitted thread');
	await flushTimers();

	const remaining = s.listThreads();
	assert.ok(
		!remaining.some((t) => t.id === thread1.id),
		'submitted thread should be deleted',
	);
});

test('messages are isolated between threads', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	const thread1 = s.getCurrentThread()!;
	const thread1Id = thread1.id;
	const msg1 = s.addMessage(null);
	s.updateMessage(msg1!.id, { message: 'Thread 1 message' });

	const thread2 = s.createThread();
	s.loadThread(thread2.id);
	const msg2 = s.addMessage(null);
	s.updateMessage(msg2!.id, { message: 'Thread 2 message' });

	await flushTimers();

	// Switch back to thread 1
	s.loadThread(thread1Id);
	const thread1Messages = s.getMessages();
	assert.ok(
		thread1Messages.some((m) => m.message === 'Thread 1 message'),
		'thread 1 should have its message',
	);
	assert.ok(
		!thread1Messages.some((m) => m.message === 'Thread 2 message'),
		'thread 1 should not have thread 2 message',
	);

	// Switch back to thread 2
	s.loadThread(thread2.id);
	const thread2Messages = s.getMessages();
	assert.ok(
		thread2Messages.some((m) => m.message === 'Thread 2 message'),
		'thread 2 should have its message',
	);
	assert.ok(
		!thread2Messages.some((m) => m.message === 'Thread 1 message'),
		'thread 2 should not have thread 1 message',
	);
});

test('importFromBackend() only shows most recent admin notes', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();
	await flushTimers();

	const backendThread = {
		id: '200',
		name: 'Multi-round Thread',
		participants: [
			{ id: 'p1', full_name: 'Bob', location: 'London', avatar_url: null },
		],
		status: 'changes_requested',
		messages: [
			{ sender: 'self', message: 'Hello', timestamp: new Date().toISOString() },
		],
		events: [
			// Most recent first (desc order)
			{
				type: 'changes_requested',
				notes: 'Round 2 notes',
				created_at: '2026-02-08T12:00:00Z',
			},
			{
				type: 'changes_requested',
				notes: 'Round 1 notes',
				created_at: '2026-02-07T12:00:00Z',
			},
		],
	};

	const thread = s.importFromBackend(backendThread);
	await flushTimers();

	assert.deepEqual(
		thread.adminNotes,
		['Round 2 notes'],
		'should only contain the most recent admin notes',
	);
});

test('full lifecycle: submit stores backendId so importFromBackend updates in place on changes requested', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();
	await flushTimers();

	const countBefore = s.listThreads().length;

	// Step 1: user has a local thread and submits it
	const localThread = s.getCurrentThread()!;
	s.updateThreadName(localThread.id, 'My Piece');
	s.updateRecipient({ name: 'Alice', location: 'Paris' });
	await flushTimers();

	// Step 2: simulate what _onSubmit / #checkPendingSubmission does on success:
	// the backend returns an ID which we store on the local thread
	const backendId = '42';
	s.setThreadBackendId(localThread.id, backendId);
	s.markThreadSubmitted(localThread.id);
	await flushTimers();

	assert.equal(
		s.isCurrentThreadSubmitted(),
		true,
		'thread should be submitted',
	);
	assert.equal(
		s.getCurrentThread()!.backendId,
		backendId,
		'backend ID should be stored',
	);
	assert.equal(
		s.listThreads().length,
		countBefore,
		'no new thread should exist yet',
	);

	// Step 3: admin requests changes → importFromBackend is called with the same backend ID
	const backendThread = {
		id: backendId,
		name: 'My Piece',
		participants: [
			{ id: 'p1', full_name: 'Alice', location: 'Paris', avatar_url: null },
		],
		status: 'changes_requested',
		messages: [
			{ sender: 'self', message: 'Hello', timestamp: new Date().toISOString() },
		],
		events: [
			{
				type: 'changes_requested',
				notes: 'Please revise the opening',
				created_at: new Date().toISOString(),
			},
		],
	};

	const imported = s.importFromBackend(backendThread as any);
	await flushTimers();

	// Should update the existing thread, not create a new one
	assert.equal(
		s.listThreads().length,
		countBefore,
		'importFromBackend should update in place, not add a new thread',
	);
	assert.equal(
		imported.id,
		localThread.id,
		'returned thread should be the same local thread',
	);

	// submittedAt should be cleared so the user can edit and resubmit
	assert.equal(
		imported.submittedAt,
		undefined,
		'submittedAt should be cleared so thread is editable',
	);
	assert.equal(
		s.isCurrentThreadSubmitted(),
		false,
		'thread should no longer appear submitted',
	);

	// Admin notes should be populated
	assert.deepEqual(
		imported.adminNotes,
		['Please revise the opening'],
		'admin notes should be set from the changes_requested event',
	);
});

test('importFromBackend() preserves undefined name when backend has no custom name', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();
	await flushTimers();

	// Thread with no custom name — only a recipient name
	const localThread = s.getCurrentThread()!;
	s.updateRecipient({ name: 'Alice', location: 'Paris' });
	assert.equal(
		localThread.name,
		undefined,
		'local thread should have no custom name',
	);

	s.setThreadBackendId(localThread.id, '55');
	s.markThreadSubmitted(localThread.id);
	await flushTimers();

	// Backend stores null name (because the payload sent null — no custom title)
	const backendThread = {
		id: '55',
		name: null,
		participants: [
			{ id: 'p1', full_name: 'Alice', location: 'Paris', avatar_url: null },
		],
		status: 'changes_requested',
		messages: [
			{ sender: 'self', message: 'Hello', timestamp: new Date().toISOString() },
		],
		events: [
			{
				type: 'changes_requested',
				notes: 'Revise please',
				created_at: new Date().toISOString(),
			},
		],
	};

	const imported = s.importFromBackend(backendThread as any);
	await flushTimers();

	// name is null/falsy from backend, so importFromBackend leaves thread.name alone
	assert.equal(
		imported.name,
		undefined,
		'thread name should remain undefined when backend has no custom name',
	);
	// getThreadDisplayName still resolves correctly via recipient fallback
	assert.equal(
		s.getThreadDisplayName(imported),
		'Alice',
		'display name should resolve to recipient name via fallback',
	);
});

test('importFromBackend() updates existing thread on second changes-requested cycle (backendId preserved after resubmit)', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();
	await flushTimers();

	const countBefore = s.listThreads().length;

	const backendThread = {
		id: '300',
		name: 'Resubmit Thread',
		participants: [
			{ id: 'p1', full_name: 'Carol', location: 'Berlin', avatar_url: null },
		],
		status: 'changes_requested',
		messages: [
			{ sender: 'self', message: 'Hello', timestamp: new Date().toISOString() },
		],
		events: [
			{
				type: 'changes_requested',
				notes: 'Please fix',
				created_at: '2026-02-07T12:00:00Z',
			},
		],
	};

	// First changes-requested import
	const thread1 = s.importFromBackend(backendThread as any);
	await flushTimers();
	assert.equal(thread1.backendId, '300');
	assert.equal(
		s.listThreads().length,
		countBefore + 1,
		'first import creates a new thread',
	);

	// User resubmits: backendId is NOW preserved (the real flow no longer deletes it)
	s.markThreadSubmitted(thread1.id);
	await flushTimers();

	// Admin requests changes again (second round)
	const backendThreadRound2 = {
		...backendThread,
		events: [
			{
				type: 'changes_requested',
				notes: 'Round 2: please also fix the ending',
				created_at: '2026-02-10T12:00:00Z',
			},
			{
				type: 'changes_requested',
				notes: 'Please fix',
				created_at: '2026-02-07T12:00:00Z',
			},
		],
	};

	const thread2 = s.importFromBackend(backendThreadRound2 as any);
	await flushTimers();

	assert.equal(
		s.listThreads().length,
		countBefore + 1,
		'second import should update in place — no new thread created',
	);
	assert.equal(thread2.id, thread1.id, 'should return the same local thread');
	assert.equal(thread2.backendId, '300', 'backendId should still be set');
	assert.deepEqual(
		thread2.adminNotes,
		['Round 2: please also fix the ending'],
		'should reflect the most recent admin notes',
	);
	assert.equal(
		thread2.submittedAt,
		undefined,
		'submittedAt should be cleared so user can edit again',
	);
});

// ===== parseDuration() Tests =====

test('parseDuration: basic units', () => {
	assert.equal(parseDuration('PT1M'), 60_000, '1 minute');
	assert.equal(parseDuration('PT1H'), 3_600_000, '1 hour');
	assert.equal(parseDuration('P1D'), 86_400_000, '1 day');
	assert.equal(parseDuration('PT30S'), 30_000, '30 seconds');
	assert.equal(parseDuration('PT0S'), 0, '0 seconds');
});

test('parseDuration: compound durations', () => {
	assert.equal(parseDuration('PT1H30M'), 5_400_000, '1 hour 30 min');
	assert.equal(
		parseDuration('P1DT2H'),
		86_400_000 + 7_200_000,
		'1 day 2 hours',
	);
	assert.equal(
		parseDuration('P1DT1H1M1S'),
		86_400_000 + 3_600_000 + 60_000 + 1_000,
		'1D1H1M1S',
	);
});

test('parseDuration: years and months use approximate day counts', () => {
	assert.equal(parseDuration('P1Y'), 365 * 86_400_000, '1 year = 365 days');
	assert.equal(parseDuration('P1M'), 30 * 86_400_000, '1 month = 30 days');
});

test('parseDuration: fractional seconds', () => {
	assert.equal(parseDuration('PT1.5S'), 1_500, '1.5 seconds');
});

test('parseDuration: invalid string falls back to 1 minute', () => {
	assert.equal(parseDuration('not-a-duration'), 60_000, 'garbage input');
	assert.equal(parseDuration(''), 60_000, 'empty string');
	assert.equal(parseDuration(null), 60_000, 'null');
	assert.equal(parseDuration(undefined), 60_000, 'undefined');
});

// ===== inferTimeSince() Tests =====

test('inferTimeSince: exactly 1 minute', () => {
	const prev = '2024-01-01T00:00:00.000Z';
	const cur = '2024-01-01T00:01:00.000Z';
	assert.equal(inferTimeSince(prev, cur), 'PT1M');
});

test('inferTimeSince: exactly 1 hour', () => {
	const prev = '2024-01-01T00:00:00.000Z';
	const cur = '2024-01-01T01:00:00.000Z';
	assert.equal(inferTimeSince(prev, cur), 'PT1H');
});

test('inferTimeSince: exactly 1 day', () => {
	const prev = '2024-01-01T00:00:00.000Z';
	const cur = '2024-01-02T00:00:00.000Z';
	assert.equal(inferTimeSince(prev, cur), 'P1D');
});

test('inferTimeSince: mixed units', () => {
	const prev = '2024-01-01T00:00:00.000Z';
	const cur = '2024-01-02T01:30:00.000Z'; // 1 day 1 hour 30 min
	assert.equal(inferTimeSince(prev, cur), 'P1DT1H30M');
});

test('inferTimeSince: with leftover seconds', () => {
	const prev = '2024-01-01T00:00:00.000Z';
	const cur = '2024-01-01T00:01:45.000Z'; // 1 min 45 sec
	assert.equal(inferTimeSince(prev, cur), 'PT1M45S');
});

test('inferTimeSince: zero diff falls back to PT1M', () => {
	const ts = '2024-01-01T00:00:00.000Z';
	assert.equal(inferTimeSince(ts, ts), 'PT1M');
});

test('inferTimeSince: negative diff clamps to PT1M', () => {
	const prev = '2024-01-01T01:00:00.000Z';
	const cur = '2024-01-01T00:00:00.000Z'; // earlier than prev
	assert.equal(inferTimeSince(prev, cur), 'PT1M');
});

test('inferTimeSince: round-trips with parseDuration (1 min)', () => {
	const prev = '2024-01-01T00:00:00.000Z';
	const cur = new Date(
		new Date(prev).getTime() + parseDuration('PT1M'),
	).toISOString();
	assert.equal(inferTimeSince(prev, cur), 'PT1M');
});

test('inferTimeSince: round-trips with parseDuration (1 day 2 hours)', () => {
	const prev = '2024-01-01T00:00:00.000Z';
	const cur = new Date(
		new Date(prev).getTime() + parseDuration('P1DT2H'),
	).toISOString();
	assert.equal(inferTimeSince(prev, cur), 'P1DT2H');
});

// ===== computeTimestamps() Tests =====

test('computeTimestamps: single message returns initialMessageTime', () => {
	const thread = {
		initialMessageTime: '2024-06-01T12:00:00.000Z',
		messages: [{ id: 'a', sender: 'self', message: 'hi' }],
	};
	const stamps = computeTimestamps(thread as any);
	assert.equal(stamps.length, 1);
	assert.equal(stamps[0], '2024-06-01T12:00:00.000Z');
});

test('computeTimestamps: multiple messages offset by timeSincePrevious', () => {
	const base = '2024-06-01T12:00:00.000Z';
	const thread = {
		initialMessageTime: base,
		messages: [
			{ id: 'a', sender: 'self', message: 'first' },
			{
				id: 'b',
				sender: 'other',
				message: 'second',
				timeSincePrevious: 'PT1M',
			},
			{ id: 'c', sender: 'self', message: 'third', timeSincePrevious: 'PT1H' },
		],
	};
	const stamps = computeTimestamps(thread as any);
	assert.equal(stamps[0], base);
	assert.equal(stamps[1], '2024-06-01T12:01:00.000Z');
	assert.equal(stamps[2], '2024-06-01T13:01:00.000Z');
});

test('computeTimestamps: falls back to now when initialMessageTime is missing', () => {
	const before = Date.now();
	const thread = {
		messages: [{ id: 'a', sender: 'self', message: 'hi' }],
	};
	const stamps = computeTimestamps(thread as any);
	const after = Date.now();
	const ts = new Date(stamps[0]).getTime();
	assert.ok(
		ts >= before && ts <= after,
		'timestamp should be approximately now',
	);
});

test('computeTimestamps: invalid timeSincePrevious falls back to 1 min', () => {
	const base = '2024-06-01T12:00:00.000Z';
	const thread = {
		initialMessageTime: base,
		messages: [
			{ id: 'a', sender: 'self', message: 'first' },
			{
				id: 'b',
				sender: 'other',
				message: 'second',
				timeSincePrevious: 'BOGUS',
			},
		],
	};
	const stamps = computeTimestamps(thread as any);
	assert.equal(stamps[1], '2024-06-01T12:01:00.000Z', 'falls back to 1 min');
});

// ===== getMessages() integration (exercises #getComputedMessages) =====

test('getMessages() returns computed timestamps for each message', async () => {
	globalThis.localStorage.clear();
	const s = new ThreadStore();
	s.load();

	// Clear default messages and start fresh
	s.clear();
	const base = '2024-06-01T12:00:00.000Z';
	s.updateInitialMessageTime(base);

	const m1 = s.addMessage(null);
	s.updateMessage(m1!.id, { message: 'first' });
	const m2 = s.addMessage(m1!.id);
	s.updateMessage(m2!.id, { message: 'second', timeSincePrevious: 'PT1H' });

	const msgs = s.getMessages();
	assert.equal(msgs[0].timestamp, base, 'first message = initialMessageTime');
	assert.equal(
		msgs[1].timestamp,
		'2024-06-01T13:00:00.000Z',
		'second = base + 1 hour',
	);
	// Raw stored messages should not have timestamps
	const raw = s.getCurrentThread()!.messages;
	assert.equal(
		(raw[0] as any).timestamp,
		undefined,
		'raw first message has no timestamp',
	);
	assert.equal(
		(raw[1] as any).timestamp,
		undefined,
		'raw second message has no timestamp',
	);
});
