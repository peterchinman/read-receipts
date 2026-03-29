// Admin Dashboard Component
// Three-panel submission review queue using app-container grid layout
// Uses light DOM so .pane sections participate in the parent grid

import { html, css } from '../utils/template.js';
import { apiClient } from '../utils/api-client.js';
import { authState } from './auth-state.js';
import { router } from '../utils/router.js';
import { getThreadDisplayName, ThreadDisplayable } from '../utils/thread.js';
import { ThreadDisplay, MessageLike } from './thread-view.js';

// Inject admin-specific styles into the document once
const ADMIN_STYLE_ID = 'admin-dashboard-styles';
if (!document.getElementById(ADMIN_STYLE_ID)) {
	const style = document.createElement('style');
	style.id = ADMIN_STYLE_ID;
	style.textContent = css`
		/* Admin list panel */
		.admin-tabs {
			display: flex;
			border-bottom: 1px solid var(--color-edge, #e5e5e5);
			background: var(--color-header, #fff);
			flex-shrink: 0;
		}

		.admin-tab {
			flex: 1;
			padding: 12px 8px;
			font: 13px/1.2 system-ui;
			font-weight: 600;
			text-align: center;
			cursor: pointer;
			border: none;
			background: none;
			color: var(--color-ink-subdued, #666);
			border-bottom: 2px solid transparent;
			transition:
				color 0.2s,
				border-color 0.2s;
		}

		.admin-tab:hover {
			color: var(--color-ink, #000);
		}

		.admin-tab.active {
			color: var(--color-primary, #007aff);
			border-bottom-color: var(--color-primary, #007aff);
		}

		.admin-submission-list {
			flex: 1;
			overflow-y: auto;
		}

		.admin-submission-item {
			padding: 14px 16px;
			border-bottom: 1px solid var(--color-edge, #e5e5e5);
			cursor: pointer;
			transition: background 0.15s;
		}

		.admin-submission-item:hover,
		.admin-submission-item.active {
			background: var(--color-hover, #f5f5f7);
		}

		.admin-submission-item-title {
			font: 14px/1.3 system-ui;
			font-weight: 500;
			color: var(--color-ink, #000);
			margin-bottom: 4px;
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.admin-submission-item-meta {
			font: 12px/1.3 system-ui;
			color: var(--color-ink-subdued, #666);
		}

		.admin-badge-resubmitted {
			font: 10px/1 system-ui;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			padding: 3px 6px;
			border-radius: 4px;
			background: var(--color-status-red);
			color: #fff;
			flex-shrink: 0;
		}

		.admin-badge-info-received {
			font: 10px/1 system-ui;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			padding: 3px 6px;
			border-radius: 4px;
			background: var(--color-status-green);
			color: #fff;
			flex-shrink: 0;
		}

		.admin-badge-info-pending {
			font: 10px/1 system-ui;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			padding: 3px 6px;
			border-radius: 4px;
			background: var(--color-hover, #f0f0f0);
			color: var(--color-ink-subdued, #888);
			flex-shrink: 0;
		}

		.admin-author-info-block {
			background: var(--color-hover, #f5f5f7);
			border-radius: 8px;
			padding: 12px 14px;
			font: 13px/1.5 system-ui;
			color: var(--color-ink, #000);
		}

		.admin-author-info-block dt {
			font-weight: 600;
			color: var(--color-ink-subdued, #666);
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			margin-top: 8px;
		}

		.admin-author-info-block dt:first-child {
			margin-top: 0;
		}

		.admin-author-info-block dd {
			margin: 2px 0 0 0;
			word-break: break-word;
		}

		.admin-empty {
			padding: 40px 16px;
			text-align: center;
			color: var(--color-ink-subdued, #666);
			font: 14px system-ui;
		}

		/* Admin action panel */
		.admin-action-content {
			padding: 20px;
			display: flex;
			flex-direction: column;
			gap: 16px;
			overflow-y: auto;
			flex: 1;
		}

		.admin-action-header {
			margin: 0;
			font: 18px/1.3 system-ui;
			font-weight: 600;
			color: var(--color-ink, #000);
		}

		.admin-action-meta {
			font: 13px/1.4 system-ui;
			color: var(--color-ink-subdued, #666);
		}

		.admin-action-section-label {
			font: 12px/1 system-ui;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: var(--color-ink-subdued, #666);
			margin: 0;
		}

		.admin-notes-input {
			width: 100%;
			padding: 10px 12px;
			border: 1px solid var(--color-edge, #ccc);
			border-radius: 8px;
			font: 14px/1.4 system-ui;
			color: var(--color-ink, #000);
			background: var(--color-header, #fff);
			resize: vertical;
			min-height: 80px;
			box-sizing: border-box;
		}

		.admin-notes-input::placeholder {
			color: var(--color-ink-subdued, #999);
		}

		.admin-action-buttons {
			display: flex;
			flex-direction: column;
			gap: 8px;
		}

		.admin-action-btn {
			width: 100%;
			padding: 10px 16px;
			font: 14px/1 system-ui;
			font-weight: 600;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			transition: opacity 0.15s;
		}

		.admin-action-btn:hover:not(:disabled) {
			opacity: 0.9;
		}

		.admin-action-btn:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.admin-btn-approve {
			background: var(--color-status-green);
			color: #fff;
		}

		.admin-btn-request-changes {
			background: var(--color-primary);
			color: #fff;
		}

		.admin-btn-reject {
			background: var(--color-status-red);
			color: #fff;
		}

		.admin-btn-publish {
			background: var(--color-primary, #007aff);
			color: #fff;
		}

		.admin-empty-panel {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100%;
			color: var(--color-ink-subdued, #666);
			font: 14px system-ui;
			padding: 20px;
			text-align: center;
		}

		/* Admin preview panel */
		.pane--preview thread-view {
			flex: 1;
			min-height: 0;
		}

		.admin-loading,
		.admin-error {
			text-align: center;
			padding: 40px;
			color: var(--color-ink-subdued, #666);
			font: 15px system-ui;
			grid-column: 1 / -1;
		}

		.admin-error {
			color: var(--color-status-red);
		}

		/* Pane inner layout for admin */
		.pane--threads.admin-pane,
		.pane--editor.admin-pane,
		.pane--preview.admin-pane {
			display: flex;
			flex-direction: column;
			overflow: hidden;
			background: var(--color-page);
			border-radius: calc(18rem / 14);
			border: 1px solid var(--color-edge);
			filter: drop-shadow(0 0 16px var(--color-drop-shadow-intense))
				drop-shadow(0 0 4px var(--color-drop-shadow));
		}

		/* Event history timeline */
		.admin-event-history {
			display: flex;
			flex-direction: column;
			gap: 0;
			border-left: 2px solid var(--color-edge, #e5e5e5);
			margin-left: 6px;
			padding-left: 14px;
		}

		.admin-event-item {
			position: relative;
			padding: 8px 0;
			font: 13px/1.4 system-ui;
			color: var(--color-ink, #000);
		}

		.admin-event-item.clickable {
			cursor: pointer;
			border-radius: 6px;
			padding: 8px 6px;
			margin: 0 -6px;
			transition: background 0.15s;
		}

		.admin-event-item.clickable:hover {
			background: var(--color-hover, #f5f5f7);
		}

		.admin-event-item.active {
			background: color-mix(
				in srgb,
				var(--color-primary, #007aff) 10%,
				transparent
			);
		}

		.admin-event-item::before {
			content: '';
			position: absolute;
			left: -19px;
			top: 12px;
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: var(--color-edge, #ccc);
			border: 2px solid var(--color-header, #fff);
		}

		.admin-event-item.clickable::before {
			left: -13px;
		}

		.admin-event-item.active::before {
			background: var(--color-primary, #007aff);
		}

		.admin-event-label {
			display: inline-block;
			font: 11px/1 system-ui;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			padding: 3px 6px;
			border-radius: 4px;
			background: var(--color-hover, #f0f0f0);
			color: var(--color-ink-subdued, #666);
			margin-right: 6px;
		}

		.admin-event-date {
			font: 12px/1 system-ui;
			color: var(--color-ink-subdued, #888);
		}

		.admin-event-admin {
			font: 12px/1.3 system-ui;
			color: var(--color-ink-subdued, #888);
			margin-top: 2px;
		}

		.admin-event-notes {
			font: 12px/1.4 system-ui;
			color: var(--color-ink-subdued, #666);
			margin-top: 4px;
			font-style: italic;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			max-width: 100%;
		}

		.admin-event-notes.expanded {
			white-space: normal;
			overflow: visible;
			text-overflow: unset;
		}

		.admin-token-link-block {
			display: flex;
			align-items: center;
			gap: 8px;
			background: var(--color-hover, #f5f5f7);
			border-radius: 8px;
			padding: 8px 12px;
		}

		.admin-token-link-url {
			flex: 1;
			min-width: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			font: 12px/1.4 monospace;
			color: var(--color-ink-subdued, #666);
		}

		.admin-token-copy-btn {
			flex-shrink: 0;
			padding: 4px 10px;
			font: 600 12px system-ui;
			border: 1px solid var(--color-edge, #ccc);
			border-radius: 6px;
			background: var(--color-page, #fff);
			color: var(--color-ink, #000);
			cursor: pointer;
		}
	`;
	document.head.appendChild(style);
}

