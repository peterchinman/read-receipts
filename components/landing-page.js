// Landing Page Component
// List of published pieces styled as a thread list

import { html } from '../utils/template.js';
import { apiClient } from '../utils/api-client.js';
import { router } from '../utils/router.js';
import { config } from '../utils/config.js';
import './thread-list.js';

const READ_PIECES_KEY = 'message-simulator:read-pieces';

class LandingPage extends HTMLElement {
	#shadow;
	#pieces = [];
	#loading = true;
	#error = null;
	#display = null;
	#readIds = new Set();
	#infoOpen = false;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
		this._onSelect = this._onSelect.bind(this);
		this._onNavigate = this._onNavigate.bind(this);
		this._onCompose = this._onCompose.bind(this);
	}

	connectedCallback() {
		this.#readIds = this.#loadReadIds();
		this.#renderShell();
		this.#display = this.#shadow.querySelector('thread-list');
		this.#display?.addEventListener('thread-list:select', this._onSelect);
		this.#display?.refs?.newThreadBtn?.addEventListener(
			'click',
			this._onCompose,
		);
		this.#shadow.addEventListener('navigate', this._onNavigate);
		this.#renderList();
		this.#loadPieces();
	}

	disconnectedCallback() {
		this.#display?.removeEventListener('thread-list:select', this._onSelect);
		this.#shadow.removeEventListener('navigate', this._onNavigate);
	}

	#renderShell() {
		this.#shadow.innerHTML = html`
			<style>
				:host {
					display: block;
					height: 100%;
					max-height: 100%;
					min-height: 0;
					overflow: hidden;
					position: relative;
				}

				.info-pane {
					position: absolute;
					inset: 0;
					z-index: 10;
					background: var(--color-page);
					display: flex;
					flex-direction: column;
					padding: 2rem 1.5rem;
					gap: 1rem;
					overflow-y: auto;
				}

				.info-pane-close {
					align-self: flex-end;
					background: none;
					border: none;
					cursor: pointer;
					font-size: 1.2rem;
					color: var(--color-ink-subdued);
					padding: 4px 8px;
				}

				.info-pane h2 {
					font-size: 1.4rem;
					margin: 0;
				}

				.info-pane p {
					margin: 0;
					line-height: 1.6;
					color: var(--color-ink-subdued);
				}

				.info-pane a {
					color: var(--color-bubble-self);
				}
			</style>
			<thread-list
				header-title="Read Receipts"
				show-header
				show-unread
				show-info-button
				show-create
			></thread-list>
			${this.#infoOpen ? this.#renderInfoPane() : ''}
		`;
	}

	#renderInfoPane() {
		return html`
			<div class="info-pane">
				<button class="info-pane-close" id="info-pane-close">✕</button>
				<h2>Read Receipts</h2>
				<p>A distance simulator.</p>
				<p>
					Made by
					<a href="https://peterchinman.com" target="_blank">Peter Chinman</a>.
				</p>
				<p>
					View this project
					<a
						href="https://github.com/peterchinman/message-simulator"
						target="_blank"
						>on Github</a
					>. If you find any bugs, or have any feature requests, please report
					them there.
				</p>
			</div>
		`;
	}

	_onNavigate(e) {
		const { action } = e.detail || {};
		if (action === 'info') {
			this.#infoOpen = true;
			this.#renderShell();
			this.#display = this.#shadow.querySelector('thread-list');
			this.#display?.addEventListener('thread-list:select', this._onSelect);
			this.#display?.refs?.newThreadBtn?.addEventListener(
				'click',
				this._onCompose,
			);
			this.#renderList();
			this.#shadow
				.getElementById('info-pane-close')
				?.addEventListener('click', () => {
					this.#infoOpen = false;
					this.#renderShell();
					this.#display = this.#shadow.querySelector('thread-list');
					this.#display?.addEventListener('thread-list:select', this._onSelect);
					this.#display?.refs?.newThreadBtn?.addEventListener(
						'click',
						this._onCompose,
					);
					this.#renderList();
				});
		}
	}

	#loadReadIds() {
		try {
			const stored = localStorage.getItem(READ_PIECES_KEY);
			return stored ? new Set(JSON.parse(stored).map(String)) : new Set();
		} catch {
			return new Set();
		}
	}

	#markPieceRead(pieceId) {
		const key = String(pieceId);
		if (!key || this.#readIds.has(key)) return;
		this.#readIds.add(key);
		try {
			localStorage.setItem(READ_PIECES_KEY, JSON.stringify([...this.#readIds]));
		} catch {
			// ignore
		}
	}

	async #loadPieces() {
		try {
			const response = await apiClient.getPublishedPieces();
			this.#pieces = response.data || [];
			this.#loading = false;
			this.#renderList();
		} catch (error) {
			this.#error = error.message || 'Failed to load pieces';
			this.#loading = false;
			this.#renderList();
		}
	}

	#renderList() {
		if (!this.#display) return;

		if (this.#loading) {
			return;
		}

		if (this.#error) {
			this.#display.setEmptyState(this.#error, '');
			this.#display.setThreads([]);
			return;
		}

		if (this.#pieces.length === 0) {
			this.#display.setEmptyState('No pieces published yet.', '');
			this.#display.setThreads([]);
			return;
		}

		const items = this.#pieces.map((piece) => {
			const author = piece.author?.name ? String(piece.author.name) : '';
			return {
				id: piece.id,
				name: piece.name || piece.participants?.[0]?.full_name || 'Untitled',
				recipientName: piece.participants?.[0]?.full_name || author || '',
				preview: this.#getPreviewText(piece),
				time: this.#formatTime(piece.published_at),
				unread: !this.#readIds.has(String(piece.id)),
			};
		});

		this.#display.setThreads(items);
		this.#display.setActiveId(null);
	}

	#getPreviewText(piece) {
		if (!piece.messages || piece.messages.length === 0) {
			return 'No messages';
		}
		const lastMsg = piece.messages[piece.messages.length - 1];
		if (lastMsg.message) return lastMsg.message;
		return 'No messages';
	}

	#formatTime(timestamp) {
		if (!timestamp) return '';

		const date = new Date(timestamp);
		if (Number.isNaN(date.getTime())) return '';

		const now = new Date();
		const diffMs = now - date;
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d ago`;

		const month = date.getMonth() + 1;
		const day = date.getDate();
		return `${month}/${day}`;
	}

	_onSelect(e) {
		const { id } = e.detail || {};
		if (id) {
			this.#markPieceRead(id);
			this.#renderList();
			const unreadCount = this.#pieces.filter(
				(p) => !this.#readIds.has(String(p.id)),
			).length;
			try {
				sessionStorage.setItem(
					'message-simulator:unread-count',
					String(unreadCount),
				);
			} catch {}
			router.navigate(`/piece/${id}`);
		}
	}

	_onCompose() {
		router.navigate('/create');
	}
}

customElements.define('landing-page', LandingPage);
export { LandingPage };
