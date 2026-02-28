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
	createDialog,
	showDialog,
	dialogTitleStyle,
	dialogBodyStyle,
	dialogButtonRowStyle,
	dialogCancelButtonStyle,
	dialogConfirmButtonStyle,
} from '../utils/dialog.js';

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
					.editor-header icon-arrow[reversed] {
						display: none;
					}
				}

				/* Hide Threads arrow at desktop (1200px+) since all panes are visible */
				@media ${MQ.desktop} {
					.editor-header icon-arrow:not([reversed]) {
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
				.info-editor input {
					all: unset;
					font: 14px system-ui;
					color: var(--color-ink);
					padding: 8px 10px;
					border: 1px solid var(--color-edge);
					border-radius: 8px;
					background: var(--color-header);
				}
				.info-editor input::placeholder {
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
					<button id="export-json" data-tooltip="Export chat as JSON">
						Export
					</button>
					<button id="clear-chat" data-tooltip="Clear all messages">
						Clear
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
						reversed
					></icon-arrow>
				</div>
				<div class="cards-list hide-scrollbar">
					<div class="info-editor">
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
					<div class="info-editor">
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
		initTooltips(this.shadowRoot, this);

		this.#syncReadOnlyState();

		// Auto-submit if returning from magic link verification
		this.#checkPendingSubmission();
		authState.addEventListener('change', () => this.#checkPendingSubmission());
	}

	disconnectedCallback() {
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
		if (this._headerObserver) {
			this._headerObserver.disconnect();
			this._headerObserver = null;
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
			titleEl.textContent = 'Submit';
			modal.appendChild(titleEl);

			const subtitleEl = document.createElement('div');
			subtitleEl.style.cssText = `font: 13px system-ui; color: var(--color-ink-subdued); margin-bottom: 16px; line-height: 1.4;`;
			subtitleEl.textContent = 'Enter an email address.';
			modal.appendChild(subtitleEl);

			const emailInput = document.createElement('input');
			emailInput.type = 'email';
			emailInput.placeholder = 'you@example.com';
			emailInput.style.cssText = `
				width: 100%; font: 14px system-ui; color: var(--color-ink);
				padding: 10px 12px; border: 1px solid var(--color-edge);
				border-radius: 8px; background: var(--color-header);
				margin-bottom: 16px; box-sizing: border-box;
			`;
			modal.appendChild(emailInput);

			const noteEl = document.createElement('div');
			noteEl.style.cssText = dialogBodyStyle;
			noteEl.textContent =
				"You'll receive an email with a link to complete your submission. This email address is also where we will reach out to you regarding your submission status and payment.";
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
					localStorage.setItem('pending-submission', 'true');
					const pendingThread = store.getCurrentThread();
					if (pendingThread) {
						store.markThreadPending(pendingThread.id);
					}

					const btn = this.shadowRoot.getElementById('submit-btn');
					if (btn) {
						btn.disabled = true;
						btn.textContent = 'Check your email...';
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
							Email sent to: <b>${value}</b>
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
			recipient_name: currentThread.recipient?.name,
			recipient_location: currentThread.recipient?.location,
			messages: currentThread.messages.map((m) => ({
				sender: m.sender,
				message: m.message,
				timestamp: m.timestamp,
			})),
		};

		if (authState.isAuthenticated) {
			btn.disabled = true;
			btn.textContent = isResubmit ? 'Resubmitting...' : 'Submitting...';

			try {
				if (isResubmit) {
					await apiClient.resubmitThread(currentThread.backendId, payload);
					delete currentThread.adminNotes;
					store.save();
					this.#syncAdminNotes(currentThread);
				} else {
					const result = await apiClient.submitThread(payload);
					store.setThreadBackendId(currentThread.id, result.id);
				}

				store.markThreadSubmitted(currentThread.id);
				btn.textContent = isResubmit ? 'Resubmitted' : 'Submitted';
				await showDialog({
					title: 'Submitted',
					body: isResubmit
						? 'Your piece has been resubmitted for review!'
						: 'Your piece has been submitted for review! You will receive an email when it is reviewed.',
				});
				localStorage.removeItem('pending-submission');
			} catch (error) {
				alert('Failed to submit: ' + (error.message || 'Unknown error'));
				btn.disabled = false;
				btn.textContent = isResubmit ? 'Resubmit' : 'Submit';
			}
		} else {
			await this._showSubmitDialog();
		}
	}

	async #checkPendingSubmission() {
		if (
			localStorage.getItem('pending-submission') !== 'true' ||
			!authState.isAuthenticated
		)
			return;

		const pendingThreads = store.listPendingThreads();
		if (pendingThreads.length === 0) {
			localStorage.removeItem('pending-submission');
			return;
		}

		// Auth is complete — clear the pending flag on every thread before submitting,
		// so the submit button doesn't get disabled mid-loop.
		for (const thread of pendingThreads) {
			store.clearThreadPending(thread.id);
		}

		const btn = this.shadowRoot?.getElementById('submit-btn');
		if (btn) {
			btn.disabled = true;
			btn.textContent = 'Submitting...';
		}

		let successCount = 0;
		const failed = [];

		for (const thread of pendingThreads) {
			const payload = {
				name: thread.name,
				recipient_name: thread.recipient?.name,
				recipient_location: thread.recipient?.location,
				messages: thread.messages.map((m) => ({
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

		localStorage.removeItem('pending-submission');
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
			thread && thread.recipient
				? `Chat with ${thread.recipient.name}`
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
		const isResubmit = thread && !!thread.backendId;
		const isPending = store.isCurrentThreadPending();
		const isSubmitted = store.isCurrentThreadSubmitted();
		if (isSubmitted) {
			btn.disabled = true;
			btn.textContent = 'Submitted';
		} else if (isPending) {
			btn.disabled = true;
			btn.textContent = 'Check your email...';
		} else if (!btn.disabled) {
			btn.textContent = isResubmit ? 'Resubmit' : 'Submit';
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
			if (submitted) submitBtn.textContent = 'Submitted';
			else if (pending) submitBtn.textContent = 'Check your email...';
			else submitBtn.textContent = 'Submit';
		}

		const cardsList = this.shadowRoot?.querySelector('.cards-list');
		if (cardsList) {
			cardsList.classList.toggle('readonly', submitted);
		}

		const cards = this.shadowRoot?.querySelectorAll('.editor-card') || [];
		for (const card of cards) {
			if (submitted) card.setAttribute('readonly', '');
			else card.removeAttribute('readonly');
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
			store.updateMessage(id, patch);
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

	#updateCardAttrs(card, m) {
		const ensureAttr = (el, name, value) => {
			if (value == null || value === '') {
				if (el.hasAttribute(name)) el.removeAttribute(name);
				return;
			}
			if (el.getAttribute(name) !== value) {
				el.setAttribute(name, value);
			}
		};
		const textValue = typeof m.message === 'string' ? m.message : '';
		ensureAttr(card, 'sender', m.sender || 'self');
		ensureAttr(card, 'timestamp', m.timestamp || '');
		ensureAttr(card, 'text', textValue);
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
		this.#updateCardAttrs(card, message);
		this.#insertCardAtIndex(card, index);
		this.#syncDeleteButtons();
		// Focus the newly created card's textarea
		requestAnimationFrame(() => {
			if (card && typeof card.focus === 'function') {
				card.focus();
			}
		});
	}

	#onUpdate(message) {
		if (!message || !message.id) return;
		const card = this.#queryCardById(message.id);
		if (!card) return;
		this.#updateCardAttrs(card, message);
	}

	#onDelete(message) {
		if (!message || !message.id) return;
		const card = this.#queryCardById(message.id);
		if (card && card.remove) card.remove();
		this.#syncDeleteButtons();
	}

	#render(messages) {
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

		const ensureAttr = (el, name, value) => {
			if (value == null || value === '') {
				if (el.hasAttribute(name)) el.removeAttribute(name);
				return;
			}
			if (el.getAttribute(name) !== value) {
				el.setAttribute(name, value);
			}
		};

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
			const textValue = typeof m.message === 'string' ? m.message : '';
			ensureAttr(card, 'sender', m.sender || 'self');
			ensureAttr(card, 'timestamp', m.timestamp || '');
			ensureAttr(card, 'text', textValue);
			existing.delete(m.id);
		});

		for (const leftover of existing.values()) {
			leftover.remove();
		}

		this.#syncDeleteButtons();
	}

	#syncDeleteButtons() {
		const cards = [
			...(this.shadowRoot?.querySelectorAll('.editor-card') || []),
		];
		const isOnly = cards.length === 1;
		for (const card of cards) {
			if (isOnly) card.setAttribute('only', '');
			else card.removeAttribute('only');
		}
	}
}

customElements.define('create-editor', ChatEditor);
