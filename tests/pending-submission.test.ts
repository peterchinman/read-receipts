import test from 'node:test';
import assert from 'node:assert/strict';

import { ThreadStore, THREADS_STORAGE_KEY } from '../components/store.js';

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
	} as unknown as Storage;
}

function installBrowserPolyfills() {
	if (!(globalThis as any).localStorage)
		(globalThis as any).localStorage = createLocalStorageMock();
	if (!(globalThis as any).requestAnimationFrame) {
		(globalThis as any).requestAnimationFrame = (cb: (t: number) => void) =>
			setTimeout(() => cb(Date.now()), 0);
	}
	if (!(globalThis as any).cancelAnimationFrame) {
		(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
	}
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

// ===== Pending Submission Tests =====

test('listPendingThreads() returns all threads with pendingAt set and no submittedAt', async () => {
	globalThis.localStorage.clear();
	const store = new ThreadStore();
	store.load();
	await flushTimers();

	const threadA = store.getCurrentThread()!;
	const threadB = store.createThread();
	const threadC = store.createThread();
	await flushTimers();

	assert.equal(
		store.listPendingThreads().length,
		0,
		'no pending threads initially',
	);

	store.markThreadPending(threadA.id);
	store.markThreadPending(threadB.id);
	await flushTimers();

	const pending = store.listPendingThreads();
	assert.equal(pending.length, 2, 'should list both pending threads');
	assert.ok(
		pending.some((t) => t.id === threadA.id),
		'threadA should be pending',
	);
	assert.ok(
		pending.some((t) => t.id === threadB.id),
		'threadB should be pending',
	);
	assert.ok(
		!pending.some((t) => t.id === threadC.id),
		'threadC should not be pending',
	);

	// Submitted threads should not appear even if they somehow have pendingAt
	store.markThreadPending(threadC.id);
	store.markThreadSubmitted(threadC.id);
	await flushTimers();

	const pendingAfterSubmit = store.listPendingThreads();
	assert.equal(
		pendingAfterSubmit.length,
		2,
		'submitted thread should not appear in pending list',
	);
});

test('all pending threads are submitted when magic link is clicked, not just the most recent', async () => {
	globalThis.localStorage.clear();
	const store = new ThreadStore();
	store.load();
	await flushTimers();

	const threadA = store.getCurrentThread()!;
	store.updateThreadName(threadA.id, 'Thread A');

	const threadB = store.createThread();
	store.updateThreadName(threadB.id, 'Thread B');

	const threadC = store.createThread();
	store.updateThreadName(threadC.id, 'Thread C - Not Pending');
	await flushTimers();

	// Simulate: user submitted A and B while unauthenticated.
	store.markThreadPending(threadA.id);
	store.markThreadPending(threadB.id);
	await flushTimers();

	assert.equal(
		store.listPendingThreads().length,
		2,
		'both threads should be pending',
	);

	// Simulate: magic link clicked → authenticated → #checkPendingSubmission runs.
	// It should find ALL pending threads from the store.
	const allPending = store.listPendingThreads();
	for (const thread of allPending) {
		store.clearThreadPending(thread.id);
	}
	// Simulate successful API submission for each
	for (const thread of allPending) {
		store.markThreadSubmitted(thread.id);
	}
	await flushTimers();

	store.loadThread(threadA.id);
	assert.equal(
		store.isCurrentThreadSubmitted(),
		true,
		'threadA should be submitted',
	);

	store.loadThread(threadB.id);
	assert.equal(
		store.isCurrentThreadSubmitted(),
		true,
		'threadB should be submitted',
	);

	store.loadThread(threadC.id);
	assert.equal(
		store.isCurrentThreadSubmitted(),
		false,
		'threadC should not be submitted',
	);

	assert.equal(
		store.listPendingThreads().length,
		0,
		'no threads should remain pending',
	);
});

test('magic link flow: markThreadPending then clearThreadPending allows submission', async () => {
	globalThis.localStorage.clear();
	const store = new ThreadStore();
	store.load();
	await flushTimers();

	const thread = store.getCurrentThread()!;

	// Step 1: user hits Submit while unauthenticated → dialog sends magic link
	store.markThreadPending(thread.id);
	await flushTimers();

	assert.equal(
		store.isCurrentThreadPending(),
		true,
		'thread should be pending after markThreadPending',
	);
	assert.equal(
		store.isCurrentThreadSubmitted(),
		false,
		'thread should not be submitted yet',
	);

	// Step 2: user clicks magic link → authenticated → #checkPendingSubmission runs.
	// It must clear pending BEFORE loading the thread, otherwise the submit button
	// is disabled and _onSubmit() returns early.
	store.clearThreadPending(thread.id);
	await flushTimers();

	assert.equal(
		store.isCurrentThreadPending(),
		false,
		'thread should no longer be pending after clearThreadPending',
	);

	// Step 3: _onSubmit() calls markThreadSubmitted on success
	store.markThreadSubmitted(thread.id);
	await flushTimers();

	assert.equal(
		store.isCurrentThreadSubmitted(),
		true,
		'thread should be submitted',
	);
	assert.equal(
		store.isCurrentThreadPending(),
		false,
		'thread should not be pending after submission',
	);
	assert.equal(
		store.getCurrentThread()!.pendingAt,
		undefined,
		'pendingAt should be cleared by markThreadSubmitted',
	);
});
