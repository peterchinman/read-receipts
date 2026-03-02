// ThreadStore: manages multiple message threads with persistence
import { getThreadDisplayName } from '../utils/thread.js';
const THREADS_STORAGE_KEY = 'message-simulator:threads';
const CURRENT_SCHEMA_VERSION = 2;

const WELCOME_PARTICIPANTS = [
	{
		id: 'p1',
		full_name: 'Peter Chinman',
		location: 'New York, NY',
		avatar_url: null,
	},
];

const DEFAULT_PARTICIPANTS = [
	{
		id: 'p1',
		full_name: 'Other',
		location: '',
		avatar_url: null,
	},
];

const WELCOME_MESSAGES = [
	{ message: 'Hi', sender: 'other' },
	{ message: 'Hello', sender: 'other' },
	{ message: 'what is this?', sender: 'self' },
	{
		message: 'I had a dream that I was working on an iMessage simulator',
		sender: 'other',
	},
	{
		message: 'When I woke up I decided that I should build it',
		sender: 'other',
	},
	{ message: 'what do I do with it?', sender: 'self' },
	{
		message: 'You can compose messages to the left in the Edit panel. To the left of that is a list of all your Drafts.',
		sender: 'other',
	},
	{
		message:
			"You can also submit a piece from the Edit panel. I'm always looking for work that give me goosebumps. If it gets accepted, I'll send you $20.",
		sender: 'other',
	},
	{
		message:
			'Important note: your drafts are only stored locally! They are not saved anywhere except in your browser. I can not see them unless you submit!',
		sender: 'other',
	},
	{
		message: '(Which also means that you can use this off-line.)',
		sender: 'other',
	},
	{ message: 'no like, what is this for?', sender: 'self' },
	{ message: 'Lol idk', sender: 'other' },
];

const DEFAULT_MESSAGES = [];

class ThreadStore extends EventTarget {
	#threads = [];
	#currentThreadId = null;
	#saveDebounceId = null;

	constructor() {
		super();
	}

	load() {
		try {
			const raw = localStorage.getItem(THREADS_STORAGE_KEY);
			if (!raw) {
				// No threads exist, create default thread
				const thread = this.#createDefaultThread();
				this.#threads = [thread];
				this.#currentThreadId = thread.id;
				this.save();
				this.#emitChange('init-defaults');
				return;
			}

			const parsed = JSON.parse(raw);
			if (
				parsed &&
				typeof parsed === 'object' &&
				parsed.version === CURRENT_SCHEMA_VERSION &&
				Array.isArray(parsed.threads)
			) {
				this.#threads = parsed.threads.filter(this.#isValidThread.bind(this));

				// If no valid threads, create default
				if (this.#threads.length === 0) {
					const thread = this.#createDefaultThread();
					this.#threads = [thread];
					this.#currentThreadId = thread.id;
					this.save();
					this.#emitChange('init-defaults');
					return;
				}

				this.#currentThreadId = this.#threads[0].id;
				this.#emitChange('load');
			} else {
				// Invalid format or old schema version, create default thread
				const thread = this.#createDefaultThread();
				this.#threads = [thread];
				this.#currentThreadId = thread.id;
				this.save();
				this.#emitChange('init-defaults');
			}
		} catch (_err) {
			// Error loading, create default thread
			const thread = this.#createDefaultThread();
			this.#threads = [thread];
			this.#currentThreadId = thread.id;
			this.save();
			this.#emitChange('init-defaults');
		}
	}

