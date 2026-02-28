import { html } from '../utils/template.js';
import { MQ } from '../utils/breakpoints.js';
import { SWIPE_CSS } from '../utils/swipe-gesture.js';
import { composeSvg } from './icons/compose-svg.js';
import { dotsThreeCircleSvg } from './icons/dots-three-circle-svg.js';
import { copySvg } from './icons/copy-svg.js';
import { trashSvg } from './icons/trash-svg.js';
import { infoSvg } from './icons/info-svg.js';
import './icon-arrow.js';
import { HIDE_SCROLLBAR_CSS } from '../utils/scrollbar.js';

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
			'show-unread',
			'show-info-button',
			'nav-text',
			'nav-action',
		];
	}

	connectedCallback() {
		this.$.threadsContainer?.addEventListener('click', this._onRowClick);
		this.$.threadsContainer?.addEventListener('keydown', this._onRowKeyDown);
		this.#syncAttributes();
		this.#applyNavConfig();
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
			case 'nav-text':
			case 'nav-action':
				this.#applyNavConfig();
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

	#applyNavConfig() {
		const navArrow = this.$?.navArrow;
		if (!navArrow) return;
		const text = this.getAttribute('nav-text') || '';
		const action = this.getAttribute('nav-action') || '';
		if (text) navArrow.setAttribute('text', text);
		else navArrow.removeAttribute('text');
		if (action) navArrow.setAttribute('action', action);
		else navArrow.removeAttribute('action');
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
					color: var(--color-ink);
					text-align: center;
					grid-column: 2;
				}
				.header-left {
					grid-column: 1;
					display: flex;
					align-items: center;
				}
				.info-btn {
					display: none;
					padding: 0;
					width: 32px;
					height: 32px;
					border: none;
					background: transparent;
					color: var(--color-bubble-self);
					cursor: pointer;
					align-items: center;
					justify-content: center;
					border-radius: 50%;
					transition: background 0.15s;
				}
				.info-btn svg {
					width: 20px;
					height: 20px;
					fill: currentColor;
				}
				.info-btn:hover {
					background: var(--color-menu);
				}
				.info-btn:active {
					opacity: 0.6;
				}
				:host([show-info-button]) .info-btn {
					display: flex;
				}
				.nav-arrow {
					display: none;
				}
				:host([nav-text]) .nav-arrow {
					display: block;
				}
				.header-right {
					grid-column: 3;
					justify-self: end;
					display: flex;
					align-items: center;
					gap: 1rem;
				}
				.new-thread-btn {
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
				.new-thread-btn svg {
					width: 20px;
					height: 20px;
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
				.menu-btn {
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
				.menu-btn svg {
					width: 22px;
					height: 22px;
				}
				.menu-btn:hover {
					background: var(--color-menu);
				}
				.menu-btn:active {
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
					@media ${MQ.tablet} {
						background: var(--color-bubble-other);
					}
				}
				:host([show-unread]) .thread-row {
					grid-template-columns: 10px 48px 1fr;
				}
				.unread-indicator {
					display: none;
					width: 8px;
					height: 8px;
					border-radius: 50%;
					background: var(--color-bubble-self);
					align-self: center;
					justify-self: center;
				}
				:host([show-unread]) .unread-indicator {
					display: block;
				}
				:host([show-unread]) .unread-indicator.read {
					visibility: hidden;
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
					flex: 1;
					min-width: 0;
				}
				.thread-time {
					font: 11px system-ui;
					color: var(--color-ink-subdued);
					white-space: nowrap;
					flex-shrink: 0;
					width: 7ch;
					text-align: right;
				}
				.submitted-badge {
					font: 600 10px system-ui;
					color: white;
					background: var(--color-status-green);
					border-radius: 9px;
					padding: 2px 7px;
					white-space: nowrap;
					flex-shrink: 0;
				}
				.pending-badge {
					font: 600 10px system-ui;
					color: white;
					background: var(--color-status-red);
					border-radius: 9px;
					padding: 2px 7px;
					white-space: nowrap;
					flex-shrink: 0;
				}
				.changes-requested-badge {
					font: 600 10px system-ui;
					color: white;
					background: var(--color-primary);
					border-radius: 9px;
					padding: 2px 7px;
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

				${SWIPE_CSS}
				${HIDE_SCROLLBAR_CSS}
			</style>
			<div class="wrapper">
				<div class="thread-list-header">
					<div class="header-left">
						<icon-arrow class="nav-arrow"></icon-arrow>
						<button class="info-btn" id="info-btn" aria-label="About">
							${infoSvg()}
						</button>
					</div>
					<div class="header-title" id="header-title">Messages</div>
					<div class="header-right">
						<button class="menu-btn" id="menu-btn" title="More options">
							${dotsThreeCircleSvg()}
						</button>
						<button class="new-thread-btn" id="new-thread" title="New thread">
							${composeSvg()}
						</button>
					</div>
				</div>
				<div class="threads-list hide-scrollbar" id="threads-container">
					<!-- Thread rows will be rendered here -->
				</div>
			</div>
		`;

		this.$ = {
			headerTitle: this.shadowRoot.getElementById('header-title'),
			threadsContainer: this.shadowRoot.getElementById('threads-container'),
			newThreadBtn: this.shadowRoot.getElementById('new-thread'),
			menuBtn: this.shadowRoot.getElementById('menu-btn'),
			infoBtn: this.shadowRoot.getElementById('info-btn'),
			navArrow: this.shadowRoot.querySelector('.nav-arrow'),
		};

		this.$.infoBtn?.addEventListener('click', () => {
			this.dispatchEvent(
				new CustomEvent('navigate', {
					detail: { action: 'info' },
					bubbles: true,
					composed: true,
				}),
			);
		});
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
		const submitted = thread.submitted || false;
		const pending = thread.pending || false;
		const changesRequested = thread.changesRequested || false;

		row.setAttribute(
			'aria-label',
			`Thread with ${name}${preview ? `, last message: ${preview}` : ''}${submitted ? ', submitted' : pending ? ', pending submission' : changesRequested ? ', edits requested' : ''}`,
		);

		const badgeHtml = submitted
			? '<span class="submitted-badge">Submitted</span>'
			: pending
				? '<span class="pending-badge">Pending</span>'
				: changesRequested
					? '<span class="changes-requested-badge">Edits Req\'d</span>'
					: '';

		const unread = thread.unread ?? false;

		row.innerHTML = html`
			<div
				class="unread-indicator ${unread ? '' : 'read'}"
				aria-hidden="true"
			></div>
			<div class="avatar" aria-hidden="true">${initials}</div>
			<div class="thread-content">
				<div class="thread-header">
					<div class="thread-name">${this.#escapeHtml(name)}</div>
					${badgeHtml}
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
			<button
				class="action-button copy"
				data-action="copy"
				data-thread-id="${threadId}"
			>
				${copySvg()}
				<span>Copy</span>
			</button>
			<button
				class="action-button delete"
				data-action="delete"
				data-thread-id="${threadId}"
			>
				${trashSvg()}
				<span>Delete</span>
			</button>
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

customElements.define('thread-list', ThreadListDisplay);
export { ThreadListDisplay };
