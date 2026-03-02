import test from 'node:test';
import assert from 'node:assert/strict';

import { ThreadStore, THREADS_STORAGE_KEY } from '../components/store.js';

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

// A minimal backend thread shape as returned by GET /submissions/{id}/edit
function makeBackendThread(overrides = {}) {
	return {
		id: 42,
		status: 'changes_requested',
		name: 'Test Piece',
		messages: [
			{ sender: 'Alice', message: 'Hello Bob', timestamp: '2026-01-01T00:00:00.000Z' },
		],
		participants: [{ full_name: 'Bob Smith', location: 'NYC' }],
		events: [
			{
				type: 'changes_requested',
				notes: 'Please revise the ending.',
				created_at: '2026-01-02T00:00:00.000Z',
			},
		],
		...overrides,
	};
}

// ===== importFromBackend Tests =====

test('importFromBackend sets backendId, messages, participants, name, and adminNotes', async () => {
	globalThis.localStorage.clear();
	const store = new ThreadStore();
	store.load();
	await flushTimers();

	const thread = store.importFromBackend(makeBackendThread());

	assert.equal(thread.backendId, 42, 'backendId should be set from backend id');
	assert.equal(thread.name, 'Test Piece', 'name should be populated');
	assert.equal(thread.messages.length, 1, 'messages should be populated');
	assert.equal(thread.messages[0].sender, 'Alice', 'message sender should match');
	assert.equal(thread.messages[0].message, 'Hello Bob', 'message content should match');
	assert.equal(thread.participants[0].full_name, 'Bob Smith', 'participant name should match');
	assert.deepEqual(
		thread.adminNotes,
		['Please revise the ending.'],
		'adminNotes should be extracted from changes_requested event',
	);
	assert.equal(thread.submittedAt, undefined, 'submittedAt should be cleared so thread is editable');
	assert.equal(thread.pendingAt, undefined, 'pendingAt should be cleared');
});

test('importFromBackend with no changes_requested events sets no adminNotes', async () => {
	globalThis.localStorage.clear();
	const store = new ThreadStore();
	store.load();
	await flushTimers();

	const thread = store.importFromBackend(makeBackendThread({ events: [] }));

	assert.equal(thread.adminNotes, undefined, 'adminNotes should not be set when no changes_requested events');
});

// ===== editToken persistence Tests =====

test('editToken set after importFromBackend persists through save/load cycle', async () => {
	globalThis.localStorage.clear();
	const store = new ThreadStore();
	store.load();
	await flushTimers();

	const thread = store.importFromBackend(makeBackendThread());
	thread.editToken = 'super-secret-token-xyz';
	store.save();

	// Simulate reopening the app by creating a fresh store from the same localStorage
	const store2 = new ThreadStore();
	store2.load();
	await flushTimers();

	store2.loadThread(thread.id);
	const reloaded = store2.getCurrentThread();
	assert.equal(reloaded.editToken, 'super-secret-token-xyz', 'editToken should survive save/load');
});

test('editToken is absent after deletion and save/load cycle', async () => {
	globalThis.localStorage.clear();
	const store = new ThreadStore();
	store.load();
	await flushTimers();

	const thread = store.importFromBackend(makeBackendThread());
	thread.editToken = 'token-to-delete';
	store.save();

	// Simulate post-resubmit cleanup
	delete thread.editToken;
	store.save();

	const store2 = new ThreadStore();
	store2.load();
	await flushTimers();

	store2.loadThread(thread.id);
	const reloaded = store2.getCurrentThread();
	assert.equal(reloaded.editToken, undefined, 'editToken should be gone after deletion and save');
});

// ===== Pending queue isolation Tests =====

test('a thread imported from backend is never in listPendingThreads', async () => {
	globalThis.localStorage.clear();
	const store = new ThreadStore();
	store.load();
	await flushTimers();

	store.importFromBackend(makeBackendThread());
	await flushTimers();

	assert.equal(
		store.listPendingThreads().length,
		0,
		'imported thread should not appear in pending queue',
	);
});

test('importFromBackend clears pendingAt even if thread was previously marked pending', async () => {
	globalThis.localStorage.clear();
	const store = new ThreadStore();
	store.load();
	await flushTimers();

	// Simulate a thread that somehow had pendingAt set before import
	const initial = store.importFromBackend(makeBackendThread());
	store.markThreadPending(initial.id);
	assert.equal(store.listPendingThreads().length, 1, 'thread should be pending before re-import');

	// Re-importing (e.g. user clicks magic link again) clears the pending flag
	const reimported = store.importFromBackend(makeBackendThread());
	await flushTimers();

	assert.equal(reimported.pendingAt, undefined, 'pendingAt should be cleared by importFromBackend');
	assert.equal(store.listPendingThreads().length, 0, 'thread should not be pending after import');
});