interface SubmissionEvent {
	type: string;
	created_at: string;
	admin?: string;
	notes?: string;
	snapshot?: {
		messages?: unknown[];
		participants?: Array<{ full_name?: string; location?: string }>;
	};
}

interface Submission {
	id: string | number;
	name?: string;
	status: string;
	submitted_at?: string;
	is_resubmission?: boolean;
	author_info_received?: boolean;
	author_info_token?: string;
	edit_token?: string;
	author?: { name?: string; email?: string };
	author_info?: {
		payment_platform?: string;
		payment_username?: string;
		name?: string;
		link?: string;
		bio?: string;
	};
	participants?: Array<{ full_name: string; location?: string }>;
	messages?: unknown[];
	events?: SubmissionEvent[];
}

class AdminDashboard extends HTMLElement {
	#pendingReview: Submission[] = [];
	#changesRequested: Submission[] = [];
	#pendingPublication: Submission[] = [];
	#published: Submission[] = [];
	#loading = true;
	#error: string | null = null;
	#selectedSubmission: Submission | null = null;
	#activeTab = 'submitted';
	#actionLoading = false;
	#previewEventIndex: number | null = null;
	#expandedEventIndex: number | null = null;

	connectedCallback() {
		if (!authState.isAdmin) {
			router.navigate('/');
			return;
		}

		this.#render();
		this.#loadSubmissions();
	}

