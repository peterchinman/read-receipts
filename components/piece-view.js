// Piece View Component
// Read-only view of a published piece

import { html } from '../utils/template.js';
import { apiClient } from '../utils/api-client.js';
import { router } from '../utils/router.js';

class PieceView extends HTMLElement {
	#shadow;
	#pieceId = null;
	#piece = null;
	#loading = true;
	#error = null;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
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
		this.#render();
		if (this.#pieceId) {
			this.#loadPiece();
		}
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
					max-width: 600px;
					margin: 0 auto;
					padding: 20px;
				}

				.back-btn {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					color: var(--color-primary, #007aff);
					text-decoration: none;
					font-size: 16px;
					margin-bottom: 20px;
				}

				.back-btn:hover {
					text-decoration: underline;
				}

				.header {
					margin-bottom: 24px;
				}

				h1 {
					font-size: 28px;
					font-weight: 700;
					margin: 0 0 8px;
					color: var(--color-text, #000);
				}

				.meta {
					color: var(--color-text-secondary, #666);
					font-size: 14px;
				}

				.messages {
					display: flex;
					flex-direction: column;
					gap: 8px;
				}

				.message {
					max-width: 80%;
					padding: 10px 14px;
					border-radius: 18px;
					font-size: 16px;
					line-height: 1.4;
					word-wrap: break-word;
				}

				.message.self {
					align-self: flex-end;
					background: var(--color-bubble-self, #007aff);
					color: #fff;
					border-bottom-right-radius: 4px;
				}

				.message.other {
					align-self: flex-start;
					background: var(--color-bubble-other, #e5e5ea);
					color: var(--color-text, #000);
					border-bottom-left-radius: 4px;
				}

				.message-image {
					max-width: 100%;
					border-radius: 12px;
					margin-top: 8px;
				}

				.loading,
				.error {
					text-align: center;
					padding: 40px;
					color: var(--color-text-secondary, #666);
				}

				.error {
					color: #ff3b30;
				}
			</style>

			<a href="/" class="back-btn">
				<span>&larr;</span>
				<span>Back to Home</span>
			</a>

			${this.#loading ? this.#renderLoading() : ''}
			${this.#error ? this.#renderError() : ''}
			${!this.#loading && !this.#error && this.#piece
				? this.#renderPiece()
				: ''}
		`;
	}

	#renderLoading() {
		return html`<div class="loading">Loading...</div>`;
	}

	#renderError() {
		return html`<div class="error">${this.#error}</div>`;
	}

	#renderPiece() {
		const piece = this.#piece;
		return html`
			<div class="header">
				<h1>${piece.name || 'Untitled'}</h1>
				<div class="meta">
					by ${piece.author?.name || 'Anonymous'}
					${piece.published_at
						? ` &bull; ${new Date(piece.published_at).toLocaleDateString()}`
						: ''}
				</div>
			</div>

			<div class="messages">
				${piece.messages
					.map(
						(msg) => html`
							<div class="message ${msg.sender}">
								${msg.message}
								${msg.images
									?.map(
										(img) => html`
											<img
												class="message-image"
												src="${img.url}"
												alt="${img.alt_text || ''}"
											/>
										`,
									)
									.join('') || ''}
							</div>
						`,
					)
					.join('')}
			</div>
		`;
	}
}

customElements.define('piece-view', PieceView);
export { PieceView };
