import { store } from './store.js';
import { getCurrentThreadId, setCurrentThreadId } from '../utils/url-state.js';
import type {
	MessagesChangedDetail,
	NavigateDetail,
	ThreadListSelectDetail,
} from '../types/events.js';
import type { Thread } from '../types/index.js';
import { html } from '../utils/template.js';
import { BP } from '../utils/breakpoints.js';
import { SwipeGestureHandler } from '../utils/swipe-gesture.js';
import { FLOATING_MENU_CSS, FloatingMenu } from '../utils/floating-menu.js';
import { copySvg } from './icons/copy-svg.js';
import { trashSvg } from './icons/trash-svg.js';
import { ThreadListDisplay } from './thread-list.js';
import { router } from '../utils/router.js';
import {
	showDialog,
	dialogCancelButtonStyle,
	dialogDestructiveButtonStyle,
} from '../utils/dialog.js';

class ChatThreadList extends HTMLElement {
	private readonly shadow: ShadowRoot;
	private _display: ThreadListDisplay | null = null;
	private $: Record<string, HTMLElement | null> = {};
	private _swipe!: SwipeGestureHandler;
	private isDuplicating: boolean = false;
	private _contextMenu: FloatingMenu | null = null;
	private _menuDropdown: FloatingMenu | null = null;

	constructor() {
		super();
		this.shadow = this.attachShadow({ mode: 'open' });
		this._onStoreChange = this._onStoreChange.bind(this);
		this._onThreadSelect = this._onThreadSelect.bind(this);
		this._onActionClick = this._onActionClick.bind(this);
		this._onCreateThread = this._onCreateThread.bind(this);

		this._swipe = new SwipeGestureHandler();

		this._onContextMenu = this._onContextMenu.bind(this);
		this._onMenuBtnClick = this._onMenuBtnClick.bind(this);

		this._onNavigate = this._onNavigate.bind(this);
	}

