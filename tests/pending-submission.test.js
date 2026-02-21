import test from 'node:test';
import assert from 'node:assert/strict';

import { ThreadStore, THREADS_STORAGE_KEY } from '../components/store.js';

const PENDING_KEY = 'pending-submission';

function createLocalStorageMock() {
	let map = new Map();
	return {
		clear() {
			map = new Map();
		},
		getItem(key) {
			return map.has(String(key)) ? map.get(String(key)) : null;
		},
		setItem(key, value) {
			map.set(String(key), String(value));
		},
		removeItem(key) {
			map.delete(String(key));
		},
	};
}

function installBrowserPolyfills() {
	if (!globalThis.localStorage)
		globalThis.localStorage = createLocalStorageMock();
	if (!globalThis.requestAnimationFrame) {
		globalThis.requestAnimationFrame = (cb) =>
			setTimeout(() => cb(Date.now()), 0);
	}
	if (!globalThis.cancelAnimationFrame) {
		globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
	}
	if (!globalThis.CustomEvent) {
		globalThis.CustomEvent = class CustomEvent extends Event {
			constructor(type, params) {
				super(type, params);
				this.detail = params && 'detail' in params ? params.detail : undefined;
			}
		};
	}
}

function flushTimers() {
	return new Promise((r) => setTimeout(r, 10));
}

installBrowserPolyfills();

// ===== Pending Submission Tests =====

test('pending-submission stores the thread ID that was active at submit time', async () => {
	globalThis.localStorage.clear();
	const store = new ThreadStore();
	store.load();
	await flushTimers();

	// Set up Thread A with distinct data
	const threadA = store.getCurrentThread();
	store.updateThreadName(threadA.id, 'Thread A - Original Submission');
	store.updateRecipient({ name: 'Alice', location: 'Wonderland' });
	await flushTimers();

	// Simulate what _onSubmit does when unauthenticated:
	// store the current thread's ID
	localStorage.setItem(PENDING_KEY, threadA.id);

	// Create Thread B and switch to it (simulates what happens after
	// auth redirect — the store reloads and a different thread is current)
	const threadB = store.createThread();
	store.loadThread(threadB.id);
	store.updateThreadName(threadB.id, 'Thread B - Different Thread');
	store.updateRecipient({ name: 'Bob', location: 'Nowhere' });
	await flushTimers();

	// Verify current thread is now Thread B
	assert.equal(store.getCurrentThread().id, threadB.id,
		'current thread should be Thread B after switching');

	// Read back the pending thread ID
	const pendingThreadId = localStorage.getItem(PENDING_KEY);
	assert.equal(pendingThreadId, threadA.id,
		'pending-submission should store Thread A ID');

	// Simulate what #checkPendingSubmission does: load the stored thread
	store.loadThread(pendingThreadId);
	const restored = store.getCurrentThread();

	assert.equal(restored.id, threadA.id,
		'after loadThread, current thread should be Thread A');
	assert.equal(restored.name, 'Thread A - Original Submission',
		'restored thread should have Thread A name');
	assert.equal(restored.recipient.name, 'Alice',
		'restored thread should have Thread A recipient');
});

test('loading pending thread ID restores the correct thread even with many threads', async () => {
	globalThis.localStorage.clear();
	const store = new ThreadStore();
	store.load();
	await flushTimers();

	// Create several threads
	const threadA = store.getCurrentThread();
	store.updateThreadName(threadA.id, 'First Thread');
	await flushTimers();

	const threadB = store.createThread();
	store.loadThread(threadB.id);
	store.updateThreadName(threadB.id, 'Second Thread');
	await flushTimers();

	const threadC = store.createThread();
	store.loadThread(threadC.id);
	store.updateThreadName(threadC.id, 'Third Thread');
	store.updateRecipient({ name: 'Target Recipient', location: 'Target City' });
	await flushTimers();

	// User submits Thread C while unauthenticated
	localStorage.setItem(PENDING_KEY, threadC.id);

	// Switch away to Thread A (simulates post-auth redirect)
	store.loadThread(threadA.id);
	assert.equal(store.getCurrentThread().name, 'First Thread');

	// Restore from pending
	const pendingId = localStorage.getItem(PENDING_KEY);
	store.loadThread(pendingId);

	assert.equal(store.getCurrentThread().id, threadC.id);
	assert.equal(store.getCurrentThread().name, 'Third Thread');
	assert.equal(store.getCurrentThread().recipient.name, 'Target Recipient');
	assert.equal(store.getCurrentThread().recipient.location, 'Target City');
});

test('pending thread ID survives store reload (simulates page navigation)', async () => {
	globalThis.localStorage.clear();
	const store1 = new ThreadStore();
	store1.load();
	await flushTimers();

	const thread = store1.getCurrentThread();
	store1.updateThreadName(thread.id, 'Submitted Thread');
	store1.updateRecipient({ name: 'Persisted Recipient', location: 'Persisted City' });
	await flushTimers();

	// Store pending thread ID (unauthenticated submit)
	localStorage.setItem(PENDING_KEY, thread.id);

	// Simulate page reload: new store instance loads from localStorage
	const store2 = new ThreadStore();
	store2.load();
	await flushTimers();

	// The new store may have a different current thread (first in sorted order)
	// but the pending ID should still be valid
	const pendingId = localStorage.getItem(PENDING_KEY);
	assert.ok(pendingId, 'pending-submission should survive reload');

	store2.loadThread(pendingId);
	const restored = store2.getCurrentThread();

	assert.equal(restored.id, thread.id);
	assert.equal(restored.name, 'Submitted Thread');
	assert.equal(restored.recipient.name, 'Persisted Recipient');
});
