import { store } from './store.js';
import { getCurrentThreadId, setCurrentThreadId } from '../utils/url-state.js';
import { html } from '../utils/template.js';
import { BP } from '../utils/breakpoints.js';
import { SwipeGestureHandler } from '../utils/swipe-gesture.js';
import { FLOATING_MENU_CSS, FloatingMenu } from '../utils/floating-menu.js';
import { copySvg } from './icons/copy-svg.js';
import { trashSvg } from './icons/trash-svg.js';
import './thread-list.js';
import { router } from '../utils/router.js';

class ChatThreadList extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._display = null;
		this.$ = null;
		this._onStoreChange = this._onStoreChange.bind(this);
		this._onThreadSelect = this._onThreadSelect.bind(this);
		this._onActionClick = this._onActionClick.bind(this);
		this._onCreateThread = this._onCreateThread.bind(this);

		this._swipe = new SwipeGestureHandler();
		this.isDuplicating = false; // Track if we're currently duplicating a thread

		this._onContextMenu = this._onContextMenu.bind(this);
		this._contextMenu = null;

		this._onMenuBtnClick = this._onMenuBtnClick.bind(this);
		this._menuDropdown = null;

		this._onNavigate = this._onNavigate.bind(this);
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
				    }

				/* Confirmation Modal */
				.modal-overlay {
					position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background: rgba(0, 0, 0, 0.5);
					display: flex;
					align-items: center;
					justify-content: center;
					z-index: 1000;
					animation: fadeIn 0.2s ease;
				}
				@keyframes fadeIn {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}
				.modal {
					background: var(--color-page);
					border-radius: 14px;
					padding: 20px;
					max-width: 320px;
					width: 90%;
					box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
					animation: slideUp 0.3s ease;
				}
				@keyframes slideUp {
					from {
						transform: translateY(20px);
						opacity: 0;
					}
					to {
						transform: translateY(0);
						opacity: 1;
					}
				}
				.modal-title {
					font: 600 17px system-ui;
					color: var(--color-ink);
					margin-bottom: 8px;
				}
				.modal-message {
					font: 13px system-ui;
					color: var(--color-ink-subdued);
					margin-bottom: 20px;
					line-height: 1.4;
				}
				.modal-buttons {
					display: flex;
					gap: 8px;
				}
				.modal-button {
					flex: 1;
					padding: 11px 16px;
					border: none;
					border-radius: 8px;
					font: 600 14px system-ui;
					cursor: pointer;
					transition: opacity 0.15s;
				}
				.modal-button:active {
					opacity: 0.7;
				}
				.modal-button.cancel {
					background: var(--color-edge);
					color: var(--color-ink);
				}
				.modal-button.confirm {
					background: #ff3b30;
					color: white;
				}

				${FLOATING_MENU_CSS}
			</style>
			<thread-list
				header-title="Drafts"
				show-actions
				show-create
				show-header
				nav-text="Read"
				nav-action="back"
			></thread-list>
			<input
				id="import-file"
				type="file"
				accept=".json,application/json"
				style="display:none"
			/>
		`;

		this._display = this.shadowRoot.querySelector('thread-list');
		this.$ = this._display?.refs || {};

		this.$.newThreadBtn?.addEventListener('click', this._onCreateThread);
		this._display?.addEventListener('thread-list:select', this._onThreadSelect);
		store.addEventListener('messages:changed', this._onStoreChange);

		if (this.$.threadsContainer) {
			this._swipe.attach(this.$.threadsContainer);
			this.$.threadsContainer.addEventListener('click', this._onActionClick);
			this.$.threadsContainer.addEventListener(
				'contextmenu',
				this._onContextMenu,
			);
		}

		this.$.menuBtn?.addEventListener('click', this._onMenuBtnClick);

		this.shadowRoot
			.getElementById('import-file')
			.addEventListener('change', (e) => {
				const file = e.target.files && e.target.files[0];
				if (!file) return;
				const reader = new FileReader();
				reader.onload = (ev) => {
					try {
						const newThread = store.importJson(String(ev.target.result));
						if (newThread) setCurrentThreadId(newThread.id);
					} catch (_err) {
						alert('Error importing: Invalid JSON file');
					} finally {
						e.target.value = '';
					}
				};
				reader.readAsText(file);
			});

		this.shadowRoot.addEventListener('navigate', this._onNavigate);

		this._render();
	}

	disconnectedCallback() {
		this.$?.newThreadBtn?.removeEventListener('click', this._onCreateThread);
		this._display?.removeEventListener(
			'thread-list:select',
			this._onThreadSelect,
		);
		store.removeEventListener('messages:changed', this._onStoreChange);

		this._swipe.detach();
		this.$?.threadsContainer?.removeEventListener('click', this._onActionClick);
		this.$?.threadsContainer?.removeEventListener(
			'contextmenu',
			this._onContextMenu,
		);
		this._contextMenu?.dismiss();
		this.$?.menuBtn?.removeEventListener('click', this._onMenuBtnClick);
		this._menuDropdown?.dismiss();
		this.shadowRoot.removeEventListener('navigate', this._onNavigate);
	}

	_onNavigate(e) {
		if (e.detail?.action === 'back') {
			router.navigate('/');
		}
	}

	_onStoreChange(e) {
		const { reason } = e.detail || {};
		// Re-render on any thread-related change
		if (
			reason === 'thread-created' ||
			reason === 'thread-deleted' ||
			reason === 'thread-updated' ||
			reason === 'thread-changed' ||
			reason === 'thread-submitted' ||
			reason === 'thread-pending' ||
			reason === 'load' ||
			reason === 'init-defaults' ||
			reason === 'add' ||
			reason === 'update' ||
			reason === 'delete' ||
			reason === 'recipient' ||
			reason === 'import'
		) {
			this._render();
		}
	}

	_onCreateThread() {
		try {
			const newThread = store.createThread();
			if (newThread) {
				setCurrentThreadId(newThread.id);
				store.loadThread(newThread.id);
			}
		} catch (err) {
			console.error('Failed to create thread:', err);
		}
	}

	_onThreadSelect(e) {
		const { id } = e.detail || {};
		if (id) this._onThreadClick(id);
	}

	_onActionClick(e) {
		const button = e.target.closest('.action-button');
		if (!button) return;
		e.stopPropagation();
		const action = button.dataset.action;
		const threadId = button.dataset.threadId;
		if (!threadId) return;
		if (action === 'copy') this._onCopyThread(threadId);
		if (action === 'delete') this._onDeleteThread(threadId);
	}

	_onThreadClick(threadId) {
		if (threadId) {
			try {
				// Close any activated swipe before switching threads
				if (this._swipe.activatedWrapper) {
					this._swipe.deactivateRow(this._swipe.activatedWrapper);
				}

				setCurrentThreadId(threadId);
				store.loadThread(threadId);

				const width = window.innerWidth;
				const appContainer = document.getElementById('app');

				if (appContainer) {
					if (width < BP.tablet) {
						// Mobile: show only preview
						appContainer.setAttribute('data-mode', 'preview');
					} else if (width < BP.desktop) {
						// Tablet: show editor in left, preview in right
						appContainer.setAttribute('data-mode', 'edit');
					}
					// Desktop (>=1200px): no mode needed, all panes visible
				}
			} catch (err) {
				console.error('Failed to load thread:', err);
			}
		}
	}

	_render() {
		const threads = store.listThreads();
		const currentThreadId =
			getCurrentThreadId() || store.getCurrentThread()?.id;
		if (!this._display) return;

		// Clear the activated wrapper reference since we're re-rendering
		this._swipe.resetActivated();

		const threadItems = threads.map((thread) => {
			const displayName = store.getThreadDisplayName(thread);
			const recipientName = thread.recipient?.name || '';
			const lastMessage = this._getLastMessage(thread);
			const timeDisplay = this._formatTime(thread.updatedAt);
			return {
				id: thread.id,
				name: displayName,
				recipientName,
				preview: lastMessage,
				time: timeDisplay,
				submitted: Boolean(thread.submittedAt),
				pending: Boolean(thread.pendingAt && !thread.submittedAt),
				changesRequested: Boolean(
					thread.adminNotes?.length && !thread.submittedAt,
				),
			};
		});

		this._display.setThreads(threadItems);
		const activeId = this.isDuplicating ? null : currentThreadId;
		this._display.setActiveId(activeId);
	}

	_getLastMessage(thread) {
		if (!thread.messages || thread.messages.length === 0) {
			return 'No messages yet';
		}
		const lastMsg = thread.messages[thread.messages.length - 1];
		if (lastMsg.message) return lastMsg.message;
		if (lastMsg.images && lastMsg.images.length > 0) return '(Image)';
		return 'No messages yet';
	}

	_formatTime(timestamp) {
		if (!timestamp) return '';

		const date = new Date(timestamp);
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

		// Format as date
		const month = date.getMonth() + 1;
		const day = date.getDate();
		return `${month}/${day}`;
	}

	_escapeHtml(text) {
		if (!text) return '';
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	_onCopyThread(threadId) {
		try {
			// Set flag to prevent marking old thread as active during duplication
			this.isDuplicating = true;

			const newThread = store.duplicateThread(threadId);
			if (!newThread) {
				console.error('Failed to duplicate thread');
				this.isDuplicating = false;
				return;
			}

			setCurrentThreadId(newThread.id);
			store.loadThread(newThread.id);

			this.isDuplicating = false;

			// Close the swipe after switching threads
			const wrapper = this._display?.shadowRoot?.querySelector(
				`.thread-row-wrapper[data-thread-id="${threadId}"]`,
			);
			if (wrapper) {
				this._swipe.deactivateRow(wrapper);
			}

			console.log('Thread copied successfully');
		} catch (err) {
			console.error('Failed to copy thread:', err);
			this.isDuplicating = false;
		}
	}

	_onDeleteThread(threadId) {
		this._showDeleteConfirmation(threadId);
	}

	_showDeleteConfirmation(threadId) {
		const thread = store.listThreads().find((t) => t.id === threadId);
		const displayName = thread ? store.getThreadDisplayName(thread) : 'this';

		const modal = document.createElement('div');
		modal.className = 'modal-overlay';
		modal.innerHTML = html`
			<div class="modal">
				<div class="modal-title">Delete Thread</div>
				<div class="modal-message">
					Are you sure you want to delete ${this._escapeHtml(displayName)}? This
					action cannot be undone.
				</div>
				<div class="modal-buttons">
					<button class="modal-button cancel">Cancel</button>
					<button class="modal-button confirm">Delete</button>
				</div>
			</div>
		`;

		const cancelBtn = modal.querySelector('.modal-button.cancel');
		const confirmBtn = modal.querySelector('.modal-button.confirm');

		const closeModal = () => modal.remove();

		cancelBtn.addEventListener('click', () => {
			closeModal();
			const wrapper = this._display?.shadowRoot?.querySelector(
				`.thread-row-wrapper[data-thread-id="${threadId}"]`,
			);
			if (wrapper) {
				this._swipe.deactivateRow(wrapper);
			}
		});

		confirmBtn.addEventListener('click', () => {
			closeModal();
			this._deleteThread(threadId);
		});

		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				closeModal();
				const wrapper = this._display?.shadowRoot?.querySelector(
					`.thread-row-wrapper[data-thread-id="${threadId}"]`,
				);
				if (wrapper) {
					this._swipe.deactivateRow(wrapper);
				}
			}
		});

		this.shadowRoot.appendChild(modal);
	}

	_onMenuBtnClick() {
		if (this._menuDropdown?.isOpen) {
			this._menuDropdown.dismiss();
			return;
		}
		const rect = this.$.menuBtn.getBoundingClientRect();
		this._showMenuDropdown(rect.left, rect.right, rect.bottom + 4);
	}

	_showMenuDropdown(x, xRight, y) {
		this._menuDropdown = new FloatingMenu({
			root: this.shadowRoot,
			x,
			xRight,
			y,
			minWidth: 140,
			innerHTML: `<button class="menu-item" data-action="import">Import</button>`,
			onItemClick: (e) => {
				const item = e.target.closest('.menu-item');
				if (!item) return;
				if (item.dataset.action === 'import') {
					this.shadowRoot.getElementById('import-file').click();
				}
			},
		});
	}

	_onContextMenu(e) {
		const row = e.target.closest('.thread-row');
		if (!row) return;
		e.preventDefault();
		const threadId = row.dataset.threadId;
		if (threadId) this._showContextMenu(threadId, e.clientX, e.clientY);
	}

	_showContextMenu(threadId, x, y) {
		this._contextMenu?.dismiss();
		this._contextMenu = new FloatingMenu({
			root: this.shadowRoot,
			x,
			y,
			minWidth: 160,
			innerHTML: html`
				<button
					class="menu-action-item"
					data-action="copy"
					data-thread-id="${threadId}"
				>
					${copySvg()} Duplicate
				</button>
				<div class="menu-separator"></div>
				<button
					class="menu-action-item destructive"
					data-action="delete"
					data-thread-id="${threadId}"
				>
					${trashSvg()} Delete
				</button>
			`,
			onItemClick: (e) => {
				const item = e.target.closest('.menu-action-item');
				if (!item) return;
				const action = item.dataset.action;
				const tid = item.dataset.threadId;
				this._contextMenu?.dismiss();
				if (action === 'copy') this._onCopyThread(tid);
				if (action === 'delete') this._onDeleteThread(tid);
			},
		});
	}

	_deleteThread(threadId) {
		try {
			const wrapper = this._display?.shadowRoot?.querySelector(
				`.thread-row-wrapper[data-thread-id="${threadId}"]`,
			);

			// Clear the activated wrapper reference if this is it
			if (this._swipe.activatedWrapper === wrapper) {
				this._swipe.resetActivated();
			}

			if (wrapper) {
				const swipeContent = wrapper.querySelector('.swipe-content');

				// Animate removal — CSS handles the transition via .removing-left
				if (swipeContent) {
					swipeContent.style.transition = '';
					swipeContent.style.transform = '';
				}

				wrapper.classList.add('removing', 'removing-left');

				// After slide animation, collapse height
				setTimeout(() => {
					wrapper.classList.add('collapsing');

					// Delete from store after collapse animation
					setTimeout(() => {
						store.deleteThread(threadId);

						// If this was the current thread, switch to another one
						if (getCurrentThreadId() === threadId) {
							const threads = store.listThreads();
							if (threads.length > 0) {
								setCurrentThreadId(threads[0].id);
								store.loadThread(threads[0].id);
							} else {
								setCurrentThreadId(null);
							}
						}
					}, this._swipe.COLLAPSE_SPEED);
				}, this._swipe.ANIMATE_SPEED);
			} else {
				// If wrapper not found, just delete immediately
				store.deleteThread(threadId);
				if (getCurrentThreadId() === threadId) {
					const threads = store.listThreads();
					if (threads.length > 0) {
						setCurrentThreadId(threads[0].id);
						store.loadThread(threads[0].id);
					} else {
						setCurrentThreadId(null);
					}
				}
			}
		} catch (err) {
			console.error('Failed to delete thread:', err);
		}
	}
}

customElements.define('create-list', ChatThreadList);
