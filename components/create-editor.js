import { store } from './store.js';
import './message-card.js';
import './icon-arrow.js';
import { initTooltips } from '../utils/tooltip.js';
import { html } from '../utils/template.js';
import { MQ } from '../utils/breakpoints.js';
import { HIDE_SCROLLBAR_CSS } from '../utils/scrollbar.js';
import { authState } from './auth-state.js';
import { apiClient } from '../utils/api-client.js';
import {
	isIOS,
	pauseIOSViewport,
	resumeIOSViewport,
} from '../utils/ios-viewport.js';
import {
	createDialog,
	showDialog,
	dialogTitleStyle,
	dialogBodyStyle,
	dialogButtonRowStyle,
	dialogCancelButtonStyle,
	dialogConfirmButtonStyle,
	dialogInputStyle,
} from '../utils/dialog.js';

const SUBMIT_LABEL = 'Submit';
const SUBMITTING_LABEL = 'Submitting';
const SUBMITTED_LABEL = 'Submitted';
const PENDING_LABEL = 'Pending';

const SUBMIT_TOOLTIP = 'Submit for review';
const SUBMITTING_TOOLTIP = 'Submission in progress';
const SUBMITTED_TOOLTIP = 'Thread submitted';
const PENDING_TOOLTIP = 'Check your email';