	save() {
		try {
			const payload = {
				version: CURRENT_SCHEMA_VERSION,
				threads: this.#threads.map((thread) => ({
					...thread,
					messages: thread.messages.filter(
						(m) => m.message?.trim() || m.images?.length,
					),
				})),
			};
			localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(payload));
		} catch (err) {
			// Quota exceeded or other storage error
			console.error('Failed to save to localStorage:', err);
			// Emit error event for UI to handle
			this.dispatchEvent(
				new CustomEvent('storage:error', {
					detail: { error: err, operation: 'save' },
					bubbles: false,
					composed: false,
				}),
			);
		}
	}

	// ===== Submitted / Pending Thread Methods =====

	isCurrentThreadSubmitted() {
		const thread = this.getCurrentThread();
		return Boolean(thread && thread.submittedAt);
	}

	isCurrentThreadPending() {
		const thread = this.getCurrentThread();
		return Boolean(thread && thread.pendingAt && !thread.submittedAt);
	}

	markThreadPending(threadId) {
		const thread = this.#threads.find((t) => t.id === threadId);
		if (!thread) return;
		thread.pendingAt = new Date().toISOString();
		this.#scheduleSave();
		this.#emitChange('thread-pending', null, threadId);
	}

	clearThreadPending(threadId) {
		const thread = this.#threads.find((t) => t.id === threadId);
		if (!thread || !thread.pendingAt) return;
		delete thread.pendingAt;
		this.#scheduleSave();
		this.#emitChange('thread-pending', null, threadId);
	}

	listPendingThreads() {
		return this.#threads.filter((t) => t.pendingAt && !t.submittedAt);
	}

	setThreadBackendId(threadId, backendId) {
		const thread = this.#threads.find((t) => t.id === threadId);
		if (!thread) return;
		thread.backendId = backendId;
		this.#scheduleSave();
	}

	markThreadSubmitted(threadId) {
		const thread = this.#threads.find((t) => t.id === threadId);
		if (!thread) return;
		thread.submittedAt = new Date().toISOString();
		delete thread.pendingAt;
		this.#scheduleSave();
		this.#emitChange('thread-submitted', null, threadId);
	}

	// ===== Thread Management Methods =====

	createThread() {
		const thread = {
			id: this.#generateId(),
			name: undefined, // No custom name initially
			messages: this.#withIdsAndTimestamps(DEFAULT_MESSAGES),
			participants: JSON.parse(JSON.stringify(DEFAULT_PARTICIPANTS)),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		this.#threads.push(thread);
		this.#scheduleSave();
		this.#emitChange('thread-created', null, thread.id);
		return thread;
	}

	duplicateThread(threadId) {
		const original = this.#threads.find((t) => t.id === threadId);
		if (!original) return null;

		const copy = {
			id: this.#generateId(),
			name: `${this.getThreadDisplayName(original)} (Copy)`,
			messages: JSON.parse(JSON.stringify(original.messages)), // Deep clone
			participants: JSON.parse(JSON.stringify(original.participants || [])),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			// Duplicated threads are always editable — never copy submittedAt or pendingAt
			submittedAt: undefined,
			pendingAt: undefined,
		};
		this.#threads.push(copy);
		this.#scheduleSave();
		this.#emitChange('thread-created', null, copy.id);
		return copy;
	}

	deleteThread(threadId) {
		const idx = this.#threads.findIndex((t) => t.id === threadId);
		if (idx === -1) return false;

		this.#threads.splice(idx, 1);

		// If no threads remain, create a new default thread
		if (this.#threads.length === 0) {
			const newThread = this.#createDefaultThread();
			this.#threads.push(newThread);
			this.#currentThreadId = newThread.id;
		} else if (this.#currentThreadId === threadId) {
			// If we deleted the current thread, switch to another
			this.#currentThreadId = this.#threads[0].id;
		}

		this.#scheduleSave();
		this.#emitChange('thread-deleted', null, threadId);
		return true;
	}

	loadThread(threadId) {
		const thread = this.#threads.find((t) => t.id === threadId);
		if (!thread) {
			// Thread doesn't exist, try to load first available thread
			if (this.#threads.length > 0) {
				this.#currentThreadId = this.#threads[0].id;
				this.#emitChange('thread-changed', null, this.#currentThreadId);
				return this.#threads[0];
			}
			// No threads at all, create a default one
			const newThread = this.createThread();
			this.#currentThreadId = newThread.id;
			this.#emitChange('thread-changed', null, this.#currentThreadId);
			return newThread;
		}

		this.#currentThreadId = threadId;
		this.#emitChange('thread-changed', null, threadId);
		return thread;
	}

	listThreads() {
		// Return sorted by updatedAt descending (most recent first)
		return this.#threads
			.slice()
			.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
	}

	getCurrentThread() {
		if (!this.#currentThreadId) return null;
		return this.#threads.find((t) => t.id === this.#currentThreadId) || null;
	}

	updateThreadName(threadId, name) {
		const thread = this.#threads.find((t) => t.id === threadId);
		if (!thread) return;
		if (thread.submittedAt) return;

		const trimmedName = String(name ?? '').trim();
		thread.name = trimmedName.length > 0 ? trimmedName : undefined;
		thread.updatedAt = new Date().toISOString();
		this.#scheduleSave();
		this.#emitChange('thread-updated', null, threadId);
	}

	getThreadDisplayName(thread) {
		return getThreadDisplayName(thread);
	}

	// ===== Message Methods (operate on current thread) =====

	getMessages() {
		const thread = this.getCurrentThread();
		if (!thread) return [];
		return thread.messages.slice();
	}

	addMessage(afterId) {
		const thread = this.getCurrentThread();
		if (!thread) return null;
		if (thread.submittedAt) return null;

		const msg = {
			id: this.#generateId(),
			sender: 'self',
			message: '',
			timestamp: new Date().toISOString(),
		};

		if (!afterId) {
			thread.messages.push(msg);
		} else {
			const idx = thread.messages.findIndex((m) => m.id === afterId);
			if (idx === -1) thread.messages.push(msg);
			else thread.messages.splice(idx + 1, 0, msg);
		}

		thread.updatedAt = new Date().toISOString();
		this.#scheduleSave();
		this.#emitChange('add', msg);
		return msg;
	}

	updateMessage(id, patch) {
		const thread = this.getCurrentThread();
		if (!thread) return;
		if (thread.submittedAt) return;

		const idx = thread.messages.findIndex((m) => m.id === id);
		if (idx === -1) return;

		thread.messages[idx] = { ...thread.messages[idx], ...patch };
		thread.updatedAt = new Date().toISOString();
		this.#scheduleSave();
		this.#emitChange('update', thread.messages[idx]);
	}

	deleteMessage(id) {
		const thread = this.getCurrentThread();
		if (!thread) return;
		if (thread.submittedAt) return;
		if (thread.messages.length <= 1) return;

		const idx = thread.messages.findIndex((m) => m.id === id);
		if (idx === -1) return;

		const removed = thread.messages.splice(idx, 1)[0];
		thread.updatedAt = new Date().toISOString();
		this.#scheduleSave();
		this.#emitChange('delete', removed);
	}

	insertImage(id, dataUrl) {
		if (!dataUrl) return;
		const thread = this.getCurrentThread();
		if (!thread) return;
		if (thread.submittedAt) return;

		const idx = thread.messages.findIndex((m) => m.id === id);
		if (idx === -1) return;

		const msg = thread.messages[idx];
		const images = Array.isArray(msg.images) ? msg.images.slice() : [];
		images.push({ id: this.#generateId(), src: dataUrl });
		thread.messages[idx] = { ...msg, images };
		thread.updatedAt = new Date().toISOString();
		this.#scheduleSave();
		this.#emitChange('update', thread.messages[idx]);
	}

	// ===== Recipient Methods (shim over participants[0] for 2-party threads) =====

	getRecipient() {
		const thread = this.getCurrentThread();
		const p = thread?.participants?.[0];
		return { name: p?.full_name || '', location: p?.location || '' };
	}

	updateRecipient(patch) {
		if (!patch || typeof patch !== 'object') return;
		const thread = this.getCurrentThread();
		if (!thread) return;
		if (thread.submittedAt) return;

		const participants = thread.participants || [];
		const p = participants[0] || {
			id: 'p1',
			full_name: '',
			location: '',
			avatar_url: null,
		};
		const next = { ...p };

		if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
			next.full_name = String(patch.name ?? '').trim();
		}
		if (Object.prototype.hasOwnProperty.call(patch, 'location')) {
			next.location = String(patch.location ?? '').trim();
		}

		if (next.full_name === p.full_name && next.location === p.location) return;

		thread.participants = [next, ...participants.slice(1)];
		thread.updatedAt = new Date().toISOString();
		this.#scheduleSave();
		this.#emitChange('recipient');
	}

	// ===== Clear (clears current thread messages) =====

	clear() {
		const thread = this.getCurrentThread();
		if (!thread) return;
		if (thread.submittedAt) return;

		thread.messages = this.#withIdsAndTimestamps(DEFAULT_MESSAGES);
		thread.participants = JSON.parse(JSON.stringify(DEFAULT_PARTICIPANTS));
		thread.updatedAt = new Date().toISOString();
		this.#scheduleSave();
		this.#emitChange('clear');
	}

	// ===== Export/Import (current thread only) =====

	exportJson(pretty = true) {
		const thread = this.getCurrentThread();
		if (!thread) return '{}';

		const payload = {
			version: CURRENT_SCHEMA_VERSION,
			messages: thread.messages,
			participants: thread.participants || [],
		};
		return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
	}

	importJson(json) {
		let parsed;
		try {
			parsed = typeof json === 'string' ? JSON.parse(json) : json;
		} catch (_e) {
			return console.error('Invalid JSON');
		}

		// Support new participants format and old recipient format (backwards compat)
		let importedParticipants = null;
		if (parsed && typeof parsed === 'object') {
			if (Array.isArray(parsed.participants)) {
				importedParticipants = parsed.participants;
			} else if (parsed.recipient && typeof parsed.recipient === 'object') {
				importedParticipants = [
					{
						id: 'p1',
						full_name: String(parsed.recipient.name || '').trim(),
						location: String(parsed.recipient.location || '').trim(),
						avatar_url: null,
					},
				];
			}
		}

		let imported = Array.isArray(parsed)
			? parsed
			: parsed && Array.isArray(parsed.messages)
				? parsed.messages
				: null;

		if (!imported) {
			return console.error('Invalid format');
		}

		imported = imported
			.map((m) => {
				if (m && typeof m.timestamp === 'number') {
					return { ...m, timestamp: new Date(m.timestamp).toISOString() };
				}
				return m;
			})
			.filter(this.#isValidMessage.bind(this));

		this.#ensureMessageIds(imported);
		this.#ensureMessageTimestamps(imported);

		// Create a new thread for the imported data
		const newThread = this.createThread();
		newThread.messages = imported;

		if (importedParticipants && importedParticipants.length > 0) {
			const p = importedParticipants[0];
			const next = { ...newThread.participants[0] };
			if (typeof p.full_name === 'string') next.full_name = p.full_name.trim();
			if (typeof p.location === 'string') next.location = p.location.trim();
			if (p.avatar_url !== undefined) next.avatar_url = p.avatar_url;
			newThread.participants = [next, ...importedParticipants.slice(1)];
		}

		newThread.updatedAt = new Date().toISOString();

		// Make the new thread active
		this.loadThread(newThread.id);

		this.#scheduleSave();
		this.#emitChange('import');

		return newThread;
	}

	// ===== Import from Backend (for resubmit flow) =====

	importFromBackend(backendThread) {
		// If a local thread already exists for this backend ID, update it in place
		const existing = this.#threads.find(
			(t) => t.backendId === backendThread.id,
		);
		const thread = existing || this.createThread();
		thread.backendId = backendThread.id;

		// The thread is being returned for editing (changes requested) —
		// clear any locked state so the user can edit and resubmit it.
		delete thread.submittedAt;
		delete thread.pendingAt;

		// Populate messages with local IDs/timestamps
		const messages = (backendThread.messages || []).map((m, i) => ({
			id: this.#generateId(),
			sender: m.sender,
			message: m.message,
			timestamp: m.timestamp || new Date(Date.now() + i * 1000).toISOString(),
		}));
		thread.messages = messages;

		// Populate participants
		if (
			Array.isArray(backendThread.participants) &&
			backendThread.participants.length > 0
		) {
			thread.participants = backendThread.participants;
		} else {
			thread.participants = JSON.parse(JSON.stringify(DEFAULT_PARTICIPANTS));
		}

		// Populate name
		if (backendThread.name) {
			thread.name = backendThread.name;
		}

		// Extract admin notes from changes_requested events
		const changesEvents = (backendThread.events || []).filter(
			(e) => e.type === 'changes_requested' && e.notes,
		);
		if (changesEvents.length > 0) {
			thread.adminNotes = [changesEvents[0].notes];
		}

		thread.updatedAt = new Date().toISOString();

		// Save (caller is responsible for loading/activating the thread)
		this.#scheduleSave();
		this.#emitChange('import');

		return thread;
	}

	// ===== Private Methods =====

	#createDefaultThread() {
		return {
			id: this.#generateId(),
			name: undefined,
			messages: this.#withIdsAndTimestamps(WELCOME_MESSAGES),
			participants: JSON.parse(JSON.stringify(WELCOME_PARTICIPANTS)),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
	}

	#scheduleSave() {
		if (this.#saveDebounceId) cancelAnimationFrame(this.#saveDebounceId);
		this.#saveDebounceId = requestAnimationFrame(() => {
			this.save();
			this.#saveDebounceId = null;
		});
	}

	#emitChange(reason, message = null, threadId = null) {
		const thread = this.getCurrentThread();
		const p = thread?.participants?.[0];
		this.dispatchEvent(
			new CustomEvent('messages:changed', {
				detail: {
					reason,
					message,
					messages: thread ? thread.messages.slice() : [],
					recipient: {
						name: p?.full_name || '',
						location: p?.location || '',
					},
					threadId: threadId || this.#currentThreadId,
				},
				bubbles: false,
				composed: false,
			}),
		);
	}

	#generateId() {
		try {
			if (
				typeof window !== 'undefined' &&
				window.crypto &&
				typeof window.crypto.randomUUID === 'function'
			) {
				return window.crypto.randomUUID();
			}
		} catch (_e) {}
		return (
			'id_' +
			Date.now().toString(36) +
			'_' +
			Math.random().toString(36).slice(2, 10)
		);
	}

	#withIdsAndTimestamps(arr) {
		const now = Date.now();
		return arr.map((m, i) => ({
			id: this.#generateId(),
			sender: m.sender === 'self' || m.sender === 'other' ? m.sender : 'self',
			message: typeof m.message === 'string' ? m.message : '',
			timestamp: new Date(now + i * 1000).toISOString(),
		}));
	}

	#isValidThread(thread) {
		if (!thread || typeof thread !== 'object') return false;
		if (typeof thread.id !== 'string' || thread.id.length === 0) return false;
		if (!Array.isArray(thread.messages)) return false;
		if (!Array.isArray(thread.participants)) return false;
		if (typeof thread.createdAt !== 'string') return false;
		if (typeof thread.updatedAt !== 'string') return false;
		return true;
	}

	#isValidMessage(item) {
		if (!item || typeof item !== 'object') return false;
		const { message, sender } = item;
		if (typeof message !== 'string') return false;
		if (sender !== 'self' && sender !== 'other') return false;
		if (Object.prototype.hasOwnProperty.call(item, 'timestamp')) {
			const t = item.timestamp;
			if (!(typeof t === 'string' || typeof t === 'number')) return false;
		}
		if (Object.prototype.hasOwnProperty.call(item, 'id')) {
			if (typeof item.id !== 'string' || item.id.length === 0) return false;
		}
		if (Object.prototype.hasOwnProperty.call(item, 'images')) {
			if (!Array.isArray(item.images)) return false;
		}
		return true;
	}

	#ensureMessageIds(messages) {
		let changed = false;
		for (let i = 0; i < messages.length; i++) {
			const m = messages[i];
			if (m && (m.id === undefined || m.id === null || m.id === '')) {
				m.id = this.#generateId();
				changed = true;
			}
		}
		return changed;
	}

	#ensureMessageTimestamps(messages) {
		let changed = false;
		const base = Date.now();
		for (let i = 0; i < messages.length; i++) {
			const m = messages[i];
			if (!m || typeof m !== 'object') continue;
			if (!Object.prototype.hasOwnProperty.call(m, 'timestamp')) {
				m.timestamp = new Date(base + i * 1000).toISOString();
				changed = true;
				continue;
			}
			if (
				m.timestamp === undefined ||
				m.timestamp === null ||
				m.timestamp === ''
			) {
				m.timestamp = new Date(base + i * 1000).toISOString();
				changed = true;
			}
		}
		return changed;
	}
}

const store = new ThreadStore();
export { store, ThreadStore, THREADS_STORAGE_KEY, CURRENT_SCHEMA_VERSION };