	connectedCallback() {
		this.shadow.innerHTML = html`
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

				${FLOATING_MENU_CSS}
			</style>
			<thread-list
				header-title="Drafts"
				show-actions
				show-create
				show-header
				show-menu-button
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

		this._display = this.shadow.querySelector<ThreadListDisplay>('thread-list');
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

		this.shadow
			.getElementById('import-file')
			?.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				const file = target.files && target.files[0];
				if (!file) return;
				const reader = new FileReader();
				reader.onload = (ev) => {
					try {
						const newThread = store.importJson(
							String((ev.target as FileReader).result),
						);
						if (newThread) setCurrentThreadId(newThread.id);
					} catch (_err) {
						alert('Error importing: Invalid JSON file');
					} finally {
						target.value = '';
					}
				};
				reader.readAsText(file);
			});

		this.shadow.addEventListener('navigate', this._onNavigate as EventListener);

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
		this.shadow.removeEventListener(
			'navigate',
			this._onNavigate as EventListener,
		);
	}

	_onNavigate(e: CustomEvent<NavigateDetail>) {
		if (e.detail?.action === 'back') {
			router.navigate('/');
		}
	}

	_onStoreChange(e: CustomEvent<MessagesChangedDetail>) {
		const { reason } = e.detail;
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

	_onThreadSelect(e: CustomEvent<ThreadListSelectDetail>) {
		const { id } = e.detail;
		if (id) this._onThreadClick(id);
	}

	_onActionClick(e: Event) {
		const button = (e.target as HTMLElement)?.closest(
			'.action-button',
		) as HTMLElement | null;
		if (!button) return;
		e.stopPropagation();
		const action = button.dataset.action;
		const threadId = button.dataset.threadId;
		if (!threadId) return;
		if (action === 'copy') this._onCopyThread(threadId);
		if (action === 'delete') this._onDeleteThread(threadId);
	}

	_onThreadClick(threadId: string) {
		if (threadId) {
			try {
				// Close any activated swipe before switching threads
				if (this._swipe.activatedWrapper) {
					this._swipe.deactivateRow(this._swipe.activatedWrapper);
				}

				setCurrentThreadId(threadId);
				const thread = store.loadThread(threadId);

				const width = window.innerWidth;
				const appContainer = document.getElementById('app');

				if (appContainer) {
					if (width < BP.tablet) {
						// Mobile: show editor for author-info mode, preview otherwise
						appContainer.setAttribute(
							'data-mode',
							thread?.authorInfoMode ? 'edit' : 'preview',
						);
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
			const recipientName = thread.participants?.[0]?.full_name || '';
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
				infoNeeded: Boolean(
					thread.authorInfoMode && !thread.authorInfoSubmitted,
				),
			};
		});

		this._display.setThreads(threadItems);
		const activeId = this.isDuplicating ? null : (currentThreadId ?? null);
		this._display.setActiveId(activeId);
	}

	_getLastMessage(thread: Thread) {
		if (!thread.messages || thread.messages.length === 0) {
			return 'No messages yet';
		}
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const msg = thread.messages[i];
			if (msg.message?.trim()) return msg.message;
			if (msg.images?.length) return '(Image)';
		}
		return 'No messages yet';
	}

	_formatTime(timestamp: string | undefined) {
		if (!timestamp) return '';

		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
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

	_onCopyThread(threadId: string) {
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
			const wrapper = this._display?.shadowRoot?.querySelector<HTMLElement>(
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

	async _onDeleteThread(threadId: string) {
		const thread = store.listThreads().find((t) => t.id === threadId);
		const displayName = thread ? store.getThreadDisplayName(thread) : 'this';

		const result = await showDialog({
			title: 'Delete Thread',
			body: `Are you sure you want to delete "${displayName}"? This action cannot be undone.`,
			buttons: [
				{ label: 'Cancel', value: null, style: dialogCancelButtonStyle },
				{
					label: 'Delete',
					value: 'delete',
					style: dialogDestructiveButtonStyle,
				},
			],
		});

		if (result !== 'delete') {
			const wrapper = this._display?.shadowRoot?.querySelector<HTMLElement>(
				`.thread-row-wrapper[data-thread-id="${threadId}"]`,
			);
			if (wrapper) this._swipe.deactivateRow(wrapper);
			return;
		}

		this._deleteThread(threadId);
	}

	_onMenuBtnClick() {
		if (this._menuDropdown?.isOpen) {
			this._menuDropdown.dismiss();
			return;
		}
		if (!this.$.menuBtn) return;
		const rect = this.$.menuBtn.getBoundingClientRect();
		this._showMenuDropdown(rect.left, rect.right, rect.bottom + 4);
	}

	_showMenuDropdown(x: number, xRight: number, y: number) {
		this._menuDropdown = new FloatingMenu({
			root: this.shadow,
			x,
			xRight,
			y,
			minWidth: 140,
			innerHTML: `<button class="menu-item" data-action="import">Import</button>`,
			onItemClick: (e) => {
				const item = (e.target as HTMLElement)?.closest<HTMLElement>(
					'.menu-item',
				);
				if (!item) return;
				if (item.dataset.action === 'import') {
					this.shadow.getElementById('import-file')?.click();
				}
			},
		});
	}

	_onContextMenu(e: MouseEvent) {
		const row = (e.target as HTMLElement)?.closest<HTMLElement>('.thread-row');
		if (!row) return;
		e.preventDefault();
		const threadId = row.dataset.threadId;
		if (threadId) this._showContextMenu(threadId, e.clientX, e.clientY);
	}

	_showContextMenu(threadId: string, x: number, y: number) {
		this._contextMenu?.dismiss();
		this._contextMenu = new FloatingMenu({
			root: this.shadow,
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
				const item = (e.target as HTMLElement)?.closest<HTMLElement>(
					'.menu-action-item',
				);
				if (!item) return;
				const action = item.dataset.action;
				const tid = item.dataset.threadId;
				this._contextMenu?.dismiss();
				if (action === 'copy' && tid) this._onCopyThread(tid);
				if (action === 'delete' && tid) this._onDeleteThread(tid);
			},
		});
	}

	_deleteThread(threadId: string) {
		try {
			const wrapper = this._display?.shadowRoot?.querySelector<HTMLElement>(
				`.thread-row-wrapper[data-thread-id="${threadId}"]`,
			);

			// Clear the activated wrapper reference if this is it
			if (this._swipe.activatedWrapper === wrapper) {
				this._swipe.resetActivated();
			}

			if (wrapper) {
				const swipeContent =
					wrapper.querySelector<HTMLElement>('.swipe-content');

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

declare global {
	interface HTMLElementTagNameMap {
		'create-list': ChatThreadList;
	}
}
