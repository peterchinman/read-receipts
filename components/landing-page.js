// Landing Page Component
// Grid of published pieces

import { html } from '../utils/template.js';
import { apiClient } from '../utils/api-client.js';
import { router } from '../utils/router.js';
import { config } from '../utils/config.js';

class LandingPage extends HTMLElement {
	#shadow;
	#pieces = [];
	#loading = true;
	#error = null;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this.#render();
		this.#loadPieces();
	}

	async #loadPieces() {
		try {
			const response = await apiClient.getPublishedPieces();
			this.#pieces = response.data || [];
			this.#loading = false;
			this.#render();
		} catch (error) {
			this.#error = error.message || 'Failed to load pieces';
			this.#loading = false;
			this.#render();
		}
	}

	#render() {
		this.#shadow.innerHTML = html`
			<style>
				:host {
					display: block;
					padding: 20px;
					max-width: 1200px;
					margin: 0 auto;
				}

				.header {
					text-align: center;
					margin-bottom: 40px;
				}

				h1 {
					font-size: 32px;
					font-weight: 700;
					margin: 0 0 8px;
					color: var(--color-text, #000);
				}

				.subtitle {
					color: var(--color-text-secondary, #666);
					font-size: 18px;
					margin: 0;
				}

				.grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
					gap: 24px;
				}

				.piece-card {
					background: var(--color-card-bg, #fff);
					border-radius: 16px;
					padding: 20px;
					border: 1px solid var(--color-border, #e5e5e5);
					cursor: pointer;
					transition:
						transform 0.2s,
						box-shadow 0.2s;
				}

				.piece-card:hover {
					transform: translateY(-2px);
					box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
				}

				.piece-title {
					font-size: 18px;
					font-weight: 600;
					margin: 0 0 8px;
					color: var(--color-text, #000);
				}

				.piece-author {
					font-size: 14px;
					color: var(--color-text-secondary, #666);
					margin: 0 0 12px;
				}

				.piece-preview {
					font-size: 14px;
					color: var(--color-text-tertiary, #999);
					line-height: 1.5;
					display: -webkit-box;
					-webkit-line-clamp: 3;
					-webkit-box-orient: vertical;
					overflow: hidden;
				}

				.loading,
				.error,
				.empty {
					text-align: center;
					padding: 40px;
					color: var(--color-text-secondary, #666);
				}

				.error {
					color: #ff3b30;
				}
			</style>

			<div class="header">
				<h1>${config.appName}</h1>
				<p class="subtitle">Stories told through messages</p>
			</div>

			${this.#loading ? this.#renderLoading() : ''}
			${this.#error ? this.#renderError() : ''}
			${!this.#loading && !this.#error ? this.#renderPieces() : ''}
		`;

		this.#setupListeners();
	}

	#renderLoading() {
		return html`<div class="loading">Loading pieces...</div>`;
	}

	#renderError() {
		return html`<div class="error">${this.#error}</div>`;
	}

	#renderPieces() {
		if (this.#pieces.length === 0) {
			return html`<div class="empty">No pieces published yet.</div>`;
		}

		return html`
			<div class="grid">
				${this.#pieces
					.map(
						(piece) => html`
							<div class="piece-card" data-id="${piece.id}">
								<h2 class="piece-title">
									${piece.name || 'Untitled'}
								</h2>
								<p class="piece-author">
									by ${piece.author?.name || 'Anonymous'}
								</p>
								<p class="piece-preview">
									${this.#getPreviewText(piece)}
								</p>
							</div>
						`,
					)
					.join('')}
			</div>
		`;
	}

	#getPreviewText(piece) {
		if (!piece.messages || piece.messages.length === 0) {
			return 'No messages';
		}
		const firstMessages = piece.messages.slice(0, 3);
		return firstMessages.map((m) => m.message).join(' ');
	}

	#setupListeners() {
		this.#shadow.querySelectorAll('.piece-card').forEach((card) => {
			card.addEventListener('click', () => {
				const id = card.dataset.id;
				router.navigate(`/piece/${id}`);
			});
		});
	}
}

customElements.define('landing-page', LandingPage);
export { LandingPage };