	async #loadSubmissions() {
		this.#loading = true;
		this.#render();

		try {
			const [review, changes, pub, published] = await Promise.all([
				apiClient.getSubmissions(1, 'submitted'),
				apiClient.getSubmissions(1, 'changes_requested'),
				apiClient.getSubmissions(1, 'accepted'),
				apiClient.getSubmissions(1, 'published'),
			]);
			this.#pendingReview = review.data || [];
			this.#changesRequested = changes.data || [];
			this.#pendingPublication = pub.data || [];
			this.#published = published.data || [];
			this.#loading = false;
			this.#render();
		} catch (error) {
			this.#error =
				error instanceof Error ? error.message : 'Failed to load submissions';
			this.#loading = false;
			this.#render();
		}
	}

	#getActiveList() {
		if (this.#activeTab === 'submitted') return this.#pendingReview;
		if (this.#activeTab === 'changes_requested') return this.#changesRequested;
		if (this.#activeTab === 'approved') return this.#pendingPublication;
		return this.#published;
	}

	#render() {
		if (this.#loading) {
			this.innerHTML = html`<div class="admin-loading">
					Loading submissions...
				</div>`;
			return;
		}

		if (this.#error) {
			this.innerHTML = html`<div class="admin-error">${this.#error}</div>`;
			return;
		}

		const reviewCount = this.#pendingReview.length;
		const changesCount = this.#changesRequested.length;
		const pubCount = this.#pendingPublication.length;
		const publishedCount = this.#published.length;
		const list = this.#getActiveList();

		this.innerHTML = html`
			<section class="pane pane--threads admin-pane">
				<div class="admin-tabs">
					<button
						class="admin-tab ${this.#activeTab === 'submitted' ? 'active' : ''}"
						data-tab="submitted"
					>
						Subs (${reviewCount})
					</button>
					<button
						class="admin-tab ${this.#activeTab === 'changes_requested'
							? 'active'
							: ''}"
						data-tab="changes_requested"
					>
						Edit Reqs (${changesCount})
					</button>
					<button
						class="admin-tab ${this.#activeTab === 'approved' ? 'active' : ''}"
						data-tab="approved"
					>
						Approved (${pubCount})
					</button>
					<button
						class="admin-tab ${this.#activeTab === 'published' ? 'active' : ''}"
						data-tab="published"
					>
						Pub (${publishedCount})
					</button>
				</div>
				<div class="admin-submission-list">
					${list.length === 0
						? html`<div class="admin-empty">No submissions</div>`
						: list.map((sub) => this.#renderSubmissionItem(sub)).join('')}
				</div>
			</section>

			<section class="pane pane--editor admin-pane">
				${this.#selectedSubmission
					? this.#renderActionPanel()
					: html`<div class="admin-empty-panel">
								Select a submission to see actions
							</div>`}
			</section>

			<section class="pane pane--preview admin-pane">
				${this.#selectedSubmission
					? html`<thread-view show-input="false"></thread-view>`
					: html`<div class="admin-empty-panel">
								Select a submission to preview
							</div>`}
			</section>
		`;

		this.#setupListeners();

		// Wire thread-view if a submission is selected
		if (this.#selectedSubmission) {
			const selectedSub = this.#selectedSubmission;
			requestAnimationFrame(() => {
				const display = this.querySelector<ThreadDisplay>('thread-view');
				if (display) {
					const snapshot =
						this.#previewEventIndex !== null
							? selectedSub.events?.[this.#previewEventIndex]?.snapshot
							: null;
					display.setRecipient({
						name:
							snapshot?.participants?.[0]?.full_name ??
							selectedSub.participants?.[0]?.full_name ??
							'',
						location:
							snapshot?.participants?.[0]?.location ??
							selectedSub.participants?.[0]?.location ??
							'',
					});
					display.setMessages(
						(snapshot?.messages ?? selectedSub.messages ?? []) as MessageLike[],
					);
					display.scrollToBottom();
				}
			});
		}
	}

	#renderSubmissionItem(sub: Submission) {
		const isApprovedTab = this.#activeTab === 'approved';
		return html`
			<div
				class="admin-submission-item ${this.#selectedSubmission?.id === sub.id
					? 'active'
					: ''}"
				data-id="${sub.id}"
			>
				<div class="admin-submission-item-title">
					<span>${getThreadDisplayName(sub)}</span>
					${sub.is_resubmission
						? html`<span class="admin-badge-resubmitted">Resubmitted</span>`
						: ''}
					${isApprovedTab
						? sub.author_info_received
							? html`<span class="admin-badge-info-received">Info ✓</span>`
							: html`<span class="admin-badge-info-pending">Info pending</span>`
						: ''}
				</div>
				<div class="admin-submission-item-meta">
					by ${sub.author?.name || 'Anonymous'} &bull;
					${sub.submitted_at
						? new Date(sub.submitted_at).toLocaleDateString()
						: ''}
				</div>
			</div>
		`;
	}

	#renderTokenLinkBlock(label: string, url: string) {
		const attrUrl = url.replace(/&/g, '&amp;');
		return html`
			<p class="admin-action-section-label">${label}</p>
			<div class="admin-token-link-block">
				<span class="admin-token-link-url">${url}</span>
				<button class="admin-token-copy-btn" data-copy-url="${attrUrl}">
					Copy
				</button>
			</div>
		`;
	}

	#renderActionPanel() {
		const sub = this.#selectedSubmission;
		if (!sub) return '';
		const isSubmitted = sub.status === 'submitted';
		const isAccepted = sub.status === 'accepted';
		const isChangesRequested = sub.status === 'changes_requested';
		const isPublished = sub.status === 'published';

		return html`
			<div class="admin-action-content">
				<h2 class="admin-action-header">${getThreadDisplayName(sub)}</h2>
				<div class="admin-action-meta">
					by ${sub.author?.name || 'Anonymous'}<br />
					${sub.author?.email || ''}
				</div>

				${isSubmitted
					? html`
					<p class="admin-action-section-label">Notes</p>
							<textarea
								id="admin-notes"
								class="admin-notes-input"
								placeholder="Add notes for the author..."
							></textarea>

							<div class="admin-action-buttons">
								<button
									class="admin-action-btn admin-btn-approve"
									id="approve-btn"
									${this.#actionLoading ? 'disabled' : ''}
								>
									Approve
								</button>
								<button
									class="admin-action-btn admin-btn-request-changes"
									id="request-changes-btn"
									${this.#actionLoading ? 'disabled' : ''}
								>
									Request Changes
								</button>
								<button
									class="admin-action-btn admin-btn-reject"
									id="reject-btn"
									${this.#actionLoading ? 'disabled' : ''}
								>
									Reject
								</button>
							</div>
				`
					: ''}
				${isAccepted
					? html`
					<div class="admin-action-buttons">
								<button
									class="admin-action-btn admin-btn-publish"
									id="publish-btn"
									${this.#actionLoading ? 'disabled' : ''}
								>
									Publish
								</button>
								${sub.events?.some((e) => e.type === 'paid')
									? html`<button
												class="admin-action-btn"
												disabled
												style="background: var(--color-edge, #ccc); color: var(--color-ink-subdued, #666);"
											>
												Paid
											</button>`
									: html`<button
												class="admin-action-btn admin-btn-approve"
												id="mark-paid-btn"
												${this.#actionLoading ? 'disabled' : ''}
											>
												Mark as Paid
											</button>`}
							</div>
							${sub.author_info_token
								? this.#renderTokenLinkBlock(
										'Author Info Link',
										`${window.location.origin}/create?author-info=${sub.id}&token=${sub.author_info_token}`,
									)
								: ''}
							${this.#renderAuthorInfoSection(sub)}
				`
					: ''}
				${isChangesRequested
					? html`
					${sub.edit_token
								? this.#renderTokenLinkBlock(
										'Edit Link',
										`${window.location.origin}/create?edit=${sub.id}&token=${sub.edit_token}`,
									)
								: ''}
				`
					: ''}
				${isPublished
					? html`
					<div class="admin-action-meta">
								Published
								${sub.submitted_at
									? new Date(sub.submitted_at).toLocaleDateString()
									: ''}
							</div>
							<div class="admin-action-buttons">
								<button
									class="admin-action-btn admin-btn-reject"
									id="delete-btn"
									${this.#actionLoading ? 'disabled' : ''}
								>
									Delete
								</button>
							</div>
				`
					: ''}
				${this.#renderEventHistory(sub.events)}
			</div>
		`;
	}

	#renderAuthorInfoSection(sub: Submission) {
		if (!sub.author_info_received) {
			return html`<p class="admin-action-section-label">
					Author info not yet received
				</p>`;
		}

		const info = sub.author_info!;
		return html`
			<p class="admin-action-section-label">Author Info</p>
			<dl class="admin-author-info-block">
				<dt>Payment</dt>
				<dd>${info.payment_platform} — ${info.payment_username}</dd>
				${info.name
					? html`<dt>Name</dt>
							<dd>${info.name}</dd>`
					: ''}
				${info.link
					? html`<dt>Link</dt>
							<dd>
								<a href="${info.link}" target="_blank" rel="noopener noreferrer"
									>${info.link}</a
								>
							</dd>`
					: ''}
				${info.bio
					? html`<dt>Bio</dt>
							<dd>${info.bio}</dd>`
					: ''}
			</dl>
		`;
	}

	#renderEventHistory(events: SubmissionEvent[] | undefined) {
		if (!events || events.length === 0) return '';

		const eventLabels: Record<string, string> = {
			submitted: 'Submitted',
			accepted: 'Accepted',
			changes_requested: 'Changes Requested',
			resubmitted: 'Resubmitted',
			published: 'Published',
			rejected: 'Rejected',
			paid: 'Paid',
		};

		return html`
			<p class="admin-action-section-label">History</p>
			<div class="admin-event-history">
				${events
					.map((event: SubmissionEvent, i: number) => {
						const hasResubmissions = events.some(
							(e: SubmissionEvent) => e.type === 'resubmitted',
						);
						const isVersionEvent =
							hasResubmissions &&
							(event.type === 'submitted' || event.type === 'resubmitted');
						const hasNotes = !!event.notes;
						const isClickable = isVersionEvent || hasNotes;
						const isExpanded = this.#expandedEventIndex === i;
						const isPreviewing = this.#previewEventIndex === i;
						const classes = [
							'admin-event-item',
							isClickable ? 'clickable' : '',
							isPreviewing ? 'active' : '',
						]
							.filter(Boolean)
							.join(' ');

						return html`
					<div class="${classes}" data-event-index="${i}">
								<span class="admin-event-label"
									>${eventLabels[event.type] || event.type}</span
								>
								<span class="admin-event-date"
									>${new Date(event.created_at).toLocaleDateString(undefined, {
										year: 'numeric',
										month: 'short',
										day: 'numeric',
										hour: 'numeric',
										minute: '2-digit',
									})}</span
								>
								${event.admin
									? html`<div class="admin-event-admin">by ${event.admin}</div>`
									: ''}
								${event.notes
									? html`<div
												class="admin-event-notes ${isExpanded
													? 'expanded'
													: ''}"
											>
												${event.notes}
											</div>`
									: ''}
							</div>
				`;
					})
					.join('')}
			</div>
		`;
	}

	#setupListeners() {
		// Tab switching
		this.querySelectorAll('.admin-tab').forEach((tab) => {
			tab.addEventListener('click', () => {
				this.#activeTab = (tab as HTMLElement).dataset.tab ?? 'submitted';
				this.#selectedSubmission = null;
				this.#render();
			});
		});

		// Submission item selection
		this.querySelectorAll('.admin-submission-item').forEach((item) => {
			item.addEventListener('click', () => {
				const id = parseInt((item as HTMLElement).dataset.id ?? '', 10);
				const list = this.#getActiveList();
				this.#selectedSubmission = list.find((s) => s.id === id) || null;
				this.#expandedEventIndex = null;
				// Default to the most recent resubmitted event (events are newest-first)
				const events = this.#selectedSubmission?.events || [];
				const latestResubmitIndex = events.findIndex(
					(e) => e.type === 'resubmitted',
				);
				this.#previewEventIndex =
					latestResubmitIndex >= 0 ? latestResubmitIndex : null;
				this.#render();
			});
		});

		// Event item clicks (notes expansion + version preview)
		this.querySelectorAll('.admin-event-item.clickable').forEach((item) => {
			item.addEventListener('click', () => {
				const index = parseInt(
					(item as HTMLElement).dataset.eventIndex ?? '',
					10,
				);
				const event = this.#selectedSubmission?.events?.[index];
				if (!event) return;

				const isVersionEvent =
					event.type === 'submitted' || event.type === 'resubmitted';
				if (isVersionEvent) {
					// Switch version preview
					this.#previewEventIndex = index;
				} else if (event.notes) {
					// Toggle notes expansion
					this.#expandedEventIndex =
						this.#expandedEventIndex === index ? null : index;
				}
				this.#render();
			});
		});

		// Approve
		const approveBtn = this.querySelector('#approve-btn');
		if (approveBtn) {
			approveBtn.addEventListener('click', () => this.#handleApprove());
		}

		// Request Changes
		const requestChangesBtn = this.querySelector('#request-changes-btn');
		if (requestChangesBtn) {
			requestChangesBtn.addEventListener('click', () =>
				this.#handleRequestChanges(),
			);
		}

		// Reject
		const rejectBtn = this.querySelector('#reject-btn');
		if (rejectBtn) {
			rejectBtn.addEventListener('click', () => this.#handleReject());
		}

		// Publish
		const publishBtn = this.querySelector('#publish-btn');
		if (publishBtn) {
			publishBtn.addEventListener('click', () => this.#handlePublish());
		}

		// Mark as Paid
		const markPaidBtn = this.querySelector('#mark-paid-btn');
		if (markPaidBtn) {
			markPaidBtn.addEventListener('click', () => this.#handleMarkPaid());
		}

		// Copy token link buttons
		this.querySelectorAll('[data-copy-url]').forEach((btn) => {
			btn.addEventListener('click', async () => {
				const url = (btn as HTMLElement).dataset.copyUrl ?? '';
				try {
					await navigator.clipboard.writeText(url);
					const orig = btn.textContent;
					btn.textContent = 'Copied!';
					setTimeout(() => {
						btn.textContent = orig;
					}, 1500);
				} catch (_e) {}
			});
		});

		// Delete
		const deleteBtn = this.querySelector('#delete-btn');
		if (deleteBtn) {
			deleteBtn.addEventListener('click', () => this.#handleDelete());
		}
	}

	async #handleApprove() {
		if (!this.#selectedSubmission || this.#actionLoading) return;
		const notes =
			(this.querySelector('#admin-notes') as HTMLInputElement | null)?.value ||
			null;

		this.#actionLoading = true;
		this.#render();

		try {
			await apiClient.acceptSubmission(this.#selectedSubmission.id, notes);
			this.#selectedSubmission = null;
			this.#actionLoading = false;
			await this.#loadSubmissions();
		} catch (error) {
			alert(
				'Failed to approve: ' +
					(error instanceof Error ? error.message : 'Unknown error'),
			);
			this.#actionLoading = false;
			this.#render();
		}
	}

	async #handleRequestChanges() {
		if (!this.#selectedSubmission || this.#actionLoading) return;
		const notes = (
			this.querySelector('#admin-notes') as HTMLInputElement | null
		)?.value?.trim();

		if (!notes) {
			alert('Notes are required when requesting changes.');
			return;
		}

		this.#actionLoading = true;
		this.#render();

		try {
			await apiClient.requestChanges(this.#selectedSubmission.id, notes);
			this.#selectedSubmission = null;
			this.#actionLoading = false;
			await this.#loadSubmissions();
		} catch (error) {
			alert(
				'Failed to request changes: ' +
					(error instanceof Error ? error.message : 'Unknown error'),
			);
			this.#actionLoading = false;
			this.#render();
		}
	}

	async #handleReject() {
		if (!this.#selectedSubmission || this.#actionLoading) return;
		const notes =
			(this.querySelector('#admin-notes') as HTMLInputElement | null)?.value ||
			null;

		this.#actionLoading = true;
		this.#render();

		try {
			await apiClient.rejectSubmission(this.#selectedSubmission.id, notes);
			this.#selectedSubmission = null;
			this.#actionLoading = false;
			await this.#loadSubmissions();
		} catch (error) {
			alert(
				'Failed to reject: ' +
					(error instanceof Error ? error.message : 'Unknown error'),
			);
			this.#actionLoading = false;
			this.#render();
		}
	}

	async #handlePublish() {
		if (!this.#selectedSubmission || this.#actionLoading) return;

		this.#actionLoading = true;
		this.#render();

		try {
			await apiClient.publishSubmission(this.#selectedSubmission.id);
			this.#selectedSubmission = null;
			this.#actionLoading = false;
			await this.#loadSubmissions();
		} catch (error) {
			alert(
				'Failed to publish: ' +
					(error instanceof Error ? error.message : 'Unknown error'),
			);
			this.#actionLoading = false;
			this.#render();
		}
	}

	async #handleMarkPaid() {
		if (!this.#selectedSubmission || this.#actionLoading) return;
		const selectedId = this.#selectedSubmission.id;

		this.#actionLoading = true;
		this.#render();

		try {
			await apiClient.markPaid(selectedId);
			this.#actionLoading = false;
			await this.#loadSubmissions();
			// Re-select the same submission from the refreshed list
			const list = this.#getActiveList();
			this.#selectedSubmission = list.find((s) => s.id === selectedId) || null;
			this.#render();
		} catch (error) {
			alert(
				'Failed to mark as paid: ' +
					(error instanceof Error ? error.message : 'Unknown error'),
			);
			this.#actionLoading = false;
			this.#render();
		}
	}

	async #handleDelete() {
		if (!this.#selectedSubmission || this.#actionLoading) return;

		if (
			!confirm(
				`Delete "${getThreadDisplayName(this.#selectedSubmission)}"? This cannot be undone.`,
			)
		) {
			return;
		}

		this.#actionLoading = true;
		this.#render();

		try {
			await apiClient.deleteSubmission(this.#selectedSubmission.id);
			this.#selectedSubmission = null;
			this.#actionLoading = false;
			await this.#loadSubmissions();
		} catch (error) {
			alert(
				'Failed to delete: ' +
					(error instanceof Error ? error.message : 'Unknown error'),
			);
			this.#actionLoading = false;
			this.#render();
		}
	}
}

customElements.define('admin-dashboard', AdminDashboard);

declare global {
	interface HTMLElementTagNameMap {
		'admin-dashboard': AdminDashboard;
	}
}

export { AdminDashboard };
