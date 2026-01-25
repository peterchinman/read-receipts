import { html } from '../utils/template.js';

/**
 * @typedef {Object} ThreadListItem
 * @property {string} id
 * @property {string} name
 * @property {string} [recipientName]
 * @property {string} [preview]
 * @property {string} [time]
 */

class ThreadListDisplay extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._threads = [];
		this._activeId = null;
		this._headerTitle = 'Messages';
		this._emptyTitle = 'No threads yet';
		this._emptySubtitle = 'Click + to create one';
		this.$ = {};
		this._onRowClick = this._onRowClick.bind(this);
		this._onRowKeyDown = this._onRowKeyDown.bind(this);

		this.#renderShell();
	}

	static get observedAttributes() {
		return [
			'header-title',
			'empty-title',
			'empty-subtitle',
			'show-actions',
			'show-create',
			'show-header',
		];
	}

	connectedCallback() {
		this.$.threadsContainer?.addEventListener('click', this._onRowClick);
		this.$.threadsContainer?.addEventListener('keydown', this._onRowKeyDown);
		this.#syncAttributes();
		this.#renderHeader();
		this.#renderList();
	}

	disconnectedCallback() {
		this.$.threadsContainer?.removeEventListener('click', this._onRowClick);
		this.$.threadsContainer?.removeEventListener('keydown', this._onRowKeyDown);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		switch (name) {
			case 'header-title':
				this._headerTitle = newValue || 'Messages';
				this.#renderHeader();
				break;
			case 'empty-title':
				this._emptyTitle = newValue || '';
				this.#renderList();
				break;
			case 'empty-subtitle':
				this._emptySubtitle = newValue || '';
				this.#renderList();
				break;
			case 'show-actions':
				this.#renderList();
				break;
			case 'show-create':
			case 'show-header':
				this.#renderHeader();
				break;
			default:
				break;
		}
	}

	get refs() {
		return this.$;
	}

	setThreads(threads) {
		this._threads = Array.isArray(threads) ? threads : [];
		this.#renderList();
	}

	setActiveId(id) {
		this._activeId = id || null;
		this.#renderList();
	}

	setHeaderTitle(title) {
		this._headerTitle = title || 'Messages';
		this.#renderHeader();
	}

	setEmptyState(title, subtitle = '') {
		this._emptyTitle = title || '';
		this._emptySubtitle = subtitle || '';
		this.#renderList();
	}

	#syncAttributes() {
		if (this.hasAttribute('header-title')) {
			this._headerTitle = this.getAttribute('header-title') || 'Messages';
		}
		if (this.hasAttribute('empty-title')) {
			this._emptyTitle = this.getAttribute('empty-title') || '';
		}
		if (this.hasAttribute('empty-subtitle')) {
			this._emptySubtitle = this.getAttribute('empty-subtitle') || '';
		}
	}

	#renderShell() {
		this.shadowRoot.innerHTML = html`
			<style>
				*,
				*::before,
				*::after {
					box-sizing: border-box;
				}
				:host {
					box-sizing: border-box;
					display: block;
					height: 100%;
				}
				.wrapper {
					display: flex;
					flex-direction: column;
					height: 100%;
					background: var(--color-page);
				}
				.thread-list-header {
					display: grid;
					grid-template-columns: 1fr auto 1fr;
					align-items: center;
					padding-inline: var(--padding-inline);
					padding-block: 1rem;
					background: var(--color-header);
					border-bottom: 1px solid var(--color-edge);
					-webkit-backdrop-filter: var(--backdrop-filter);
					backdrop-filter: var(--backdrop-filter);
					user-select: none;
					z-index: 4;
				}
				:host(:not([show-header])) .thread-list-header {
					display: none;
				}
				.header-title {
					font: 600 18px system-ui;
					color: var(--color-ink);
					text-align: center;
					grid-column: 2;
				}
				.header-left {
					grid-column: 1;
				}
				.header-right {
					grid-column: 3;
					justify-self: end;
					display: flex;
					align-items: center;
					gap: 0.25rem;
				}
				.new-thread-btn {
					font: 28px system-ui;
					padding: 0;
					width: 32px;
					height: 32px;
					border: none;
					background: transparent;
					color: var(--color-bubble-self);
					cursor: pointer;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 50%;
					transition: background 0.15s;
				}
				:host(:not([show-create])) .new-thread-btn {
					display: none;
				}
				.new-thread-btn:hover {
					background: var(--color-menu);
				}
				.new-thread-btn:active {
					opacity: 0.6;
				}
				.threads-list {
					flex: 1;
					overflow-y: auto;
					overflow-x: hidden;
					min-height: 0;
				}
				.thread-row {
					--row-padding-block: 12px;
					--name-row-height: 18px;
					--preview-line-height: 1.3;
					--preview-font-size: 12px;
					--preview-lines: 2;
					--gap-between-rows: 4px;

					display: grid;
					grid-template-columns: 48px 1fr;
					gap: 12px;
					padding: var(--row-padding-block) var(--padding-inline);
					border-bottom: 1px solid var(--color-edge);
					cursor: pointer;
					user-select: none;
					transition: background 0.15s;
					outline: none;
					height: calc(
						var(--row-padding-block) * 2 + var(--name-row-height) +
							var(--gap-between-rows) + var(--preview-font-size) *
							var(--preview-line-height) * var(--preview-lines)
					);
				}

				.thread-row:focus-visible {
					outline: 2px solid var(--color-bubble-self);
					outline-offset: -2px;
				}
				.thread-row:hover {
					background: var(--color-menu);
				}
				.thread-row:active {
					background: var(--color-edge);
				}
				.thread-row.active {
					background: var(--color-bubble-other);
				}
				.avatar {
					width: 48px;
					height: 48px;
					border-radius: 50%;
					background: linear-gradient(
						135deg,
						var(--color-recipient-avatar-top) 0%,
						var(--color-recipient-avatar-bottom) 100%
					);
					display: flex;
					align-items: center;
					justify-content: center;
					font: 600 18px system-ui;
					color: white;
					flex-shrink: 0;
				}
				.thread-content {
					min-width: 0;
					display: flex;
					flex-direction: column;
					gap: var(--gap-between-rows);
					justify-content: center;
				}
				.thread-header {
					display: flex;
					justify-content: space-between;
					align-items: baseline;
					gap: 8px;
					height: var(--name-row-height);
				}
				.thread-name {
					font: 600 14px system-ui;
					color: var(--color-ink);
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.thread-time {
					font: 11px system-ui;
					color: var(--color-ink-subdued);
					white-space: nowrap;
					flex-shrink: 0;
				}
				.thread-preview {
					font-size: var(--preview-font-size);
					font-family: system-ui;
					color: var(--color-ink-subdued);
					display: -webkit-box;
					-webkit-line-clamp: var(--preview-lines);
					-webkit-box-orient: vertical;
					overflow: hidden;
					text-overflow: ellipsis;
					line-height: var(--preview-line-height);
				}
				.empty-state {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					height: 100%;
					padding: 2rem;
					text-align: center;
					color: var(--color-ink-subdued);
					gap: 1rem;
				}
				.empty-state-text {
					font: 14px system-ui;
				}

				/* Swipe gesture styles */
				.thread-row-wrapper {
					position: relative;
					display: grid;
					grid-template-rows: 1fr;
					transition: grid-template-rows 250ms ease;
					overflow: hidden;
				}
				.thread-row-wrapper.collapsing {
					grid-template-rows: 0fr;
				}
				.reveal-actions {
					position: absolute;
					top: 0;
					right: 0;
					height: 100%;
					display: flex;
					z-index: 1;
				}
				.action-button {
					width: 80px;
					display: flex;
					align-items: center;
					justify-content: center;
					cursor: pointer;
					transition: opacity 0.15s;
				}
				.action-button:active {
					opacity: 0.7;
				}
				.action-button.copy {
					background: #007aff;
				}
				.action-button.delete {
					background: #ff3b30;
				}
				.action-button svg {
					width: 24px;
					height: 24px;
					fill: white;
				}
				.swipe-content {
					position: relative;
					z-index: 2;
					background: var(--color-page);
					touch-action: pan-y;
					user-select: none;
					min-height: 0;
					overflow: hidden;
				}
				.thread-row-wrapper.removing .swipe-content {
					transition: transform 100ms ease-out;
				}
				.thread-row-wrapper.removing-left .swipe-content {
					transform: translateX(-100vw);
				}
				:host(:not([show-actions])) .reveal-actions {
					display: none;
				}
			</style>
			<div class="wrapper">
				<div class="thread-list-header">
					<div class="header-left"></div>
					<div class="header-title" id="header-title">Messages</div>
					<div class="header-right">
						<button class="new-thread-btn" id="new-thread" title="New thread">
							+
						</button>
					</div>
				</div>
				<div class="threads-list" id="threads-container">
					<!-- Thread rows will be rendered here -->
				</div>
			</div>
		`;

		this.$ = {
			headerTitle: this.shadowRoot.getElementById('header-title'),
			threadsContainer: this.shadowRoot.getElementById('threads-container'),
			newThreadBtn: this.shadowRoot.getElementById('new-thread'),
		};
	}

	#renderHeader() {
		if (this.$?.headerTitle) {
			this.$.headerTitle.textContent = this._headerTitle || 'Messages';
		}
	}

	#renderList() {
		const container = this.$.threadsContainer;
		if (!container) return;
		const threads = this._threads || [];
		container.innerHTML = '';

		if (threads.length === 0) {
			const empty = document.createElement('div');
			empty.className = 'empty-state';
			const title = document.createElement('div');
			title.className = 'empty-state-text';
			title.textContent = this._emptyTitle || '';
			empty.appendChild(title);
			if (this._emptySubtitle) {
				const subtitle = document.createElement('div');
				subtitle.className = 'empty-state-text';
				subtitle.textContent = this._emptySubtitle;
				empty.appendChild(subtitle);
			}
			container.appendChild(empty);
			return;
		}

		const showActions = this.hasAttribute('show-actions');

		for (const thread of threads) {
			const row = this.#createRow(thread);
			if (!row) continue;
			if (showActions) {
				const wrapper = this.#wrapRowWithActions(row, thread.id);
				container.appendChild(wrapper);
			} else {
				container.appendChild(row);
			}
		}
	}

	#createRow(thread) {
		if (!thread || !thread.id) return null;
		const row = document.createElement('div');
		row.className = 'thread-row';
		row.setAttribute('role', 'button');
		row.setAttribute('tabindex', '0');
		row.dataset.threadId = thread.id;

		if (this._activeId && thread.id === this._activeId) {
			row.classList.add('active');
			row.setAttribute('aria-current', 'true');
		}

		const name = thread.name || 'Untitled';
		const recipientName = thread.recipientName || name;
		const initials = this.#getInitials(recipientName);
		const preview = thread.preview || '';
		const time = thread.time || '';

		row.setAttribute(
			'aria-label',
			`Thread with ${name}${preview ? `, last message: ${preview}` : ''}`,
		);

		row.innerHTML = html`
			<div class="avatar" aria-hidden="true">${initials}</div>
			<div class="thread-content">
				<div class="thread-header">
					<div class="thread-name">${this.#escapeHtml(name)}</div>
					<div class="thread-time">${this.#escapeHtml(time)}</div>
				</div>
				<div class="thread-preview">${this.#escapeHtml(preview)}</div>
			</div>
		`;

		return row;
	}

	#wrapRowWithActions(row, threadId) {
		const wrapper = document.createElement('div');
		wrapper.className = 'thread-row-wrapper';
		wrapper.dataset.threadId = threadId;

		const revealActions = document.createElement('div');
		revealActions.className = 'reveal-actions';
		revealActions.innerHTML = html`
			<div class="action-button copy" data-action="copy" data-thread-id="${threadId}">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
					<path
						d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"
					></path>
				</svg>
			</div>
			<div
				class="action-button delete"
				data-action="delete"
				data-thread-id="${threadId}"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
					<path
						d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
					></path>
				</svg>
			</div>
		`;

		const swipeContent = document.createElement('div');
		swipeContent.className = 'swipe-content';
		swipeContent.appendChild(row);

		wrapper.appendChild(revealActions);
		wrapper.appendChild(swipeContent);
		return wrapper;
	}

	_onRowClick(e) {
		const row = e.target.closest('.thread-row');
		if (!row) return;
		const threadId = row.dataset.threadId;
		if (threadId) this.#emitSelect(threadId);
	}

	_onRowKeyDown(e) {
		const row = e.target.closest('.thread-row');
		if (!row) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			const threadId = row.dataset.threadId;
			if (threadId) this.#emitSelect(threadId);
		}
	}

	#emitSelect(id) {
		this.dispatchEvent(
			new CustomEvent('thread-list:select', {
				detail: { id },
				bubbles: true,
				composed: true,
			}),
		);
	}

	#getInitials(name) {
		const str = String(name ?? '').trim();
		if (!str) return '?';

		const parts = str.split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '?';

		const first = Array.from(parts[0])[0] || '';
		const last =
			parts.length > 1 ? Array.from(parts[parts.length - 1])[0] || '' : '';
		return first + last || '?';
	}

	#escapeHtml(text) {
		if (!text) return '';
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
}

customElements.define('thread-list-display', ThreadListDisplay);
export { ThreadListDisplay };
