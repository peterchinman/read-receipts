import { store } from './store.js';
import './thread-view.js';
import { setCurrentThreadId } from '../utils/url-state.js';
import { isIOS } from '../utils/ios-viewport.js';

class ChatPreview extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._display = null;
		this.$ = null;
		this._onStoreChange = this._onStoreChange.bind(this);
		this._onKeyDown = this._onKeyDown.bind(this);
		this._onInput = this._onInput.bind(this);
		this._sendNow = this._sendNow.bind(this);
		this._onEditorFocusMessage = this._onEditorFocusMessage.bind(this);
		this._onSendPointerDown = this._onSendPointerDown.bind(this);
		this._onClearChatClick = this._onClearChatClick.bind(this);
		this._onExportChatClick = this._onExportChatClick.bind(this);
		this._onImportChatClick = this._onImportChatClick.bind(this);
		this._onImportFileChange = this._onImportFileChange.bind(this);
		this._onShadowClick = this._onShadowClick.bind(this);
		this._lastDisplayWidth = null;
		this._shrinkWrapResizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const width = Math.round(entry.contentRect.width);
				if (width !== this._lastDisplayWidth) {
					this._lastDisplayWidth = width;
					this._display?._scheduleShrinkWrapAll();
				}
			}
		});
	}

	connectedCallback() {
		this.shadowRoot.innerHTML = `
		<style>
			:host {
				display: block;
				height: 100%;
			}
		</style>
		<thread-view interactive nav-text="Edit" nav-action="show-editor"></thread-view>
	`;

		this._display = this.shadowRoot.querySelector('thread-view');
		this.$ = this._display?.refs || {};

		if (this.$.input) {
			this.$.input.addEventListener('keydown', this._onKeyDown);
			this.$.input.addEventListener('input', this._onInput);
		}
		if (this.$.send) {
			this.$.send.addEventListener('pointerdown', this._onSendPointerDown);
		}

		this.$.clearChat?.addEventListener('click', this._onClearChatClick);
		this.$.exportChat?.addEventListener('click', this._onExportChatClick);
		this.$.importChat?.addEventListener('click', this._onImportChatClick);
		this.$.importFile?.addEventListener('change', this._onImportFileChange);
		this._display?.shadowRoot?.addEventListener('click', this._onShadowClick);

		// iOS: scroll to bottom when virtual keyboard appears
		if (isIOS && this.$.input) {
			this._onIOSKeyboardShown = () => this._scrollToBottom();
			document.addEventListener(
				'ios-viewport:keyboard-appearing',
				this._onIOSKeyboardShown,
			);
			this.$.input.addEventListener('blur', () => {
				document.documentElement.style.setProperty('--vh', '1dvh');
			});
		}

		store.addEventListener('messages:changed', this._onStoreChange);

		document.addEventListener(
			'editor:focus-message',
			this._onEditorFocusMessage,
		);

		this._display?.setRecipient(store.getRecipient());
		this._display?.setMessages(store.getMessages());
		this.#syncReadOnlyState();

		// Re-run shrink wrap whenever the thread-view's width changes (e.g. the preview
		// pane transitions from hidden/position:absolute to visible/position:static on mobile,
		// or on window resize). This ensures bubbles are measured at their correct dimensions
		// regardless of which navigation path made the pane visible.
		if (this._display) this._shrinkWrapResizeObserver.observe(this._display);
	}

	disconnectedCallback() {
		store.removeEventListener('messages:changed', this._onStoreChange);
		if (this.$?.input) {
			this.$.input.removeEventListener('keydown', this._onKeyDown);
			this.$.input.removeEventListener('input', this._onInput);
		}
		if (this.$?.send) {
			this.$.send.removeEventListener('pointerdown', this._onSendPointerDown);
		}
		this.$?.clearChat?.removeEventListener('click', this._onClearChatClick);
		this.$?.exportChat?.removeEventListener('click', this._onExportChatClick);
		this.$?.importChat?.removeEventListener('click', this._onImportChatClick);
		this.$?.importFile?.removeEventListener('change', this._onImportFileChange);
		this._display?.shadowRoot?.removeEventListener(
			'click',
			this._onShadowClick,
		);
		document.removeEventListener(
			'editor:focus-message',
			this._onEditorFocusMessage,
		);
		if (this._onIOSKeyboardShown) {
			document.removeEventListener(
				'ios-viewport:keyboard-appearing',
				this._onIOSKeyboardShown,
			);
		}
		this._shrinkWrapResizeObserver.disconnect();
		this._lastDisplayWidth = null;
	}

	#syncReadOnlyState() {
		if (!this._display) return;
		const nonInteractive =
			store.isCurrentThreadSubmitted() ||
			!!store.getCurrentThread()?.authorInfoMode;
		if (nonInteractive) {
			this._display.removeAttribute('interactive');
		} else {
			this._display.setAttribute('interactive', '');
		}
	}

	_onStoreChange(e) {
		if (!this._display) return;
		const { reason, message, messages, recipient } = e.detail || {};
		if (recipient) this._display.setRecipient(recipient);

		if (
			reason === 'thread-changed' ||
			reason === 'load' ||
			reason === 'init-defaults' ||
			reason === 'thread-submitted'
		) {
			this._display.setRecipient(store.getRecipient());
			this._display.renderReset(store.getMessages());
			this.#syncReadOnlyState();
			return;
		}

		switch (reason) {
			case 'add':
				this._display.renderAdd(message, messages);
				this._scrollToBottom('smooth');
				break;
			case 'update':
				this._display.renderUpdate(message, messages);
				break;
			case 'delete':
				this._display.renderDelete(message);
				break;
			case 'clear':
				this._display.renderReset(messages);
				break;
			case 'recipient':
				break;
			default:
				this._display.renderReset(messages);
				break;
		}
	}

	_onKeyDown(event) {
		if (event.key === 'Enter' && !event.shiftKey && !isIOS) {
			event.preventDefault();
			this._sendNow(event);
		}
	}

	_onInput(event) {
		event.target.style.height = 'auto';
		event.target.style.height = `${event.target.scrollHeight}px`;
	}

	_onSendPointerDown(event) {
		event.preventDefault();
		this._sendNow(event);
	}

	_sendNow(event) {
		event.preventDefault();
		if (store.isCurrentThreadSubmitted()) return;
		const text = this.$?.input?.value;
		const isSender = this.$?.senderSwitch?.checked;
		if (!text || !text.trim()) return;
		const created = store.addMessage();
		store.updateMessage(created.id, {
			message: text,
			sender: isSender ? 'self' : 'other',
			timestamp: new Date().toISOString(),
		});
		this.$.input.value = '';
		this.$.input.style.height = 'auto';
	}

	_onClearChatClick() {
		this._clearChat();
	}

	_clearChat() {
		if (store.isCurrentThreadSubmitted()) return;
		if (confirm('Are you sure you want to clear all messages?')) {
			store.clear();
		}
	}

	_onExportChatClick() {
		this._exportChat();
	}

	_exportChat() {
		const dataStr = store.exportJson(true);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `chat-export-${Date.now()}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	_onImportChatClick() {
		this.$?.importFile?.click();
	}

	_onImportFileChange(e) {
		this._importChat(e);
	}

	_importChat(e) {
		const file = e.target.files && e.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const newThread = store.importJson(String(ev.target.result));
				if (newThread) {
					setCurrentThreadId(newThread.id);
				}
			} catch (_err) {
				alert('Error importing chat: Invalid JSON file');
			} finally {
				this.$.importFile.value = '';
			}
		};
		reader.readAsText(file);
	}

	_onShadowClick(event) {
		const optionsButton = this.$?.optionsButton;
		const optionsContainer = this.$?.optionsContainer;
		if (!optionsButton || !optionsContainer) return;
		if (!optionsButton.checked) return;
		if (!optionsContainer.contains(event.target)) {
			optionsButton.checked = false;
		}
	}

	_onEditorFocusMessage(e) {
		const { id } = e.detail || {};
		if (!id) return;
		this._display?.focusMessage(id);
	}

	_scrollToBottom(behavior = 'auto') {
		this._display?.scrollToBottom(behavior);
	}
}

customElements.define('create-preview', ChatPreview);
