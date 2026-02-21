import { store } from './store.js';
import { getCurrentThreadId, setCurrentThreadId } from '../utils/url-state.js';
import { html } from '../utils/template.js';
import './thread-list-display.js';

class ChatThreadList extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._display = null;
		this.$ = null;
		this._onStoreChange = this._onStoreChange.bind(this);
		this._onThreadClick = this._onThreadClick.bind(this);
		this._onThreadSelect = this._onThreadSelect.bind(this);
		this._onActionClick = this._onActionClick.bind(this);
		this._onCreateThread = this._onCreateThread.bind(this);
		this._onTouchStart = this._onTouchStart.bind(this);
		this._onTouchMove = this._onTouchMove.bind(this);
		this._onTouchEnd = this._onTouchEnd.bind(this);
		this._onTouchCancel = this._onTouchCancel.bind(this);
		this._onCopyThread = this._onCopyThread.bind(this);
		this._onDeleteThread = this._onDeleteThread.bind(this);

		// Touch gesture constants
		this.SWIPE_ACTIVATION_DISTANCE = 75;
		this.DIRECTIONALITY_THRESHOLD = 5;
		this.AUTO_ACTIVATION_PERCENTAGE = 0.75;
		this.COLLAPSE_SPEED = 250;
		this.ANIMATE_SPEED = 100;
		this.SPRING_BACK_SPEED = 250;

		// Touch state
		this.touchState = {
			startX: 0,
			startY: 0,
			currentX: 0,
			currentY: 0,
			isDragging: false,
			isHorizontal: null,
			element: null,
			wrapper: null,
			threadId: null,
		};

		this.rafId = null;
		this.currentlyRevealedWrapper = null; // Track the currently revealed row
		this.isDuplicating = false; // Track if we're currently duplicating a thread
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
			</style>
			<thread-list-display show-actions show-create show-header></thread-list-display>
		`;

		this._display = this.shadowRoot.querySelector('thread-list-display');
		this.$ = this._display?.refs || {};

		this.$.newThreadBtn?.addEventListener('click', this._onCreateThread);
		this._display?.addEventListener('thread-list:select', this._onThreadSelect);
		store.addEventListener('messages:changed', this._onStoreChange);

		if (this.$.threadsContainer) {
			// Add touch event listeners for swipe gestures
			this.$.threadsContainer.addEventListener(
				'touchstart',
				this._onTouchStart,
				{ passive: true },
			);
			this.$.threadsContainer.addEventListener('touchmove', this._onTouchMove, {
				passive: false,
			});
			this.$.threadsContainer.addEventListener('touchend', this._onTouchEnd, {
				passive: true,
			});
			this.$.threadsContainer.addEventListener(
				'touchcancel',
				this._onTouchCancel,
				{ passive: true },
			);
			this.$.threadsContainer.addEventListener('click', this._onActionClick);
		}

		this._render();
	}

	disconnectedCallback() {
		this.$?.newThreadBtn?.removeEventListener('click', this._onCreateThread);
		this._display?.removeEventListener('thread-list:select', this._onThreadSelect);
		store.removeEventListener('messages:changed', this._onStoreChange);

		// Remove touch event listeners
		this.$?.threadsContainer?.removeEventListener(
			'touchstart',
			this._onTouchStart,
		);
		this.$?.threadsContainer?.removeEventListener(
			'touchmove',
			this._onTouchMove,
		);
		this.$?.threadsContainer?.removeEventListener('touchend', this._onTouchEnd);
		this.$?.threadsContainer?.removeEventListener(
			'touchcancel',
			this._onTouchCancel,
		);
		this.$?.threadsContainer?.removeEventListener('click', this._onActionClick);
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
			reason === 'load' ||
			reason === 'init-defaults' ||
			reason === 'add' ||
			reason === 'update' ||
			reason === 'delete' ||
			reason === 'recipient'
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
			// Could show a toast notification here
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
				// Close any revealed swipe before switching threads
				if (this.currentlyRevealedWrapper) {
					this._closeSwipe(this.currentlyRevealedWrapper);
				}

				setCurrentThreadId(threadId);
				store.loadThread(threadId);

				const width = window.innerWidth;
				const appContainer = document.getElementById('app');

				if (appContainer) {
					if (width < 900) {
						// Mobile: show only preview
						appContainer.setAttribute('data-mode', 'preview');
					} else if (width < 1200) {
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

		// Clear the currently revealed wrapper since we're re-rendering
		this.currentlyRevealedWrapper = null;

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
			};
		});

		this._display.setThreads(threadItems);
		const activeId = this.isDuplicating ? null : currentThreadId;
		this._display.setActiveId(activeId);
	}

	_getInitials(name) {
		const str = String(name ?? '').trim();
		if (!str) return '?';

		const parts = str.split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '?';

		// Use first letter of first + last word (or just first if single word).
		const first = Array.from(parts[0])[0] || '';
		const last =
			parts.length > 1 ? Array.from(parts[parts.length - 1])[0] || '' : '';
		return first + last || '?';
	}

	_getLastMessage(thread) {
		if (!thread.messages || thread.messages.length === 0) {
			return 'No messages yet';
		}
		const lastMsg = thread.messages[thread.messages.length - 1];
		return lastMsg.message || '(Image)';
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

	// Touch event handlers for swipe gestures
	_onTouchStart(e) {
		const swipeContent = e.target.closest('.swipe-content');
		if (!swipeContent) return;

		const wrapper = swipeContent.closest('.thread-row-wrapper');
		if (
			!wrapper ||
			wrapper.classList.contains('removing') ||
			wrapper.classList.contains('collapsing')
		)
			return;

		// If there's a different row currently revealed, close it
		if (
			this.currentlyRevealedWrapper &&
			this.currentlyRevealedWrapper !== wrapper
		) {
			this._closeSwipe(this.currentlyRevealedWrapper);
		}

		const touch = e.touches[0];

		// Clear any existing transition immediately on touch start
		swipeContent.style.transition = '';

		this.touchState = {
			startX: touch.clientX,
			startY: touch.clientY,
			currentX: touch.clientX,
			currentY: touch.clientY,
			isDragging: false,
			isHorizontal: null,
			element: swipeContent,
			wrapper: wrapper,
			threadId: wrapper.dataset.threadId,
		};
	}

	_onTouchMove(e) {
		if (!this.touchState.element) return;

		const touch = e.touches[0];
		const dx = touch.clientX - this.touchState.startX;
		const dy = touch.clientY - this.touchState.startY;

		// Determine direction on first significant movement
		if (
			this.touchState.isHorizontal === null &&
			(Math.abs(dx) > this.DIRECTIONALITY_THRESHOLD ||
				Math.abs(dy) > this.DIRECTIONALITY_THRESHOLD)
		) {
			this.touchState.isHorizontal = Math.abs(dx) > Math.abs(dy);
		}

		// If horizontal swipe, handle it
		if (this.touchState.isHorizontal) {
			e.preventDefault();
			this.touchState.isDragging = true;
			this.touchState.currentX = touch.clientX;

			const revealWidth = 160;
			const wasRevealed = this.touchState.wrapper.dataset.revealed === 'true';

			let constrainedDx;
			if (wasRevealed) {
				// Row is revealed, allow swiping right to close (but constrain to 0)
				// and left swiping is constrained since already at max reveal
				if (dx > 0) {
					// Swiping right to close
					constrainedDx = Math.min(dx, revealWidth) - revealWidth;
				} else {
					// Swiping left (already revealed, so constrain)
					constrainedDx = -revealWidth + dx * 0.1;
				}
			} else {
				// Row is not revealed, only allow left swipe (negative dx)
				constrainedDx = dx < 0 ? dx : dx * 0.1;
			}

			// Apply transform
			if (this.rafId) cancelAnimationFrame(this.rafId);
			this.rafId = requestAnimationFrame(() => {
				this.touchState.element.style.transform = `translateX(${constrainedDx}px)`;
				this.rafId = null;
			});

			// Auto-complete swipe if swiped far enough
			const containerWidth = this.touchState.element.clientWidth;
			if (
				!wasRevealed &&
				Math.abs(dx) > containerWidth * this.AUTO_ACTIVATION_PERCENTAGE
			) {
				this._handleSwipeLeft(this.touchState.wrapper);
			}
		}
	}

	_onTouchEnd(e) {
		if (!this.touchState.element || !this.touchState.isDragging) {
			this._resetTouchState();
			return;
		}

		const deltaX = this.touchState.currentX - this.touchState.startX;
		const revealWidth = 160; // Width of both action buttons
		const wasRevealed = this.touchState.wrapper.dataset.revealed === 'true';

		if (wasRevealed) {
			// Row was already revealed
			if (deltaX > this.SWIPE_ACTIVATION_DISTANCE) {
				// Swiped right enough to close
				this.touchState.element.style.transition = `transform ${this.SPRING_BACK_SPEED}ms ease-out`;
				this.touchState.element.style.transform = 'translateX(0)';
				delete this.touchState.wrapper.dataset.revealed;
				this.currentlyRevealedWrapper = null;

				setTimeout(() => {
					this.touchState.element.style.transition = '';
				}, this.SPRING_BACK_SPEED);
			} else {
				// Didn't swipe right enough, snap back to revealed position
				this.touchState.element.style.transition = `transform ${this.SPRING_BACK_SPEED}ms ease-out`;
				this.touchState.element.style.transform = `translateX(-${revealWidth}px)`;

				setTimeout(() => {
					this.touchState.element.style.transition = '';
				}, this.SPRING_BACK_SPEED);
			}
		} else {
			// Row was not revealed
			if (deltaX < -this.SWIPE_ACTIVATION_DISTANCE) {
				// Swiped left enough to reveal
				this.touchState.element.style.transition = `transform ${this.SPRING_BACK_SPEED}ms ease-out`;
				this.touchState.element.style.transform = `translateX(-${revealWidth}px)`;
				this.touchState.wrapper.dataset.revealed = 'true';
				this.currentlyRevealedWrapper = this.touchState.wrapper;

				// Add click listener to close when clicking elsewhere
				setTimeout(() => {
					const closeSwipe = (e) => {
						if (
							!e.target.closest('.thread-row-wrapper') ||
							e.target.closest('.thread-row-wrapper') !==
								this.touchState.wrapper
						) {
							this._closeSwipe(this.touchState.wrapper);
							this._display?.shadowRoot?.removeEventListener(
								'click',
								closeSwipe,
							);
						}
					};
					this._display?.shadowRoot?.addEventListener('click', closeSwipe);
				}, this.SPRING_BACK_SPEED);

				setTimeout(() => {
					this.touchState.element.style.transition = '';
				}, this.SPRING_BACK_SPEED);
			} else {
				// Didn't swipe left enough, snap back to closed position
				this._springBack();
			}
		}

		this._resetTouchState();
	}

	_onTouchCancel(e) {
		if (!this.touchState.element) return;
		this._springBack();
		this._resetTouchState();
	}

	_springBack() {
		if (!this.touchState.element) return;

		const element = this.touchState.element;
		element.style.transition = `transform ${this.SPRING_BACK_SPEED}ms ease-out`;
		element.style.transform = 'translateX(0)';

		// Clear transition after animation completes
		setTimeout(() => {
			element.style.transition = '';
		}, this.SPRING_BACK_SPEED);
	}

	_closeSwipe(wrapper) {
		const swipeContent = wrapper.querySelector('.swipe-content');
		if (swipeContent) {
			swipeContent.style.transition = `transform ${this.SPRING_BACK_SPEED}ms ease-out`;
			swipeContent.style.transform = 'translateX(0)';
			delete wrapper.dataset.revealed;

			// Clear the currently revealed wrapper if it's this one
			if (this.currentlyRevealedWrapper === wrapper) {
				this.currentlyRevealedWrapper = null;
			}

			setTimeout(() => {
				swipeContent.style.transition = '';
			}, this.SPRING_BACK_SPEED);
		}
	}

	_handleSwipeLeft(wrapper) {
		// This is called for auto-activation during drag
		// For now, we'll just snap to reveal position
		const swipeContent = wrapper.querySelector('.swipe-content');
		const revealWidth = 160;

		if (swipeContent) {
			swipeContent.style.transition = `transform ${this.ANIMATE_SPEED}ms ease-out`;
			swipeContent.style.transform = `translateX(-${revealWidth}px)`;
			wrapper.dataset.revealed = 'true';
			this.currentlyRevealedWrapper = wrapper;
		}

		this._resetTouchState();
	}

	_resetTouchState() {
		this.touchState = {
			startX: 0,
			startY: 0,
			currentX: 0,
			currentY: 0,
			isDragging: false,
			isHorizontal: null,
			element: null,
			wrapper: null,
			threadId: null,
		};
	}

	_onCopyThread(threadId) {
		try {
			// Set flag to prevent marking old thread as active during duplication
			this.isDuplicating = true;

			// Use the store's built-in duplicate method
			const newThread = store.duplicateThread(threadId);
			if (!newThread) {
				console.error('Failed to duplicate thread');
				this.isDuplicating = false;
				return;
			}

			// Switch to the new thread
			setCurrentThreadId(newThread.id);
			store.loadThread(newThread.id);

			// Clear the duplicating flag before the next render
			this.isDuplicating = false;

			// Close the swipe after switching threads
			const wrapper = this._display?.shadowRoot?.querySelector(
				`.thread-row-wrapper[data-thread-id="${threadId}"]`,
			);
			if (wrapper) {
				this._closeSwipe(wrapper);
			}

			console.log('Thread copied successfully');
		} catch (err) {
			console.error('Failed to copy thread:', err);
			this.isDuplicating = false;
		}
	}

	_onDeleteThread(threadId) {
		// Show confirmation modal
		this._showDeleteConfirmation(threadId);
	}

	_showDeleteConfirmation(threadId) {
		// Get thread info for display
		const thread = store.listThreads().find((t) => t.id === threadId);
		const displayName = thread ? store.getThreadDisplayName(thread) : 'this';

		// Create modal
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

		// Add event listeners
		const cancelBtn = modal.querySelector('.modal-button.cancel');
		const confirmBtn = modal.querySelector('.modal-button.confirm');

		const closeModal = () => {
			modal.remove();
		};

		cancelBtn.addEventListener('click', () => {
			closeModal();
			// Close the swipe
			const wrapper = this._display?.shadowRoot?.querySelector(
				`.thread-row-wrapper[data-thread-id="${threadId}"]`,
			);
			if (wrapper) {
				this._closeSwipe(wrapper);
			}
		});

		confirmBtn.addEventListener('click', () => {
			closeModal();
			this._deleteThread(threadId);
		});

		// Close on overlay click
		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				closeModal();
				const wrapper = this._display?.shadowRoot?.querySelector(
					`.thread-row-wrapper[data-thread-id="${threadId}"]`,
				);
				if (wrapper) {
					this._closeSwipe(wrapper);
				}
			}
		});

		this.shadowRoot.appendChild(modal);
	}

	_deleteThread(threadId) {
		try {
			const wrapper = this._display?.shadowRoot?.querySelector(
				`.thread-row-wrapper[data-thread-id="${threadId}"]`,
			);

			// Clear the currently revealed wrapper if this is it
			if (this.currentlyRevealedWrapper === wrapper) {
				this.currentlyRevealedWrapper = null;
			}

			if (wrapper) {
				const swipeContent = wrapper.querySelector('.swipe-content');

				// Animate removal
				if (swipeContent) {
					swipeContent.style.transition = `transform ${this.ANIMATE_SPEED}ms ease-out`;
					swipeContent.style.transform = 'translateX(-100vw)';
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
					}, this.COLLAPSE_SPEED);
				}, this.ANIMATE_SPEED);
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

customElements.define('thread-list', ChatThreadList);
