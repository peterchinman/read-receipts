// Piece View Component
// Read-only view of a published piece

import { html } from '../utils/template.js';
import { apiClient } from '../utils/api-client.js';
import { router } from '../utils/router.js';
import './thread-view.js';
import { authState } from './auth-state.js';
import {
	createDrawer,
	dialogTitleStyle,
	dialogBodyStyle,
} from '../utils/dialog.js';
import type { NavigateDetail } from '../types/events.js';

interface ThreadViewElement extends HTMLElement {
	setRecipient(recipient: { name: string; location: string }): void;
	setMessages(messages: unknown[]): void;
}

interface PieceData {
	participants?: Array<{ full_name?: string; location?: string }>;
	messages?: unknown[];
	author_info?: {
		name?: string;
		link?: string;
		bio?: string;
	};
}

class PieceView extends HTMLElement {
	#shadow: ShadowRoot;
	#pieceId: string | null = null;
	#piece: PieceData | null = null;
	#loading = true;
	#error: string | null = null;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
		this._onNavigate = this._onNavigate.bind(this);
	}

	static get observedAttributes() {
		return ['piece-id'];
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (name === 'piece-id' && oldValue !== newValue) {
			this.#pieceId = newValue;
			this.#loadPiece();
		}
	}

	connectedCallback() {
		this.#pieceId = this.getAttribute('piece-id');
		this.#shadow.addEventListener(
			'navigate',
			this._onNavigate as EventListener,
		);
		this.#render();
		if (this.#pieceId) {
			this.#loadPiece();
		}
	}

	disconnectedCallback() {
		this.#shadow.removeEventListener(
			'navigate',
			this._onNavigate as EventListener,
		);
	}

	async #loadPiece() {
		if (!this.#pieceId) return;

		this.#loading = true;
		this.#error = null;
		this.#render();

		try {
			this.#piece = (await apiClient.getPublishedPiece(
				this.#pieceId,
			)) as PieceData;
			this.#loading = false;
			this.#render();
		} catch (error) {
			this.#error = (error as Error).message || 'Failed to load piece';
			this.#loading = false;
			this.#render();
		}
	}

	#render() {
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

				.loading,
				.error {
					text-align: center;
					padding: 40px;
					color: var(--color-ink-subdued, #666);
				}

				.error {
					color: #ff3b30;
				}
			</style>

			${this.#loading ? this.#renderLoading() : ''}
			${this.#error ? this.#renderError() : ''}
			${!this.#loading && !this.#error && this.#piece
				? this.#renderPiece()
				: ''}
		`;

		if (!this.#loading && !this.#error && this.#piece) {
			const display = this.#shadow.querySelector(
				'thread-view',
			) as ThreadViewElement | null;
			if (display) {
				display.setRecipient({
					name: this.#piece.participants?.[0]?.full_name || '',
					location: this.#piece.participants?.[0]?.location || '',
				});
				display.setMessages(this.#piece.messages ?? []);
			}
		}
	}

	#renderLoading() {
		return '';
	}

	#renderError() {
		return html`<div class="error">${this.#error}</div>`;
	}

	#renderPiece() {
		let navText = 'Back';
		try {
			const count = parseInt(
				sessionStorage.getItem('message-simulator:unread-count') || '0',
				10,
			);
			if (count > 0) navText = String(count);
		} catch {}
		return html`<thread-view
				show-back-button
				nav-text="${navText}"
				nav-action="back"
				show-right-info-button
			></thread-view>`;
	}

	_onNavigate(e: CustomEvent<NavigateDetail>) {
		const { action } = e.detail;
		if (action === 'back') {
			router.navigate('/');
		} else if (action === 'create') {
			router.navigate('/create');
		} else if (action === 'info') {
			this.#showAuthorInfoDialog();
		}
	}

	#showAuthorInfoDialog() {
		const info = this.#piece?.author_info;
		const { drawer } = createDrawer({ container: this.#shadow });

		const rowStyle = `
			display: flex;
			gap: .5rem;
			padding: .5rem 0;
			line-height: 1.4;
		`;
		const keyStyle = `
			flex: 0 0 32px;
			font: 600 0.8rem system-ui;
			text-transform: lowercase;
			color: var(--color-ink-subdued);
			padding-top: 1px;
		`;
		const valueStyle = `
			flex: 1;
			font: 0.9rem system-ui;
			color: var(--color-ink);
			word-break: break-word;
		`;

		const addRow = (key: string, valueEl: Node) => {
			const row = document.createElement('div');
			row.style.cssText = rowStyle;
			const keyEl = document.createElement('span');
			keyEl.style.cssText = keyStyle;
			keyEl.textContent = key;
			row.appendChild(keyEl);
			const val = document.createElement('span');
			val.style.cssText = valueStyle;
			val.appendChild(valueEl);
			row.appendChild(val);
			drawer.appendChild(row);
		};

		const nameText = document.createTextNode(info?.name || 'Anonymous');
		addRow('by', nameText);

		if (info?.link) {
			const a = document.createElement('a');
			a.href = info.link;
			a.target = '_blank';
			a.rel = 'noopener noreferrer';
			a.textContent = info.link;
			a.style.cssText = 'color: var(--color-primary, #007aff);';
			addRow('Link', a);
		}

		if (info?.bio) {
			addRow('Bio', document.createTextNode(info.bio));
		}
	}
}

customElements.define('piece-reader', PieceView);
export { PieceView };
