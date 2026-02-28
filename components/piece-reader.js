// Piece View Component
// Read-only view of a published piece

import { html } from '../utils/template.js';
import { apiClient } from '../utils/api-client.js';
import { router } from '../utils/router.js';
import './thread-view.js';
import { authState } from './auth-state.js';

class PieceView extends HTMLElement {
	#shadow;
	#pieceId = null;
	#piece = null;
	#loading = true;
	#error = null;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
		this._onNavigate = this._onNavigate.bind(this);
	}

	static get observedAttributes() {
		return ['piece-id'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'piece-id' && oldValue !== newValue) {
			this.#pieceId = newValue;
			this.#loadPiece();
		}
	}

	connectedCallback() {
		this.#pieceId = this.getAttribute('piece-id');
		this.#shadow.addEventListener('navigate', this._onNavigate);
		this.#render();
		if (this.#pieceId) {
			this.#loadPiece();
		}
	}

	disconnectedCallback() {
		this.#shadow.removeEventListener('navigate', this._onNavigate);
	}

	async #loadPiece() {
		if (!this.#pieceId) return;

		this.#loading = true;
		this.#error = null;
		this.#render();

		try {
			this.#piece = await apiClient.getPublishedPiece(this.#pieceId);
			this.#loading = false;
			this.#render();
		} catch (error) {
			this.#error = error.message || 'Failed to load piece';
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
			const display = this.#shadow.querySelector('thread-view');
			if (display) {
				display.setRecipient({
					name: this.#piece.recipient_name,
					location: this.#piece.recipient_location,
				});
				display.setMessages(this.#piece.messages);
				display.scrollToBottom();
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
		const showCompose = authState.isAuthenticated || authState.isAdmin;
		let navText = 'Back';
		try {
			const count = parseInt(sessionStorage.getItem('message-simulator:unread-count') || '0', 10);
			if (count > 0) navText = String(count);
		} catch {}
		return html`<thread-view show-back-button nav-text="${navText}" nav-action="back" ${showCompose ? 'show-compose-button' : ''}></thread-view>`;
	}

	_onNavigate(e) {
		const { action } = e.detail || {};
		if (action === 'back') {
			router.navigate('/');
		} else if (action === 'create') {
			router.navigate('/create');
		}
	}
}

customElements.define('piece-reader', PieceView);
export { PieceView };
