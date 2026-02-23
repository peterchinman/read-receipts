// Landing Page Component
// List of published pieces styled as a thread list

import { html } from '../utils/template.js';
import { apiClient } from '../utils/api-client.js';
import { router } from '../utils/router.js';
import { config } from '../utils/config.js';
import './thread-list-display.js';

const READ_PIECES_KEY = 'message-simulator:read-pieces';

class LandingPage extends HTMLElement {
	#shadow;
	#pieces = [];
	#loading = true;
	#error = null;
	#display = null;
	#readIds = new Set();

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
		this._onSelect = this._onSelect.bind(this);
	}

	connectedCallback() {
		this.#readIds = this.#loadReadIds();

		this.#shadow.innerHTML = html`
			<style>
				:host {
					display: block;
					height: 100%;
					max-height: 100%;
					min-height: 0;
					overflow: hidden;
				}
			</style>
			<thread-list-display
				header-title="Messages"
				show-header
				show-unread
			></thread-list-display>
		`;

		this.#display = this.#shadow.querySelector('thread-list-display');
		this.#display?.addEventListener('thread-list:select', this._onSelect);
		this.#renderList();
		this.#loadPieces();
	}

	disconnectedCallback() {
		this.#display?.removeEventListener('thread-list:select', this._onSelect);
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
			const preview = this.#getPreviewText(piece);
			const author = piece.author?.name ? String(piece.author.name) : '';
			const previewText = author ? `${author} - ${preview}` : preview;
			return {
				id: piece.id,
				name: piece.name || 'Untitled',
				recipientName: piece.recipient_name || author || '',
				preview: previewText,
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
		const firstMessages = piece.messages.slice(0, 3);
		return firstMessages
			.map((m) => m.message || '')
			.join(' ')
			.trim();
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
			router.navigate(`/piece/${id}`);
		}
	}
}

customElements.define('landing-page', LandingPage);
export { LandingPage };
