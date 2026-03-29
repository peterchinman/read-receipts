// Landing Page Component
// List of published pieces styled as a thread list

import { html } from '../utils/template.js';
import { apiClient } from '../utils/api-client.js';
import { router } from '../utils/router.js';
import './thread-list.js';
import type {
	NavigateDetail,
	ThreadListSelectDetail,
} from '../types/events.js';
import type { Piece } from '../types/index.js';
import { createDrawer, dialogTitleStyle } from '../utils/dialog.js';

const READ_PIECES_KEY = 'message-simulator:read-pieces';

interface ThreadListElement extends HTMLElement {
	refs: { newThreadBtn?: HTMLElement | null };
	setEmptyState(message: string, sub: string): void;
	setThreads(items: unknown[]): void;
	setActiveId(id: string | number | null): void;
}

class PieceList extends HTMLElement {
	#shadow: ShadowRoot;
	#pieces: Piece[] = [];
	#loading = true;
	#error: string | null = null;
	#display: ThreadListElement | null = null;
	#readIds = new Set<string>();

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
		this.#display = this.#shadow.querySelector(
			'thread-list',
		) as ThreadListElement | null;
		this.#display?.addEventListener('thread-list:select', this._onSelect);
		this.#display?.refs?.newThreadBtn?.addEventListener(
			'click',
			this._onCompose,
		);
		this.#shadow.addEventListener(
			'navigate',
			this._onNavigate as EventListener,
		);
		this.#renderList();
		this.#loadPieces();
	}

	disconnectedCallback() {
		this.#display?.removeEventListener('thread-list:select', this._onSelect);
		this.#shadow.removeEventListener(
			'navigate',
			this._onNavigate as EventListener,
		);
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
			</style>
			<thread-list
				header-title="Read Receipts"
				show-header
				show-unread
				show-info-button
				show-create
			></thread-list>
		`;
	}

	#showInfoDrawer() {
		const { drawer } = createDrawer({ container: this.#shadow });

		const titleEl = document.createElement('div');
		titleEl.style.cssText = dialogTitleStyle;
		titleEl.textContent = 'Read Receipts';
		drawer.appendChild(titleEl);

		const linkStyle = 'color: var(--color-primary, #007aff);';
		const paraStyle =
			'font: 0.9rem system-ui; color: var(--color-ink); line-height: 1.6; margin: 8px 0;';

		const desc = document.createElement('p');
		desc.style.cssText = paraStyle;
		desc.textContent = 'A distance simulator.';
		drawer.appendChild(desc);

		const byLine = document.createElement('p');
		byLine.style.cssText = paraStyle;
		byLine.appendChild(document.createTextNode('Made by '));
		const authorLink = document.createElement('a');
		authorLink.href = 'https://peterchinman.com';
		authorLink.target = '_blank';
		authorLink.rel = 'noopener noreferrer';
		authorLink.style.cssText = linkStyle;
		authorLink.textContent = 'Peter Chinman';
		byLine.appendChild(authorLink);
		byLine.appendChild(document.createTextNode('.'));
		drawer.appendChild(byLine);

		const githubLine = document.createElement('p');
		githubLine.style.cssText = paraStyle;
		githubLine.appendChild(document.createTextNode('View this project '));
		const githubLink = document.createElement('a');
		githubLink.href = 'https://github.com/peterchinman/message-simulator';
		githubLink.target = '_blank';
		githubLink.rel = 'noopener noreferrer';
		githubLink.style.cssText = linkStyle;
		githubLink.textContent = 'on Github';
		githubLine.appendChild(githubLink);
		githubLine.appendChild(
			document.createTextNode(
				'. If you find any bugs, or have any feature requests, please report them there.',
			),
		);
		drawer.appendChild(githubLine);
	}

	_onNavigate(e: CustomEvent<NavigateDetail>) {
		const { action } = e.detail;
		if (action === 'info') {
			this.#showInfoDrawer();
		}
	}

	#loadReadIds() {
		try {
			const stored = localStorage.getItem(READ_PIECES_KEY);
			return stored
				? new Set<string>(JSON.parse(stored).map(String))
				: new Set<string>();
		} catch {
			return new Set<string>();
		}
	}

	#markPieceRead(pieceId: string | number) {
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
			this.#error = (error as Error).message || 'Failed to load pieces';
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

	#getPreviewText(piece: Piece) {
		if (!piece.messages || piece.messages.length === 0) {
			return 'No messages';
		}
		const lastMsg = piece.messages[piece.messages.length - 1];
		if (lastMsg.message) return lastMsg.message;
		return 'No messages';
	}

	#formatTime(timestamp: string | null | undefined) {
		if (!timestamp) return '';

		const date = new Date(timestamp);
		if (Number.isNaN(date.getTime())) return '';

		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
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

	_onSelect(e: CustomEvent<ThreadListSelectDetail>) {
		const { id } = e.detail;
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

customElements.define('piece-list', PieceList);

declare global {
	interface HTMLElementTagNameMap {
		'piece-list': PieceList;
	}
}

export { PieceList as PieceList };
