// Admin Dashboard Component
// Submission review queue

import { html } from '../utils/template.js';
import { apiClient } from '../utils/api-client.js';
import { authState } from './auth-state.js';
import { router } from '../utils/router.js';

class AdminDashboard extends HTMLElement {
	#shadow;
	#submissions = [];
	#loading = true;
	#error = null;
	#selectedSubmission = null;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		// Check admin access
		if (!authState.isAdmin) {
			router.navigate('/');
			return;
		}

		this.#render();
		this.#loadSubmissions();
	}

	async #loadSubmissions() {
		try {
			const response = await apiClient.getSubmissions();
			this.#submissions = response.data || [];
			this.#loading = false;
			this.#render();
		} catch (error) {
			this.#error = error.message || 'Failed to load submissions';
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

				h1 {
					font-size: 28px;
					font-weight: 700;
					margin: 0 0 24px;
					color: var(--color-text, #000);
				}

				.container {
					display: grid;
					grid-template-columns: 1fr 2fr;
					gap: 24px;
				}

				@media (max-width: 900px) {
					.container {
						grid-template-columns: 1fr;
					}
				}

				.queue {
					background: var(--color-card-bg, #fff);
					border-radius: 16px;
					border: 1px solid var(--color-border, #e5e5e5);
					overflow: hidden;
				}

				.queue-header {
					padding: 16px;
					border-bottom: 1px solid var(--color-border, #e5e5e5);
					font-weight: 600;
				}

				.queue-item {
					padding: 16px;
					border-bottom: 1px solid var(--color-border, #e5e5e5);
					cursor: pointer;
					transition: background 0.2s;
				}

				.queue-item:last-child {
					border-bottom: none;
				}

				.queue-item:hover,
				.queue-item.active {
					background: var(--color-hover, #f5f5f5);
				}

				.queue-item-title {
					font-weight: 500;
					margin-bottom: 4px;
				}

				.queue-item-meta {
					font-size: 13px;
					color: var(--color-text-secondary, #666);
				}

				.review-panel {
					background: var(--color-card-bg, #fff);
					border-radius: 16px;
					border: 1px solid var(--color-border, #e5e5e5);
					padding: 24px;
				}

				.review-header {
					margin-bottom: 20px;
				}

				.review-title {
					font-size: 20px;
					font-weight: 600;
					margin: 0 0 8px;
				}

				.review-author {
					color: var(--color-text-secondary, #666);
					font-size: 14px;
				}

				.messages {
					display: flex;
					flex-direction: column;
					gap: 8px;
					margin-bottom: 24px;
					max-height: 400px;
					overflow-y: auto;
					padding: 16px;
					background: var(--color-messages-bg, #f5f5f5);
					border-radius: 12px;
				}

				.message {
					max-width: 80%;
					padding: 10px 14px;
					border-radius: 18px;
					font-size: 15px;
				}

				.message.self {
					align-self: flex-end;
					background: var(--color-bubble-self, #007aff);
					color: #fff;
				}

				.message.other {
					align-self: flex-start;
					background: var(--color-bubble-other, #e5e5ea);
					color: var(--color-text, #000);
				}

				.actions {
					display: flex;
					gap: 12px;
					margin-bottom: 16px;
				}

				button {
					flex: 1;
					padding: 12px 16px;
					font-size: 15px;
					font-weight: 600;
					border: none;
					border-radius: 8px;
					cursor: pointer;
					transition: opacity 0.2s;
				}

				button:hover:not(:disabled) {
					opacity: 0.9;
				}

				button:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}

				.btn-accept {
					background: #34c759;
					color: #fff;
				}

				.btn-reject {
					background: #ff3b30;
					color: #fff;
				}

				.btn-publish {
					background: var(--color-primary, #007aff);
					color: #fff;
				}

				.notes-input {
					width: 100%;
					padding: 12px;
					border: 1px solid var(--color-border, #ccc);
					border-radius: 8px;
					font-size: 14px;
					resize: vertical;
					min-height: 80px;
					box-sizing: border-box;
				}

				.notes-label {
					display: block;
					margin-bottom: 8px;
					font-size: 14px;
					color: var(--color-text-secondary, #666);
				}

				.loading,
				.error,
				.empty {
					text-align: center;
					padding: 40px;
					color: var(--color-text-secondary, #666);
				}

				.empty-panel {
					display: flex;
					align-items: center;
					justify-content: center;
					height: 300px;
					color: var(--color-text-secondary, #666);
				}
			</style>

			<h1>Submission Queue</h1>

			${this.#loading ? html`<div class="loading">Loading...</div>` : ''}
			${this.#error ? html`<div class="error">${this.#error}</div>` : ''}
			${!this.#loading && !this.#error ? this.#renderDashboard() : ''}
		`;

		this.#setupListeners();
	}

	#renderDashboard() {
		if (this.#submissions.length === 0) {
			return html`<div class="empty">No pending submissions.</div>`;
		}

		return html`
			<div class="container">
				<div class="queue">
					<div class="queue-header">
						Pending (${this.#submissions.length})
					</div>
					${this.#submissions
						.map(
							(sub) => html`
								<div
									class="queue-item ${this.#selectedSubmission?.id === sub.id ? 'active' : ''}"
									data-id="${sub.id}"
								>
									<div class="queue-item-title">
										${sub.name || 'Untitled'}
									</div>
									<div class="queue-item-meta">
										by ${sub.author?.name || 'Anonymous'} &bull;
										${new Date(sub.submitted_at).toLocaleDateString()}
									</div>
								</div>
							`,
						)
						.join('')}
				</div>

				<div class="review-panel">
					${this.#selectedSubmission
						? this.#renderReviewPanel()
						: html`<div class="empty-panel">Select a submission to review</div>`}
				</div>
			</div>
		`;
	}

	#renderReviewPanel() {
		const sub = this.#selectedSubmission;
		return html`
			<div class="review-header">
				<h2 class="review-title">${sub.name || 'Untitled'}</h2>
				<div class="review-author">
					by ${sub.author?.name || 'Anonymous'} (${sub.author?.email || 'Unknown'})
				</div>
			</div>

			<div class="messages">
				${sub.messages
					.map(
						(msg) => html`
							<div class="message ${msg.sender}">${msg.message}</div>
						`,
					)
					.join('')}
			</div>

			<div>
				<label class="notes-label" for="notes">Notes (optional):</label>
				<textarea
					id="notes"
					class="notes-input"
					placeholder="Add notes for the author..."
				></textarea>
			</div>

			<div class="actions">
				<button class="btn-accept" id="accept-btn">Accept</button>
				<button class="btn-reject" id="reject-btn">Reject</button>
			</div>
		`;
	}

	#setupListeners() {
		// Queue item selection
		this.#shadow.querySelectorAll('.queue-item').forEach((item) => {
			item.addEventListener('click', () => {
				const id = parseInt(item.dataset.id, 10);
				this.#selectedSubmission = this.#submissions.find(
					(s) => s.id === id,
				);
				this.#render();
			});
		});

		// Accept button
		const acceptBtn = this.#shadow.getElementById('accept-btn');
		if (acceptBtn) {
			acceptBtn.addEventListener('click', async () => {
				if (!this.#selectedSubmission) return;

				const notes =
					this.#shadow.getElementById('notes')?.value || null;

				try {
					acceptBtn.disabled = true;
					await apiClient.acceptSubmission(
						this.#selectedSubmission.id,
						notes,
					);
					await apiClient.publishSubmission(
						this.#selectedSubmission.id,
					);
					this.#selectedSubmission = null;
					await this.#loadSubmissions();
				} catch (error) {
					alert('Failed to accept: ' + error.message);
					acceptBtn.disabled = false;
				}
			});
		}

		// Reject button
		const rejectBtn = this.#shadow.getElementById('reject-btn');
		if (rejectBtn) {
			rejectBtn.addEventListener('click', async () => {
				if (!this.#selectedSubmission) return;

				const notes =
					this.#shadow.getElementById('notes')?.value || null;

				try {
					rejectBtn.disabled = true;
					await apiClient.rejectSubmission(
						this.#selectedSubmission.id,
						notes,
					);
					this.#selectedSubmission = null;
					await this.#loadSubmissions();
				} catch (error) {
					alert('Failed to reject: ' + error.message);
					rejectBtn.disabled = false;
				}
			});
		}
	}
}

customElements.define('admin-dashboard', AdminDashboard);
export { AdminDashboard };