class ChatEditor extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._onStoreChange = this._onStoreChange.bind(this);
		this._onDelegated = this._onDelegated.bind(this);
		this._onFocusIn = this._onFocusIn.bind(this);
		this._lastFocusedCard = null;
		this._headerObserver = null;
	}

	connectedCallback() {
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

					@media ${MQ.tablet} {
						border-right: 1px solid var(--color-edge);
					}
				}
				.wrapper {
					display: flex;
					flex-direction: column;
					height: 100%;
					position: relative;
				}
				.editor-header {
					position: absolute;
					width: 100%;
					top: 0;
					left: 0;
					display: flex;
					align-items: center;
					padding-inline: var(--padding-inline);
					justify-content: space-between;
					background: var(--color-header);
					border-bottom: 1px solid var(--color-edge);
					-webkit-backdrop-filter: var(--backdrop-filter);
					backdrop-filter: var(--backdrop-filter);
					padding-block: 1rem;
					flex-wrap: nowrap;
					overflow-x: auto;
					user-select: none;
					z-index: 4;
				}

				/* Hide Preview arrow at tablet+ (900px+) since preview is always visible */
				@media ${MQ.tablet} {
					.editor-header icon-arrow[arrow-right] {
						display: none;
					}
				}

				/* Hide Threads arrow at desktop (1200px+) since all panes are visible */
				@media ${MQ.desktop}		 {
					.editor-header icon-arrow:not([arrow-right]) {
						display: none;
					}
				}

				.cards-list.readonly {
					opacity: 0.5;
					pointer-events: none;
				}
				.cards-list {
					flex: 1;
					display: flex;
					flex-direction: column;
					gap: calc(12rem / 14);
					min-height: 0;
					overflow: auto;
					padding: 12px;
					padding-top: calc(12px + var(--editor-header-height, 0px));
					/*scroll-behavior: smooth;*/
				}
				:host(.ios) .cards-list {
					padding-bottom: 80dvh;
				}
				.info-editor {
					border: 1px solid var(--color-edge);
					border-radius: var(--border-radius);
					padding: calc(12rem / 14);
					background: var(--color-page);
					display: flex;
					flex-direction: column;
					gap: calc(10rem / 14);
				}
				.info-editor .title {
					font: 12px system-ui;
					color: var(--color-ink-subdued);
					letter-spacing: 0.02em;
					text-transform: uppercase;
				}
				.info-editor label {
					display: flex;
					flex-direction: column;
					gap: calc(6rem / 14);
					font: 12px system-ui;
					color: var(--color-ink-subdued);
				}
				.info-editor input,
				.info-editor textarea {
					all: unset;
					box-sizing: border-box;
					font: 14px system-ui;
					color: var(--color-ink);
					padding: 8px 10px;
					border: 1px solid var(--color-edge);
					border-radius: 8px;
					background: var(--color-header);
				}
				.info-editor textarea {
					resize: vertical;
					min-height: 80px;
				}
				.info-editor input::placeholder,
				.info-editor textarea::placeholder {
					color: var(--color-ink-subdued);
				}
				.info-editor .optional {
					font-size: 0.8em;
					font-weight: 400;
					color: var(--color-ink-subdued);
				}
				button {
					font: 12px system-ui;
					padding: 6px 10px;
					border: 1px solid var(--color-edge);
					background: var(--color-menu);
					color: var(--color-ink);
					border-radius: 6px;
					cursor: pointer;
				}
				button:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
				button.submit-btn {
					background: var(--color-bubble-self);
					color: white;
					border: none;
				}
				button.submit-btn:hover {
					opacity: 0.9;
				}
				button.submit-btn:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
				.admin-notes-banner {
					background: #fff3cd;
					border: 1px solid #ffc107;
					border-radius: 8px;
					padding: 12px;
					font: 13px/1.4 system-ui;
					color: #856404;
				}
				.admin-notes-banner .banner-title {
					font-weight: 600;
					margin-bottom: 6px;
				}
				.admin-notes-banner .banner-note {
					margin: 4px 0;
				}
				:host-context([data-theme="dark"]) .admin-notes-banner {
					background: #332b00;
					border-color: #665500;
					color: #ffd54f;
				}
				${HIDE_SCROLLBAR_CSS}
			</style>
			<div class="wrapper">
				<div class="editor-header">
					<icon-arrow text="Drafts" action="show-threads"></icon-arrow>
					<button id="clear-chat" data-tooltip="Clear all messages">
						Clear
					</button>
					<button id="export-json" data-tooltip="Export chat as JSON">
						Export
					</button>
					<button
						id="submit-btn"
						class="submit-btn"
						data-tooltip="Submit for review"
					>
						Submit
					</button>
					<icon-arrow
						text="Preview"
						action="show-preview"
						arrow-right
					></icon-arrow>
				</div>
				<div class="cards-list hide-scrollbar">
					<div class="info-editor" id="thread-info-editor">
						<div class="title">Thread</div>
						<label>
							Thread Name (optional)
							<input
								id="thread-name"
								type="text"
								autocomplete="off"
								placeholder="Custom name for this thread"
							/>
						</label>
					</div>
					<div class="info-editor" id="recipient-info-editor">
						<div class="title">Recipient</div>
						<label>
							Name
							<input
								id="recipient-name"
								type="text"
								autocomplete="off"
								placeholder="Recipient"
							/>
						</label>
						<label>
							Location
							<input
								id="recipient-location"
								type="text"
								autocomplete="off"
								placeholder="New York, NY"
							/>
						</label>
					</div>
					<div id="admin-notes-container"></div>
					<!-- cards go here -->
				</div>
				<input
					id="file-input"
					type="file"
					accept="image/*"
					style="display:none"
				/>
			</div>
		`;

		if (isIOS) this.classList.add('ios');

		const headerEl = this.shadowRoot.querySelector('.editor-header');
		const cardsListEl = this.shadowRoot.querySelector('.cards-list');
		const threadNameInput = this.shadowRoot.querySelector('#thread-name');
		const recipientNameInput = this.shadowRoot.querySelector('#recipient-name');
		const recipientLocationInput = this.shadowRoot.querySelector(
			'#recipient-location',
		);

		this.$ = {
			headerEl,
			cardsListEl,
			threadNameInput,
			recipientNameInput,
			recipientLocationInput,
		};

		if (headerEl && cardsListEl && typeof ResizeObserver === 'function') {
			this._headerObserver = new ResizeObserver((entries) => {
				for (let entry of entries) {
					const height = entry.target.getBoundingClientRect().height;
					cardsListEl.style.setProperty(
						'--editor-header-height',
						`${height}px`,
					);
				}
			});
			this._headerObserver.observe(headerEl);

			// Re-run resize on all cards and pause the iOS viewport squish behavior when the pane becomes visible.
			let prevWidth = 0;
			this._cardsListVisibilityObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const width = entry.contentRect.width;
					if (prevWidth === 0 && width > 0) {
						pauseIOSViewport();
						for (const card of this.shadowRoot.querySelectorAll(
							'.editor-card',
						)) {
							const textarea = card.shadowRoot?.querySelector('textarea');
							if (textarea) {
								textarea.style.height = 'auto';
								textarea.style.height = `${textarea.scrollHeight}px`;
							}
						}
					} else if (prevWidth > 0 && width === 0) {
						resumeIOSViewport();
					}
					prevWidth = width;
				}
			});
			this._cardsListVisibilityObserver.observe(cardsListEl);
		}

		const onThreadNameInput = () => {
			if (store.isCurrentThreadSubmitted()) return;
			const currentThread = store.getCurrentThread();
			if (currentThread) {
				store.updateThreadName(
					currentThread.id,
					this.$?.threadNameInput?.value ?? '',
				);
			}
		};
		this._onThreadNameInput = onThreadNameInput;
		if (threadNameInput)
			threadNameInput.addEventListener('input', onThreadNameInput);

		const onRecipientInput = () => {
			if (store.isCurrentThreadSubmitted()) return;
			store.updateRecipient({
				name: this.$?.recipientNameInput?.value ?? '',
				location: this.$?.recipientLocationInput?.value ?? '',
			});
		};
		this._onRecipientInput = onRecipientInput;
		if (recipientNameInput)
			recipientNameInput.addEventListener('input', onRecipientInput);
		if (recipientLocationInput)
			recipientLocationInput.addEventListener('input', onRecipientInput);

		if (isIOS) {
			this._onKeyboardHidden = () => {
				window.scrollTo(0, 0);
			};
			document.addEventListener(
				'ios-viewport:keyboard-hidden',
				this._onKeyboardHidden,
			);
		}

		this.shadowRoot.addEventListener('editor:update', this._onDelegated);
		this.shadowRoot.addEventListener('editor:delete', this._onDelegated);
		this.shadowRoot.addEventListener('editor:add-below', this._onDelegated);
		this.shadowRoot.addEventListener('editor:insert-image', this._onDelegated);
		this.shadowRoot.addEventListener('focusin', this._onFocusIn, true);
		this.shadowRoot
			.getElementById('export-json')
			.addEventListener('click', () => {
				const dataStr = store.exportJson(true);
				const blob = new Blob([dataStr], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `chat-export-${Date.now()}.json`;
				a.click();
				URL.revokeObjectURL(url);
			});
		this.shadowRoot
			.getElementById('clear-chat')
			.addEventListener('click', () => {
				if (confirm('Are you sure you want to clear all messages?')) {
					store.clear();
				}
			});

		this.shadowRoot
			.getElementById('submit-btn')
			.addEventListener('click', this._onSubmit.bind(this));

		store.addEventListener('messages:changed', this._onStoreChange);
		store.load();
		const currentThread = store.getCurrentThread();
		this.#syncThreadInput(currentThread);
		this.#syncRecipientInputs(store.getRecipient());
		this.#syncSubmitButton(currentThread);
		this.#syncAdminNotes(currentThread);
		this.#render(store.getMessages());
		this._cleanupTooltips = initTooltips(this.shadowRoot, this);

		this.#syncReadOnlyState();
		this.#syncAuthorInfoMode(currentThread);

		// Auto-submit if returning from magic link verification
		this.#checkPendingSubmission();
		authState.addEventListener('change', () => this.#checkPendingSubmission());
	}

	disconnectedCallback() {
		resumeIOSViewport();
		if (this._onKeyboardHidden) {
			document.removeEventListener(
				'ios-viewport:keyboard-hidden',
				this._onKeyboardHidden,
			);
			this._onKeyboardHidden = null;
		}

		this.shadowRoot.removeEventListener('editor:update', this._onDelegated);
		this.shadowRoot.removeEventListener('editor:delete', this._onDelegated);
		this.shadowRoot.removeEventListener('editor:add-below', this._onDelegated);
		this.shadowRoot.removeEventListener(
			'editor:insert-image',
			this._onDelegated,
		);
		this.shadowRoot.removeEventListener('focusin', this._onFocusIn, true);
		store.removeEventListener('messages:changed', this._onStoreChange);
		if (this.$?.threadNameInput && this._onThreadNameInput) {
			this.$.threadNameInput.removeEventListener(
				'input',
				this._onThreadNameInput,
			);
		}
		if (this.$?.recipientNameInput && this._onRecipientInput) {
			this.$.recipientNameInput.removeEventListener(
				'input',
				this._onRecipientInput,
			);
		}
		if (this.$?.recipientLocationInput && this._onRecipientInput) {
			this.$.recipientLocationInput.removeEventListener(
				'input',
				this._onRecipientInput,
			);
		}
		this._cleanupTooltips?.();
		if (this._headerObserver) {
			this._headerObserver.disconnect();
			this._headerObserver = null;
		}
		if (this._cardsListVisibilityObserver) {
			this._cardsListVisibilityObserver.disconnect();
			this._cardsListVisibilityObserver = null;
		}
	}

	_showSubmitDialog() {
		return new Promise((resolve) => {
			const {
				overlay,
				modal,
				close: removeDialog,
			} = createDialog({ closeOnOverlayClick: false });

			let submitting = false;

			const close = (value) => {
				if (submitting) return;
				removeDialog();
				resolve(value);
			};

			// --- initial email form ---

			const titleEl = document.createElement('div');
			titleEl.style.cssText = dialogTitleStyle;
			titleEl.textContent = 'Email Confirmation Required';
			modal.appendChild(titleEl);

			const subtitleEl = document.createElement('div');
			subtitleEl.style.cssText = dialogBodyStyle;
			subtitleEl.textContent =
				"In order to submit you'll need to enter an email address.";
			modal.appendChild(subtitleEl);

			const emailInput = document.createElement('input');
			emailInput.type = 'email';
			emailInput.placeholder = 'you@example.com';
			emailInput.style.cssText = dialogInputStyle;
			modal.appendChild(emailInput);

			const noteEl = document.createElement('div');
			noteEl.style.cssText = dialogBodyStyle;
			noteEl.textContent =
				"You'll receive an email with a link to complete your submission. This email address is where we will reach out to you regarding your submission status, and to arrange payment if your piece is accepted, so make sure to use one an address that you check somewhat regularly.";
			modal.appendChild(noteEl);

			const btnRow = document.createElement('div');
			btnRow.style.cssText = dialogButtonRowStyle;
			modal.appendChild(btnRow);

			const cancelBtn = document.createElement('button');
			cancelBtn.type = 'button';
			cancelBtn.style.cssText = dialogCancelButtonStyle;
			cancelBtn.textContent = 'Cancel';
			btnRow.appendChild(cancelBtn);

			const confirmBtn = document.createElement('button');
			confirmBtn.type = 'button';
			confirmBtn.style.cssText = dialogConfirmButtonStyle;
			confirmBtn.textContent = 'Submit';
			btnRow.appendChild(confirmBtn);

			// --- behaviour ---

			const submit = async () => {
				const value = emailInput.value.trim();
				if (!value) return;

				submitting = true;
				confirmBtn.disabled = true;
				confirmBtn.textContent = 'Sending...';

				try {
					await authState.requestMagicLink(value);
					const pendingThread = store.getCurrentThread();
					if (pendingThread) {
						store.markThreadPending(pendingThread.id);
					}

					const btn = this.shadowRoot.getElementById('submit-btn');
					if (btn) {
						btn.disabled = true;
						btn.textContent = PENDING_LABEL;
						btn.setAttribute('data-tooltip', PENDING_TOOLTIP);
					}

					modal.innerHTML = html`
						<div
							style="${dialogTitleStyle} margin-bottom: 16px;"
						>
							<b>Note: further action required to submit.</b>
						</div>
						<div style="${dialogBodyStyle} margin-bottom: 16px;">
							<b>You should receive an email shortly</b>, with a link to
							complete your submission.
						</div>
						<div style="${dialogBodyStyle} margin-bottom: 16px;">
							Email sent to: ${value}
						</div>
						<div style="${dialogBodyStyle}">
							The link will expire in 30 minutes. If you don't receive this
							email please contact us. Your email provider might identify this
							email as spam. <b>Check your spam folder.</b>
						</div>
						<div style="${dialogButtonRowStyle}">
							<button
								type="button"
								data-role="close"
								style="${dialogCancelButtonStyle}"
							>
								Close
							</button>
						</div>
					`;

					submitting = false;
					modal
						.querySelector('[data-role="close"]')
						.addEventListener('click', () => close(value));
				} catch (error) {
					submitting = false;
					alert(
						'Failed to send verification email: ' +
							(error.message || 'Unknown error'),
					);
					confirmBtn.disabled = false;
					confirmBtn.textContent = 'Submit';
				}
			};

			cancelBtn.addEventListener('click', () => close(null));
			confirmBtn.addEventListener('click', submit);
			emailInput.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') submit();
			});

			overlay.addEventListener('click', () => close(null));

			emailInput.focus();
		});
	}

	async _onSubmit() {
		if (store.getCurrentThread()?.authorInfoMode) {
			await this.#submitAuthorInfo();
			return;
		}

		const btn = this.shadowRoot.getElementById('submit-btn');
		if (!btn || btn.disabled) return;

		const currentThread = store.getCurrentThread();
		if (!currentThread) {
			alert('No thread selected');
			return;
		}

		const isResubmit = !!currentThread.backendId;
		const payload = {
			name: currentThread.name,
			participants: currentThread.participants || [],
			messages: store
				.getMessages()
				.filter((m) => m.message?.trim() || m.images?.length)
				.map((m) => ({
					sender: m.sender,
					message: m.message,
					timestamp: m.timestamp,
				})),
		};

		if (payload.messages.length === 0) {
			await showDialog({
				title: 'Nothing to submit',
				body: 'Please add at least one message before submitting.',
			});
			return;
		}

		const recipientName = currentThread.participants?.[0]?.full_name?.trim();
		if (!recipientName) {
			await showDialog({
				title: 'Recipient required',
				body: 'Please add a recipient name before submitting.',
			});
			return;
		}

		if (authState.isAuthenticated || isResubmit) {
			if (!isResubmit) {
				const email = authState.user?.email;
				const confirm = await showDialog({
					title: 'Confirm Submission',
					body: `The current email address we have for you is: ${email}. If that is correct, please submit. If not, you can edit it.`,
					buttons: [
						{
							label: 'Edit Email',
							value: 'edit-email',
							style: dialogCancelButtonStyle,
						},
						{
							label: 'Submit',
							value: 'submit',
							style: dialogConfirmButtonStyle,
						},
					],
				});
				if (confirm === 'edit-email') {
					await this._showSubmitDialog();
					return;
				}
				if (confirm !== 'submit') return;
			}

			btn.disabled = true;
			btn.textContent = SUBMITTING_LABEL;
			btn.setAttribute('data-tooltip', SUBMITTING_TOOLTIP);

			try {
				if (isResubmit) {
					await apiClient.resubmitThread(currentThread.backendId, {
						...payload,
						...(currentThread.editToken && {
							edit_token: currentThread.editToken,
						}),
					});
					delete currentThread.adminNotes;
					delete currentThread.editToken;
					store.save();
					this.#syncAdminNotes(currentThread);
				} else {
					const result = await apiClient.submitThread(payload);
					store.setThreadBackendId(currentThread.id, result.id);
				}

				store.markThreadSubmitted(currentThread.id);
				btn.textContent = SUBMITTED_LABEL;
				btn.setAttribute('data-tooltip', SUBMITTED_TOOLTIP);
				await showDialog({
					title: 'Submitted',
					body: isResubmit
						? 'Your piece has been resubmitted for review!'
						: 'Your piece has been submitted for review! You will receive an email when it is reviewed.',
				});
			} catch (error) {
				alert('Failed to submit: ' + (error.message || 'Unknown error'));
				btn.disabled = false;
				btn.textContent = SUBMIT_LABEL;
				btn.setAttribute('data-tooltip', SUBMIT_TOOLTIP);
			}
		} else {
			await this._showSubmitDialog();
		}
	}

	async #checkPendingSubmission() {
		if (!authState.isAuthenticated) return;

		const pendingThreads = store.listPendingThreads();
		if (pendingThreads.length === 0) return;

		// Auth is complete — clear the pending flag on every thread before submitting,
		// so the submit button doesn't get disabled mid-loop.
		for (const thread of pendingThreads) {
			store.clearThreadPending(thread.id);
		}

		const btn = this.shadowRoot?.getElementById('submit-btn');
		if (btn) {
			btn.disabled = true;
			btn.textContent = SUBMITTING_LABEL;
			btn.setAttribute('data-tooltip', SUBMITTING_TOOLTIP);
		}

		let successCount = 0;
		const failed = [];

		for (const thread of pendingThreads) {
			const payload = {
				name: thread.name,
				participants: thread.participants || [],
				messages: store
					.getMessagesForThread(thread)
					.filter((m) => m.message?.trim() || m.images?.length)
					.map((m) => ({
						sender: m.sender,
						message: m.message,
						timestamp: m.timestamp,
					})),
			};
			try {
				const result = await apiClient.submitThread(payload);
				store.setThreadBackendId(thread.id, result.id);
				store.markThreadSubmitted(thread.id);
				successCount++;
			} catch (error) {
				failed.push({ thread, error });
			}
		}

		this.#syncSubmitButton(store.getCurrentThread());

		if (successCount > 0) {
			const body =
				successCount === 1
					? 'Your piece has been submitted for review! You will receive an email when it is reviewed.'
					: `${successCount} pieces have been submitted for review! You will receive an email when they are reviewed.`;
			await showDialog({ title: 'Submitted', body });
		}

		for (const { thread, error } of failed) {
			alert(
				`Failed to submit "${store.getThreadDisplayName(thread)}": ${error.message || 'Unknown error'}`,
			);
		}
	}

	_onStoreChange(e) {
		const { reason, message, messages, recipient } = e.detail || {};
		if (recipient) this.#syncRecipientInputs(recipient);

		// Handle thread changes - reload everything
		if (
			reason === 'thread-changed' ||
			reason === 'load' ||
			reason === 'init-defaults' ||
			reason === 'thread-submitted' ||
			reason === 'thread-pending'
		) {
			const currentThread = store.getCurrentThread();
			this.#syncThreadInput(currentThread);
			this.#syncRecipientInputs(store.getRecipient());
			this.#syncSubmitButton(currentThread);
			this.#syncAdminNotes(currentThread);
			this.#render(store.getMessages());
			this.#syncReadOnlyState();
			this.#syncAuthorInfoMode(currentThread);
			return;
		}

		// Handle thread updates (name changes)
		if (reason === 'thread-updated') {
			const currentThread = store.getCurrentThread();
			this.#syncThreadInput(currentThread);
			return;
		}

		switch (reason) {
			case 'add':
				this.#onAdd(message, messages);
				break;
			case 'update':
				this.#onUpdate(message);
				break;
			case 'delete':
				this.#onDelete(message);
				break;
			case 'timesince-updated':
				this.#render(messages);
				break;
			case 'recipient':
				// No-op: we already synced inputs above; avoid rerendering cards while typing.
				break;
			default:
				this.#render(messages);
				break;
		}
	}

	#syncThreadInput(thread) {
		const threadNameInput = this.$?.threadNameInput;
		if (!threadNameInput) return;
		const active = this.shadowRoot && this.shadowRoot.activeElement;
		const threadName = thread && thread.name ? thread.name : '';
		const placeholder =
			thread && thread.participants?.[0]?.full_name
				? `Chat with ${thread.participants[0].full_name}`
				: 'Custom name for this thread';
		threadNameInput.placeholder = placeholder;
		if (active !== threadNameInput && threadNameInput.value !== threadName) {
			threadNameInput.value = threadName;
		}
	}

	#syncRecipientInputs(recipient) {
		const nameInput = this.$?.recipientNameInput;
		const locationInput = this.$?.recipientLocationInput;
		if (!nameInput || !locationInput) return;
		const active = this.shadowRoot && this.shadowRoot.activeElement;
		const name =
			recipient && typeof recipient.name === 'string' ? recipient.name : '';
		const location =
			recipient && typeof recipient.location === 'string'
				? recipient.location
				: '';
		if (active !== nameInput && nameInput.value !== name)
			nameInput.value = name;
		if (active !== locationInput && locationInput.value !== location)
			locationInput.value = location;
	}

	#syncSubmitButton(thread) {
		const btn = this.shadowRoot?.getElementById('submit-btn');
		if (!btn) return;
		if (thread?.authorInfoMode) {
			if (thread.authorInfoSubmitted) {
				btn.disabled = true;
				btn.textContent = 'Submitted';
				btn.setAttribute('data-tooltip', 'Info already submitted');
			} else {
				btn.disabled = false;
				btn.textContent = 'Submit Info';
				btn.setAttribute('data-tooltip', 'Submit author and payment info');
			}
			return;
		}
		const isPending = store.isCurrentThreadPending();
		const isSubmitted = store.isCurrentThreadSubmitted();
		if (isSubmitted) {
			btn.disabled = true;
			btn.textContent = SUBMITTED_LABEL;
			btn.setAttribute('data-tooltip', SUBMITTED_TOOLTIP);
		} else if (isPending) {
			btn.disabled = true;
			btn.textContent = PENDING_LABEL;
			btn.setAttribute('data-tooltip', PENDING_TOOLTIP);
		} else {
			btn.textContent = SUBMIT_LABEL;
			btn.setAttribute('data-tooltip', SUBMIT_TOOLTIP);
		}
	}

	#syncAdminNotes(thread) {
		const container = this.shadowRoot?.getElementById('admin-notes-container');
		if (!container) return;
		const notes = thread?.adminNotes;
		if (notes && notes.length > 0) {
			container.innerHTML = `
				<div class="admin-notes-banner">
					<div class="banner-title">Editor's Notes</div>
					${notes.map((n) => `<div class="banner-note">${this.#escapeHtml(n)}</div>`).join('')}
				</div>
			`;
		} else {
			container.innerHTML = '';
		}
	}

	#escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	#syncReadOnlyState() {
		// In author info mode, input state is managed by #syncAuthorInfoMode
		if (store.getCurrentThread()?.authorInfoMode) return;

		const submitted = store.isCurrentThreadSubmitted();
		const pending = store.isCurrentThreadPending();
		const threadNameInput = this.$?.threadNameInput;
		const recipientNameInput = this.$?.recipientNameInput;
		const recipientLocationInput = this.$?.recipientLocationInput;
		const clearBtn = this.shadowRoot?.getElementById('clear-chat');
		const submitBtn = this.shadowRoot?.getElementById('submit-btn');

		if (threadNameInput) threadNameInput.disabled = submitted;
		if (recipientNameInput) recipientNameInput.disabled = submitted;
		if (recipientLocationInput) recipientLocationInput.disabled = submitted;
		if (clearBtn) clearBtn.disabled = submitted;
		if (submitBtn) {
			submitBtn.disabled = submitted || pending;
		}

		const cardsList = this.shadowRoot?.querySelector('.cards-list');
		if (cardsList) {
			cardsList.classList.toggle('readonly', submitted);
		}

	}

	_onFocusIn(e) {
		// Find the message-card element that contains the focused element
		// Use composedPath to traverse shadow boundaries
		const path = e.composedPath();
		const card = path.find(
			(el) => el instanceof HTMLElement && el.tagName === 'MESSAGE-CARD',
		);
		if (!card) return;

		// Remove focused from the previously focused card
		if (this._lastFocusedCard && this._lastFocusedCard !== card) {
			this._lastFocusedCard.classList.remove('focused');
		}

		// Add focused to the newly focused card
		card.classList.add('focused');
		this._lastFocusedCard = card;

		// Dispatch event to scroll to this message in thread-preview
		const messageId = card.getAttribute('message-id');
		if (messageId) {
			this.dispatchEvent(
				new CustomEvent('editor:focus-message', {
					detail: { id: messageId },
					bubbles: true,
					composed: true,
				}),
			);
		}
	}

	_onDelegated(e) {
		if (store.isCurrentThreadSubmitted()) return;
		const { id, patch } = e.detail || {};
		if (e.type === 'editor:update' && id && patch) {
			if (patch.initialTime !== undefined) {
				store.updateInitialMessageTime(patch.initialTime);
			} else {
				store.updateMessage(id, patch);
			}
		} else if (e.type === 'editor:delete' && id) {
			store.deleteMessage(id);
		} else if (e.type === 'editor:add-below' && id) {
			store.addMessage(id);
		} else if (e.type === 'editor:insert-image' && id) {
			const fileInput = this.shadowRoot.getElementById('file-input');
			fileInput.onchange = async () => {
				const file = fileInput.files && fileInput.files[0];
				if (!file) return;
				const dataUrl = await this.#fileToDataUrl(file);
				store.updateMessage(
					id,
					((m) => {
						const images = Array.isArray(m.images) ? m.images.slice() : [];
						images.push({ id: this.#generateId(), src: dataUrl });
						return { images };
					})(store.getMessages().find((m) => m.id === id) || { images: [] }),
				);
				fileInput.value = '';
			};
			fileInput.click();
		}
	}

	async #fileToDataUrl(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onerror = () => reject(reader.error);
			reader.onload = () => resolve(String(reader.result));
			reader.readAsDataURL(file);
		});
	}

	#generateId() {
		try {
			if (
				window &&
				window.crypto &&
				typeof window.crypto.randomUUID === 'function'
			) {
				return window.crypto.randomUUID();
			}
		} catch (_e) {}
		return (
			'img_' +
			Date.now().toString(36) +
			'_' +
			Math.random().toString(36).slice(2, 10)
		);
	}

	#queryCardById(id) {
		return this.shadowRoot.querySelector(`.editor-card[message-id="${id}"]`);
	}

	#ensureCardForMessage(m) {
		let card = this.#queryCardById(m.id);
		if (!card) {
			card = document.createElement('message-card');
			card.classList.add('editor-card');
			card.setAttribute('message-id', m.id);
		}
		return card;
	}

	get #isReadOnly() {
		return store.isCurrentThreadSubmitted();
	}

	get #isOnly() {
		return store.getMessages().length === 1;
	}

	#syncCard(card, m, isFirst = false) {
		card.update({
			text: typeof m.message === 'string' ? m.message : '',
			sender: m.sender || 'self',
			timestamp: m.timestamp || '',
			timeSincePrevious: isFirst ? 'PT1M' : m.timeSincePrevious || 'PT1M',
			exactTimestamp: m.exactTimestamp || '',
			isFirst,
			isOnly: this.#isOnly,
			isReadOnly: this.#isReadOnly,
		});
	}

	// Updates isFirst, isOnly, isReadOnly on all cards after structural changes
	// (add/delete). Message data is left untouched — only flags are updated.
	#syncCardFlags() {
		const cards = [
			...(this.shadowRoot?.querySelectorAll('.editor-card') || []),
		];
		cards.forEach((card, i) => {
			card.update({ isFirst: i === 0, isOnly: this.#isOnly, isReadOnly: this.#isReadOnly });
		});
	}

	#insertCardAtIndex(card, index) {
		const cardsList =
			this.shadowRoot && this.shadowRoot.querySelector('.cards-list');
		if (!cardsList) return;
		const cards = cardsList.querySelectorAll('.editor-card');
		const referenceNode = cards[index] || null;
		if (card !== referenceNode) {
			cardsList.insertBefore(card, referenceNode);
		}
	}

	#onAdd(message, messages) {
		if (!message || !Array.isArray(messages)) {
			this.#render(messages || []);
			return;
		}
		const index = messages.findIndex((m) => m && m.id === message.id);
		if (index === -1) {
			this.#render(messages);
			return;
		}
		const card = this.#ensureCardForMessage(message);
		this.#syncCard(card, message, index === 0);
		this.#insertCardAtIndex(card, index);
		this.#syncCardFlags();
		// Focus the newly created card's textarea
		requestAnimationFrame(() => {
			if (card && typeof card.focus === 'function') {
				card.scrollCardToTopOnIOS();
				card.focusTextarea();
			}
		});
	}

	#onUpdate(message) {
		if (!message || !message.id) return;
		const card = this.#queryCardById(message.id);
		if (!card) return;
		const cards = this.shadowRoot?.querySelectorAll('.editor-card');
		const isFirst = cards && cards.length > 0 && cards[0] === card;
		this.#syncCard(card, message, isFirst);
	}

	#onDelete(message) {
		if (!message || !message.id) return;
		const card = this.#queryCardById(message.id);
		if (card && card.remove) card.remove();
		this.#syncCardFlags();
	}

	#render(messages) {
		// In author info mode, rendering is handled by #syncAuthorInfoMode
		if (store.getCurrentThread()?.authorInfoMode) return;

		const cardsList =
			this.shadowRoot && this.shadowRoot.querySelector('.cards-list');
		if (!cardsList) return;

		// If there are no messages and the thread is editable, seed one blank message
		if (
			(!messages || messages.length === 0) &&
			!store.isCurrentThreadSubmitted()
		) {
			for (const card of this.shadowRoot.querySelectorAll('.editor-card')) {
				card.remove();
			}
			store.addMessage();
			return;
		}

		const existing = new Map(
			Array.from(this.shadowRoot.querySelectorAll('.editor-card'))
				.filter((node) => node instanceof HTMLElement)
				.map((node) => [node.getAttribute('message-id'), node]),
		);

		messages.forEach((m, index) => {
			let card = existing.get(m.id);
			if (!card) {
				card = document.createElement('message-card');
				card.classList.add('editor-card');
				card.setAttribute('message-id', m.id);
			}
			const referenceNode =
				this.shadowRoot.querySelectorAll('.editor-card')[index] || null;
			if (card !== referenceNode) {
				cardsList.insertBefore(card, referenceNode);
			}
			this.#syncCard(card, m, index === 0);
			existing.delete(m.id);
		});

		for (const leftover of existing.values()) {
			leftover.remove();
		}
	}

	#escapeAttr(text) {
		return String(text ?? '')
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	#syncAuthorInfoMode(thread) {
		const clearBtn = this.shadowRoot?.getElementById('clear-chat');
		const exportBtn = this.shadowRoot?.getElementById('export-json');
		const threadNameInput = this.$?.threadNameInput;
		const recipientNameInput = this.$?.recipientNameInput;
		const recipientLocationInput = this.$?.recipientLocationInput;

		const threadInfoEditor =
			this.shadowRoot?.getElementById('thread-info-editor');
		const recipientInfoEditor = this.shadowRoot?.getElementById(
			'recipient-info-editor',
		);

		if (!thread?.authorInfoMode) {
			// Restore hidden buttons and editors
			if (clearBtn) clearBtn.style.display = '';
			if (exportBtn) exportBtn.style.display = '';
			if (threadInfoEditor) threadInfoEditor.style.display = '';
			if (recipientInfoEditor) recipientInfoEditor.style.display = '';
			// Remove injected form if present
			this.shadowRoot?.getElementById('author-info-section')?.remove();
			return;
		}

		// Hide Clear, Export buttons and Thread/Recipient editors
		if (clearBtn) clearBtn.style.display = 'none';
		if (exportBtn) exportBtn.style.display = 'none';
		if (threadInfoEditor) threadInfoEditor.style.display = 'none';
		if (recipientInfoEditor) recipientInfoEditor.style.display = 'none';

		// Ensure cards-list readonly class is cleared (may be set from a previously submitted thread)
		this.shadowRoot?.querySelector('.cards-list')?.classList.remove('readonly');

		// Disable thread name and recipient inputs
		if (threadNameInput) threadNameInput.disabled = true;
		if (recipientNameInput) recipientNameInput.disabled = true;
		if (recipientLocationInput) recipientLocationInput.disabled = true;

		// Remove existing cards
		for (const card of this.shadowRoot.querySelectorAll('.editor-card')) {
			card.remove();
		}

		// Remove existing author-info-section (to re-render)
		this.shadowRoot?.getElementById('author-info-section')?.remove();

		const ex = thread.existingAuthorInfo;
		const section = document.createElement('div');
		section.id = 'author-info-section';

		if (thread.authorInfoSubmitted) {
			section.innerHTML = `
				<div class="info-editor">
					<div class="title">Submitted</div>
					<p style="font: 14px system-ui; color: var(--color-ink); margin: 0;">
						Your info has been received. We'll be in touch when your piece is published.
					</p>
				</div>
			`;
		} else {
			section.innerHTML = `
				<div class="info-editor">
					<div class="title">Payment Info</div>
					<label>Payment platform
						<input id="ai-platform" type="text" placeholder="e.g. Venmo, PayPal, Cash App" value="${this.#escapeAttr(ex?.payment_platform)}" />
					</label>
					<label>Payment username
						<input id="ai-username" type="text" placeholder="Your username on that platform" value="${this.#escapeAttr(ex?.payment_username)}" />
					</label>
				</div>
				<div class="info-editor">
					<div class="title">Author Info <span class="optional">(optional)</span></div>
					<label>Display name
						<input id="ai-name" type="text" placeholder="Leave blank to publish anonymously" value="${this.#escapeAttr(ex?.name)}" />
					</label>
					<label>Link
						<input id="ai-link" type="url" placeholder="https://your-website.com" value="${this.#escapeAttr(ex?.link)}" />
					</label>
					<label>Bio
						<textarea id="ai-bio" placeholder="A short bio...">${this.#escapeHtml(ex?.bio ?? '')}</textarea>
					</label>
				</div>
			`;
		}

		// Insert after admin-notes-container
		const adminNotes = this.shadowRoot?.getElementById('admin-notes-container');
		if (adminNotes) {
			adminNotes.after(section);
		} else {
			this.shadowRoot?.querySelector('.cards-list')?.appendChild(section);
		}
	}

	async #submitAuthorInfo() {
		const btn = this.shadowRoot.getElementById('submit-btn');
		const thread = store.getCurrentThread();
		if (!thread?.authorInfoToken || btn?.disabled) return;

		const platform = this.shadowRoot
			.getElementById('ai-platform')
			?.value?.trim();
		const username = this.shadowRoot
			.getElementById('ai-username')
			?.value?.trim();
		if (!platform || !username) {
			await showDialog({
				title: 'Required fields missing',
				body: 'Payment platform and username are required.',
			});
			return;
		}

		btn.disabled = true;
		btn.textContent = 'Submitting...';

		const data = {
			payment_platform: platform,
			payment_username: username,
			name: this.shadowRoot.getElementById('ai-name')?.value?.trim() || null,
			link: this.shadowRoot.getElementById('ai-link')?.value?.trim() || null,
			bio: this.shadowRoot.getElementById('ai-bio')?.value?.trim() || null,
		};

		try {
			await apiClient.submitAuthorInfo(
				thread.backendId,
				thread.authorInfoToken,
				data,
			);
			thread.authorInfoSubmitted = true;
			store.save();
			this.#syncAuthorInfoMode(thread);
			btn.textContent = 'Submitted';
			btn.disabled = true;
			await showDialog({
				title: 'Thank you!',
				body: "Your info has been received. We'll be in touch when your piece is published.",
			});
		} catch (err) {
			btn.disabled = false;
			btn.textContent = 'Submit Info';
			alert('Failed to submit: ' + (err.message || 'Unknown error'));
		}
	}
}

customElements.define('create-editor', ChatEditor);
