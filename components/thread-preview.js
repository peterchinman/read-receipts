import { store } from './store.js';
import './thread-display.js';
import { setCurrentThreadId } from '../utils/url-state.js';

const isIOS =
	/iPad|iPhone|iPod/.test(navigator.userAgent) ||
	(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

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
	}

	connectedCallback() {
		this.shadowRoot.innerHTML = `
		<style>
			:host {
				display: block;
				height: 100%;
			}
		</style>
		<thread-display interactive nav-text="Edit" nav-action="show-editor"></thread-display>
	`;

		this._display = this.shadowRoot.querySelector('thread-display');
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

		// iOS viewport workarounds
		if (isIOS && window.visualViewport && this.$.input) {
			let previousViewportHeight = visualViewport.height;
			visualViewport.addEventListener('resize', () => {
				const newViewportHeight = window.visualViewport.height;
				if (newViewportHeight < previousViewportHeight) {
					const vh = newViewportHeight * 0.01;
					document.documentElement.style.setProperty('--vh', `${vh}px`);
					setTimeout(() => {
						window.scrollTo(0, 0);
						this._scrollToBottom();
					});
				} else {
					document.documentElement.style.setProperty('--vh', '1dvh');
				}
				previousViewportHeight = newViewportHeight;
			});
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
		this._scrollToBottom();
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
		this._display?.shadowRoot?.removeEventListener('click', this._onShadowClick);
		document.removeEventListener(
			'editor:focus-message',
			this._onEditorFocusMessage,
		);
	}

	_onStoreChange(e) {
		if (!this._display) return;
		const { reason, message, messages, recipient } = e.detail || {};
		if (recipient) this._display.setRecipient(recipient);

		if (
			reason === 'thread-changed' ||
			reason === 'load' ||
			reason === 'init-defaults'
		) {
			this._display.setRecipient(store.getRecipient());
			this._display.renderReset(store.getMessages());
			this._scrollToBottom();
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
				this._scrollToBottom();
				break;
			case 'recipient':
				break;
			default:
				this._display.renderReset(messages);
				this._scrollToBottom();
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

customElements.define('thread-preview', ChatPreview);
