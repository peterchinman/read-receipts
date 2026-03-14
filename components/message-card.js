import { html } from '../utils/template.js';
import { initTooltips } from '../utils/tooltip.js';
import './sender-switch.js';
import { isIOS } from '../utils/ios-viewport.js';

class MessageCard extends HTMLElement {
	static get observedAttributes() {
		return [
			'message-id',
			'sender',
			'timestamp',
			'text',
			'readonly',
			'only',
			'is-first',
			'time-since-previous',
			'exact-timestamp',
		];
	}

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._onClick = this._onClick.bind(this);
		this._onInput = this._onInput.bind(this);
		this._onChange = this._onChange.bind(this);
		this._onKeyDown = this._onKeyDown.bind(this);
		this._consecutiveEnters = 0;
		this._lastEnterTime = 0;
	}

	connectedCallback() {
		// Detect if running on Mac
		const isMac =
			navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
			navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
		const metaKey = isMac ? '⌘' : 'Ctrl';

		if (isIOS) this.classList.add('ios');

		this.shadowRoot.innerHTML = html`
			<style>
				:host {
					display: block;
				}
				.card {
					border: 1px solid var(--color-edge);
					border-radius: var(--border-radius);
					padding: calc(12rem / 14);
					font-size: 14px;
					line-height: var(--line-height);
					background: var(--color-page);
				}
				:host(.ios) .card:focus-within {
					border-color: var(--color-bubble-self);
				}
				.row {
					display: flex;
					justify-content: space-between;
					align-items: center;
				}
				.left {
					display: flex;
					gap: calc(10rem / 14);
				}
				.right {
					display: flex;
					gap: calc(10rem / 14);
				}
				.input-container {
					position: relative;

					.click-receiver {
						display: none;
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						height: 100%;
					}
				}
				:host(.ios) .click-receiver {
					display: block;
				}
				.row textarea {
					all: unset;
					flex: 1;
					resize: none;
					min-height: 1lh;
					overflow: hidden;
					box-sizing: border-box;
					overflow-wrap: break-word;
					margin-top: calc(16rem / 14);
				}
				.initial-time-input {
					all: unset;
					height: min-content;
					font: inherit;
					font-size: calc(12rem / 14);
					cursor: pointer;
					position: relative;
				}
				.initial-time-input:not(:focus) {
					color: transparent;
				}
				.initial-time-input:focus {
					color: var(--color-ink);
					outline: none;
				}
				.initial-time-input:hover:not(:focus) {
					color: transparent;
				}
				.initial-time-input::before {
					position: absolute;
					left: 0;
					top: 0;
					content: attr(data-formatted);
					pointer-events: none;
					color: var(--color-ink-subdued);
				}
				.initial-time-input:hover::before {
					color: var(--color-ink);
				}
				.initial-time-input:focus::before {
					display: none;
				}
				.initial-time-input::-webkit-calendar-picker-indicator {
					opacity: 0;
					position: absolute;
					width: 100%;
					height: 100%;
					cursor: pointer;
					z-index: 1;
				}
				.date-text {
					font-size: calc(12rem / 14);
					color: var(--color-ink-subdued);
				}
				.time-since-select {
					all: unset;
					font: inherit;
					font-size: calc(12rem / 14);
					cursor: pointer;
					color: var(--color-ink-subdued);
				}
				.time-since-select:hover {
					color: var(--color-ink);
				}
				.exact-time-container {
					display: none;
					align-items: center;
					gap: calc(4rem / 14);
				}
				.exact-time-input {
					all: unset;
					height: min-content;
					font: inherit;
					font-size: calc(12rem / 14);
					cursor: pointer;
					position: relative;
					field-sizing: content;
				}
				.exact-time-input:not(:focus) {
					color: transparent;
				}
				.exact-time-input:focus {
					color: var(--color-ink);
					outline: none;
				}
				.exact-time-input:hover:not(:focus) {
					color: transparent;
				}
				.exact-time-input::before {
					position: absolute;
					left: 0;
					top: 0;
					content: attr(data-formatted);
					pointer-events: none;
					color: var(--color-ink-subdued);
				}
				.exact-time-input:hover::before {
					color: var(--color-ink);
				}
				.exact-time-input:focus::before {
					display: none;
				}
				.exact-time-input::-webkit-calendar-picker-indicator {
					opacity: 0;
					position: absolute;
					width: 100%;
					height: 100%;
					cursor: pointer;
					z-index: 1;
				}
				.exact-time-reset {
					all: unset;
					cursor: pointer;
					font-size: calc(12rem / 14);
					color: var(--color-ink-subdued);
					line-height: 1;
					min-width: 2rem;
					display: flex;
					justify-content: center;
					align-items: center;
				}
				.exact-time-reset:hover {
					color: var(--color-ink);
				}
				.actions {
					display: none;

					button {
						all: unset;
						position: relative;
						height: var(--button-size);
						width: var(--button-size);
					}

					svg {
						color: var(--color-ink-subdued);
					}
				}
				:host(:hover) .actions,
				:host(.focused) .actions {
					display: flex;
				}
				.delete-button {
					all: unset;
					display: none;
					justify-content: center;
					align-items: center;
					width: var(--button-size);
					height: var(--button-size);
					border-radius: 100%;
					background: var(--color-bubble-other);
					color: var(--color-ink-subdued);
					svg {
						padding: calc(var(--button-size) / 8);
					}
				}
				:host(:hover) .delete-button,
				:host(.focused) .delete-button {
					display: flex;
				}
				.insert-image-button {
					display: none !important;
				}
			</style>
			<div class="card">
				<div class="row">
					<div class="left">
						<sender-switch part="sender-switch"></sender-switch>
						<input
							part="date-input"
							type="datetime-local"
							class="initial-time-input"
						/>
						<span class="date-text"></span>
						<select
							class="time-since-select"
							data-tooltip="Time since previous message"
						>
							<option value="PT1M">1 min</option>
							<option value="PT1H">1 hour</option>
							<option value="P1D">1 day</option>
							<option value="EXACT">Exact time</option>
						</select>
						<div class="exact-time-container">
							<button
								class="exact-time-reset"
								data-tooltip="Switch to relative time"
								type="button"
							>
								×
							</button>
							<input
								part="exact-date-input"
								type="datetime-local"
								class="exact-time-input"
							/>
						</div>
					</div>
					<div class="right">
						<div class="actions">
							<button
								part="add-below"
								data-tooltip="Add message below"
								data-tooltip-hotkey="${metaKey}+↵"
								data-tooltip-subtext="You can also type three new lines to add a new message below."
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewbox="0 0 35 28"
									width="100%"
									height="100%"
									fill="none"
								>
									<path
										fill="currentColor"
										d="M0 1.3333C0 .9797.1418.6406.3943.3905S.989 0 1.3462 0h29.6153c.3571 0 .6995.1405.9519.3905.2525.25.3943.5892.3943.9428s-.1418.6928-.3943.9428a1.353 1.353 0 0 1-.9519.3906H1.3462c-.357 0-.6995-.1405-.952-.3906A1.327 1.327 0 0 1 0 1.3333m1.3462 12h29.6153c.3571 0 .6995-.1404.9519-.3905.2525-.25.3943-.5892.3943-.9428s-.1418-.6928-.3943-.9428a1.352 1.352 0 0 0-.9519-.3905H1.3462c-.357 0-.6995.1404-.952.3905A1.327 1.327 0 0 0 0 12c0 .3536.1418.6928.3943.9428s.5948.3905.9519.3905m17.5 8h-17.5c-.357 0-.6995.1405-.952.3906A1.327 1.327 0 0 0 0 22.6667c0 .3536.1418.6927.3943.9428S.989 24 1.3462 24h17.5c.357 0 .6994-.1405.9518-.3905a1.327 1.327 0 0 0 .3943-.9428c0-.3537-.1418-.6928-.3943-.9428a1.352 1.352 0 0 0-.9518-.3906m14.8076 0h-2.6923v-2.6666c0-.3537-.1418-.6928-.3942-.9428a1.353 1.353 0 0 0-.9519-.3906c-.357 0-.6994.1405-.9519.3906a1.327 1.327 0 0 0-.3943.9428v2.6666h-2.6923c-.357 0-.6994.1405-.9519.3906a1.327 1.327 0 0 0-.3942.9428c0 .3536.1418.6927.3942.9428.2525.25.5949.3905.9519.3905h2.6923v2.6667c0 .3536.1419.6927.3943.9428.2525.25.5949.3905.9519.3905s.6994-.1405.9519-.3905a1.327 1.327 0 0 0 .3942-.9428V24h2.6923c.3571 0 .6995-.1405.9519-.3905A1.327 1.327 0 0 0 35 22.6667c0-.3537-.1418-.6928-.3943-.9428a1.352 1.352 0 0 0-.9519-.3906"
									/>
								</svg>
							</button>
							<button
								class="insert-image-button"
								part="insert-image"
								data-tooltip="Insert image"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewbox="0 0 33 28"
									width="100%"
									height="100%"
									fill="none"
								>
									<path
										fill="currentColor"
										d="M30.4615 0H2.5385a2.535 2.535 0 0 0-1.795.7455A2.55 2.55 0 0 0 0 2.5455v22.909c0 .6751.2674 1.3226.7435 1.8A2.535 2.535 0 0 0 2.5385 28h27.923a2.535 2.535 0 0 0 1.795-.7455 2.55 2.55 0 0 0 .7435-1.8V2.5455c0-.6751-.2674-1.3226-.7435-1.8A2.535 2.535 0 0 0 30.4615 0m0 2.5455V18.892l-4.1361-4.1459a2.54 2.54 0 0 0-.8236-.5519 2.53 2.53 0 0 0-1.9431 0 2.54 2.54 0 0 0-.8236.5519L19.562 17.928l-6.9807-7a2.535 2.535 0 0 0-1.7944-.745 2.535 2.535 0 0 0-1.7944.745l-6.454 6.4718V2.5455zM2.5385 21l8.25-8.2727 12.6923 12.7272H2.5385zm27.923 4.4545h-3.3904l-5.7115-5.7272 3.173-3.1818 5.9289 5.9468zm-11.423-15.909c0-.3776.1116-.7467.3208-1.0607a1.905 1.905 0 0 1 .8544-.7031 1.9 1.9 0 0 1 1.1-.1086 1.9 1.9 0 0 1 .9748.5224c.2663.267.4476.6072.5211.9775a1.914 1.914 0 0 1-.1084 1.103 1.91 1.91 0 0 1-.7012.8568 1.9 1.9 0 0 1-2.4039-.2374 1.911 1.911 0 0 1-.5576-1.35"
									/>
								</svg>
							</button>
						</div>
						<button
							part="delete"
							class="delete-button"
							data-tooltip="Delete message"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 256 256"
								height="100%"
								width="100%"
								fill="currentColor"
							>
								<path
									d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z"
								/>
							</svg>
						</button>
					</div>
				</div>
				<div class="row input-container">
					<textarea
						part="message-input"
						placeholder="Message..."
						rows="1"
					></textarea>
					<!-- On iOS, clicking directly on the textarea causes scroll issues b/c of the virtual keyboard appearing and the os attempting to keep the textarea in view. So, instead we place this click-receiver above the textarea. -->
					<div class="click-receiver"></div>
				</div>
				<div class="row actions">
					<div class="left"></div>
				</div>
			</div>
		`;
		this.shadowRoot.addEventListener('click', this._onClick);
		this.shadowRoot.addEventListener('input', this._onInput);
		this.shadowRoot.addEventListener('change', this._onChange);
		this.shadowRoot.addEventListener('keydown', this._onKeyDown);

		// Listen for changes on the sender switch
		const senderSwitch = this.shadowRoot.querySelector('sender-switch');
		if (senderSwitch) {
			senderSwitch.addEventListener('change', (e) => {
				this.#emit('editor:update', {
					id: this.messageId,
					patch: { sender: e.detail.checked ? 'self' : 'other' },
				});
			});
		}

		this.#syncFromAttrs();
		this.#syncReadOnly();
		// Ensure textarea is resized after initial render
		requestAnimationFrame(() => {
			const textarea = this.shadowRoot.querySelector('textarea');
			this.#resizeTextarea(textarea);
		});

		// Setup tooltip positioning for action buttons
		this._cleanupTooltips = initTooltips(this.shadowRoot, this);
	}

	disconnectedCallback() {
		this.shadowRoot.removeEventListener('click', this._onClick);
		this.shadowRoot.removeEventListener('input', this._onInput);
		this.shadowRoot.removeEventListener('change', this._onChange);
		this.shadowRoot.removeEventListener('keydown', this._onKeyDown);
		this._cleanupTooltips?.();
	}

	attributeChangedCallback(name) {
		this.#syncFromAttrs();
		if (name === 'readonly') {
			this.#syncReadOnly();
		}
	}

	get messageId() {
		return this.getAttribute('message-id') || '';
	}
	get text() {
		return this.getAttribute('text') || '';
	}
	get sender() {
		return this.getAttribute('sender') || 'self';
	}
	get timestamp() {
		return this.getAttribute('timestamp') || '';
	}
	get isFirst() {
		return this.hasAttribute('is-first');
	}
	get timeSincePrevious() {
		return this.getAttribute('time-since-previous') || 'PT1M';
	}
	get exactTimestamp() {
		return this.getAttribute('exact-timestamp') || '';
	}

	#formatDate(iso) {
		if (!iso) return '';
		try {
			const d = new Date(iso);
			const months = [
				'Jan',
				'Feb',
				'Mar',
				'Apr',
				'May',
				'Jun',
				'Jul',
				'Aug',
				'Sep',
				'Oct',
				'Nov',
				'Dec',
			];
			const month = months[d.getMonth()];
			const day = d.getDate();
			const year = d.getFullYear();
			let hours = d.getHours();
			const minutes = d.getMinutes();
			const ampm = hours >= 12 ? 'pm' : 'am';
			hours = hours % 12 || 12;
			const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
			return `${month} ${day}, ${year} ${hours}:${minutesStr}${ampm}`;
		} catch (_e) {
			return '';
		}
	}

	#resizeTextarea(textarea) {
		if (!textarea) return;
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}

	focusTextarea() {
		const textarea = this.shadowRoot.querySelector('textarea');
		if (textarea) {
			textarea.focus();
		}
	}

	scrollCardToTopOnIOS() {
		if (isIOS) {
			const cardsList = this.closest('.cards-list');
			if (cardsList) {
				const cardsListRect = cardsList.getBoundingClientRect();
				const cardRect = this.getBoundingClientRect();
				const headerHeight = parseFloat(
					getComputedStyle(this).getPropertyValue('--editor-header-height'),
				);
				const BUFFER = 16;
				cardsList.scrollTop +=
					cardRect.top - cardsListRect.top - headerHeight - BUFFER;
			}
		}
	}

	#syncFromAttrs() {
		const textarea = this.shadowRoot.querySelector('textarea');
		const senderSwitch = this.shadowRoot.querySelector('sender-switch');
		const dateInput = this.shadowRoot.querySelector('.initial-time-input');
		const dateText = this.shadowRoot.querySelector('.date-text');
		const timeSinceSelect = this.shadowRoot.querySelector('.time-since-select');
		const exactTimeContainer = this.shadowRoot.querySelector(
			'.exact-time-container',
		);
		const exactTimeInput = this.shadowRoot.querySelector('.exact-time-input');

		if (textarea && textarea.value !== this.text) {
			textarea.value = this.text;
			this.#resizeTextarea(textarea);
			// Reset Enter counter when text changes programmatically
			this._consecutiveEnters = 0;
			this._lastEnterTime = 0;
		}
		if (senderSwitch) {
			const isSelf = this.sender === 'self';
			if (senderSwitch.checked !== isSelf) {
				senderSwitch.checked = isSelf;
			}
		}

		if (this.isFirst) {
			if (dateInput) dateInput.style.display = '';
			if (dateText) dateText.style.display = 'none';
			if (timeSinceSelect) timeSinceSelect.style.display = 'none';

			// Set the datetime-local value from timestamp (= initialMessageTime for first card)
			if (dateInput) {
				const iso = this.timestamp;
				try {
					if (iso) {
						const d = new Date(iso);
						const pad = (n) => String(n).padStart(2, '0');
						const v = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
						dateInput.value = v;
					} else {
						dateInput.value = '';
					}
				} catch (_e) {
					dateInput.value = '';
				}
				this.#updateDateDisplay(dateInput);
			}
		} else {
			if (dateInput) dateInput.style.display = 'none';
			if (dateText) dateText.style.display = 'none';

			const isExact = this.timeSincePrevious === 'EXACT';
			if (timeSinceSelect) {
				timeSinceSelect.style.display = isExact ? 'none' : '';
				if (!isExact) timeSinceSelect.value = this.timeSincePrevious;
			}
			if (exactTimeContainer) {
				exactTimeContainer.style.display = isExact ? 'flex' : 'none';
				if (isExact && exactTimeInput) {
					const iso = this.exactTimestamp;
					try {
						if (iso) {
							const d = new Date(iso);
							const pad = (n) => String(n).padStart(2, '0');
							exactTimeInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
						} else {
							exactTimeInput.value = '';
						}
					} catch (_e) {
						exactTimeInput.value = '';
					}
					this.#updateExactDateDisplay(exactTimeInput);
				}
			}
		}
	}

	#updateDateDisplay(dateInput) {
		const iso = dateInput.value
			? new Date(dateInput.value).toISOString()
			: this.timestamp;
		const formatted = this.#formatDate(iso);
		dateInput.setAttribute('data-formatted', formatted);
		dateInput.setAttribute('title', formatted);
	}

	#updateExactDateDisplay(input) {
		const iso = input.value
			? new Date(input.value).toISOString()
			: this.exactTimestamp;
		const formatted = this.#formatDate(iso);
		input.setAttribute('data-formatted', formatted);
		input.setAttribute('title', formatted);
	}

	#syncReadOnly() {
		const isReadOnly = this.hasAttribute('readonly');
		const textarea = this.shadowRoot?.querySelector('textarea');
		const senderSwitch = this.shadowRoot?.querySelector('sender-switch');
		const dateInput = this.shadowRoot?.querySelector('.initial-time-input');
		const timeSinceSelect =
			this.shadowRoot?.querySelector('.time-since-select');
		const deleteBtn = this.shadowRoot?.querySelector('[part="delete"]');
		const addBelowBtn = this.shadowRoot?.querySelector('[part="add-below"]');
		const insertImageBtn = this.shadowRoot?.querySelector(
			'[part="insert-image"]',
		);

		const exactTimeInput = this.shadowRoot?.querySelector('.exact-time-input');
		const exactTimeReset = this.shadowRoot?.querySelector('.exact-time-reset');
		if (textarea) textarea.readOnly = isReadOnly;
		if (senderSwitch) {
			if (isReadOnly) senderSwitch.setAttribute('disabled', '');
			else senderSwitch.removeAttribute('disabled');
		}
		if (dateInput) dateInput.disabled = isReadOnly;
		if (timeSinceSelect) timeSinceSelect.disabled = isReadOnly;
		if (exactTimeInput) exactTimeInput.disabled = isReadOnly;
		if (exactTimeReset) exactTimeReset.disabled = isReadOnly;
		const isOnly = this.hasAttribute('only');
		if (deleteBtn) deleteBtn.style.display = isReadOnly || isOnly ? 'none' : '';
		if (addBelowBtn) addBelowBtn.style.display = isReadOnly ? 'none' : '';
		if (insertImageBtn) insertImageBtn.style.display = isReadOnly ? 'none' : '';
	}

	_onKeyDown(e) {
		if (this.hasAttribute('readonly')) return;
		const target = e.target;
		if (!target || !target.matches('textarea')) return;

		// Handle Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to add message below
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			this.#emit('editor:add-below', { id: this.messageId });
			return;
		}

		// Check if Enter key is pressed
		if (e.key === 'Enter' && !e.shiftKey) {
			const textarea = target;
			const cursorPos = textarea.selectionStart;
			const textLength = textarea.value.length;

			// Check if cursor is at the bottom (at the end of the text)
			const isAtBottom = cursorPos === textLength;

			if (isAtBottom) {
				const now = Date.now();
				// Reset counter if more than 1 second has passed since last Enter
				if (now - this._lastEnterTime > 1000) {
					this._consecutiveEnters = 0;
				}

				this._consecutiveEnters++;
				this._lastEnterTime = now;

				// If three Enters pressed consecutively at the bottom
				if (this._consecutiveEnters >= 3) {
					e.preventDefault();
					this._consecutiveEnters = 0;
					this._lastEnterTime = 0;
					// Remove the two newlines that were already inserted from the first two Enters
					const currentValue = textarea.value;
					const newValue = currentValue.slice(0, -2);
					textarea.value = newValue;
					this.#resizeTextarea(textarea);
					this.#emit('editor:update', {
						id: this.messageId,
						patch: { message: newValue },
					});
					// Emit add-below event
					this.#emit('editor:add-below', { id: this.messageId });
					return;
				}
			} else {
				// Reset counter if Enter is pressed but not at bottom
				this._consecutiveEnters = 0;
			}
		} else {
			// Reset counter on any other key
			this._consecutiveEnters = 0;
		}
	}

	_onInput(e) {
		if (this.hasAttribute('readonly')) return;
		const target = e.target;
		if (!target) return;
		if (target.matches('textarea')) {
			this.#resizeTextarea(target);
			this.#emit('editor:update', {
				id: this.messageId,
				patch: { message: target.value },
			});
		} else if (target.matches('.initial-time-input')) {
			const value = target.value;
			const iso = value ? new Date(value).toISOString() : null;
			this.#emit('editor:update', {
				id: this.messageId,
				patch: { initialTime: iso },
			});
			this.#updateDateDisplay(target);
		} else if (target.matches('.exact-time-input')) {
			const value = target.value;
			const iso = value ? new Date(value).toISOString() : null;
			this.#emit('editor:update', {
				id: this.messageId,
				patch: { exactTimestamp: iso },
			});
			this.#updateExactDateDisplay(target);
		}
	}

	_onChange(e) {
		if (this.hasAttribute('readonly')) return;
		const target = e.target;
		if (target && target.matches('select.time-since-select')) {
			const value = target.value;
			if (value === 'EXACT') {
				this.#emit('editor:update', {
					id: this.messageId,
					patch: { timeSincePrevious: 'EXACT', exactTimestamp: this.timestamp },
				});
			} else {
				this.#emit('editor:update', {
					id: this.messageId,
					patch: { timeSincePrevious: value },
				});
			}
		}
	}

	_onClick(e) {
		if (this.hasAttribute('readonly')) return;
		const target = e.composedPath()[0] ?? e.target;
		const button = target.closest?.('button');
		if (button && button.classList.contains('exact-time-reset')) {
			this.#emit('editor:update', {
				id: this.messageId,
				patch: { timeSincePrevious: 'PT1M' },
			});
			return;
		}
		if (button && button.part) {
			// Handle button clicks
			if (button.part.contains('delete')) {
				this.#emit('editor:delete', { id: this.messageId });
				return;
			}
			if (button.part.contains('add-below')) {
				this.#emit('editor:add-below', { id: this.messageId });
				return;
			}
			if (button.part.contains('insert-image')) {
				this.#emit('editor:insert-image', { id: this.messageId });
				return;
			}
			return;
		}

		// If clicking on an interactable element, don't interfere
		if (
			target.matches?.('select') ||
			target.matches?.('sender-switch') ||
			target.closest?.('select') ||
			target.closest?.('sender-switch')
		) {
			return;
		}

		// Clicking anywhere else in the card should focus the textarea
		this.scrollCardToTopOnIOS();
		this.focusTextarea();
	}

	#emit(type, detail) {
		this.dispatchEvent(
			new CustomEvent(type, { detail, bubbles: true, composed: true }),
		);
	}
}

customElements.define('message-card', MessageCard);
