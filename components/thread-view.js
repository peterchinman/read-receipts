import './sender-switch.js';
import './icon-arrow.js';
import { html } from '../utils/template.js';
import { MQ } from '../utils/breakpoints.js';
import { arrowSvg } from './icons/arrow-svg.js';
import { infoSvg } from './icons/info-svg.js';
import { composeSvg } from './icons/compose-svg.js';
import { HIDE_SCROLLBAR_CSS } from '../utils/scrollbar.js';

const isIOS =
	/iPad|iPhone|iPod/.test(navigator.userAgent) ||
	(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

class ThreadDisplay extends HTMLElement {
	static FLASH_DURATION_MS = 1500;

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._onMessageListScroll = this._onMessageListScroll.bind(this);

		this._messages = [];
		this.$ = {};
		this._shrinkWrapAllRafId = null;
		this._shrinkWrapForRafId = null;
		this._scrollRafId = null;
		this._focusMessageRafId = null;
		this._iosGradientSyncRafId = null;
		this._inputObserver = null;
		this._headerObserver = null;
		this._shrinkWrapInitialized = false;

		this.#renderShell();
	}

	static get observedAttributes() {
		return [
			'recipient-name',
			'recipient-location',
			'interactive',
			'show-input',
			'nav-text',
			'nav-action',
			'show-back-button',
			'show-info-button',
			'show-compose-button',
			'show-right-info-button',
		];
	}

	connectedCallback() {
		this.classList.toggle('ios', Boolean(isIOS));

		const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		if (isTouch) this.classList.add('touch-screen');
		else this.classList.remove('touch-screen');

		this.#applyNavConfig();
		this.#applyInteractiveState();
		this.#applyInputVisibility();
		this.#renderRecipientFromAttributes();

		if (this.$?.messageList) {
			this.$.messageList.addEventListener('scroll', this._onMessageListScroll, {
				passive: true,
			});
		}

		if (!this._inputObserver && this.$?.bottom) {
			let inputObserverReady = false;
			this._inputObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const height = entry.target.getBoundingClientRect().height;
					const isNearBottom = this.#isNearBottom();
					this.$.messageList.style.setProperty(
						'--bottom-area-height',
						`${height}px`,
					);
					if (inputObserverReady && isNearBottom) {
						this.scrollToBottom();
					}
				}
				inputObserverReady = true;
			});
			this._inputObserver.observe(this.$.bottom);
		}

		if (!this._headerObserver && this.$?.header) {
			this._headerObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const height = entry.target.getBoundingClientRect().height;
					this.$.messageList.style.setProperty(
						'--preview-header-height',
						`${height}px`,
					);
				}
			});
			this._headerObserver.observe(this.$.header);
		}

		this.renderReset(this._messages);
		this._shrinkWrapInit();
		this._scheduleIOSGradientSync();
	}

	disconnectedCallback() {
		if (this.$?.messageList) {
			this.$.messageList.removeEventListener(
				'scroll',
				this._onMessageListScroll,
			);
		}
		if (this._inputObserver) {
			this._inputObserver.disconnect();
			this._inputObserver = null;
		}
		if (this._headerObserver) {
			this._headerObserver.disconnect();
			this._headerObserver = null;
		}
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		switch (name) {
			case 'recipient-name':
			case 'recipient-location':
				this.#renderRecipientFromAttributes();
				break;
			case 'interactive':
				this.#applyInteractiveState();
				break;
			case 'show-input':
				this.#applyInputVisibility();
				break;
			case 'nav-text':
			case 'nav-action':
			case 'show-back-button':
				this.#applyNavConfig();
				break;
			default:
				break;
		}
	}

	get refs() {
		return this.$;
	}

	setMessages(messages) {
		this._messages = Array.isArray(messages) ? messages : [];
		this.renderReset(this._messages);
	}

	setRecipient(recipient) {
		this.#renderRecipient(recipient);
	}

	renderAdd(message, messages) {
		if (Array.isArray(messages)) this._messages = messages;
		const nodes = this.#insertMessageNodesAtIndex(message, messages);
		this._shrinkWrapFor(nodes);
		this.#refreshConsecutiveAround(nodes);
	}

	renderUpdate(message, messages) {
		if (!message) return;
		if (Array.isArray(messages)) this._messages = messages;
		this.#removeMessageNodes(message.id);
		const nodes = this.#insertMessageNodesAtIndex(message, messages);
		this._shrinkWrapFor(nodes);
		this.#refreshConsecutiveAround(nodes);
	}

	renderDelete(message) {
		if (!message) return;
		const deletedNodes = this.$.messageList?.querySelectorAll(
			`[data-id="${message.id}"]`,
		);
		const nextRow = deletedNodes?.length
			? this.#nextMessageRow(deletedNodes[deletedNodes.length - 1])
			: null;
		this.#removeMessageNodes(message.id);
		if (nextRow) this.#applyConsecutive(nextRow, this.#prevMessageRow(nextRow));
	}

	renderReset(messages) {
		this._messages = Array.isArray(messages) ? messages : [];
		this.#renderAll(this._messages);
		this.#refreshConsecutiveSpacing();
		this._scheduleShrinkWrapAll();
	}

	scrollToBottom(behavior = 'auto') {
		const messageList = this.$?.messageList;
		if (!messageList) return;
		if (this._scrollRafId) cancelAnimationFrame(this._scrollRafId);
		this._scrollRafId = requestAnimationFrame(() => {
			messageList.scrollTo({ top: messageList.scrollHeight, behavior });
		});
	}

	focusMessage(id) {
		if (!id) return;
		const messageNode = this.#findFirstNodeByMessageId(id);
		if (messageNode && this.$?.messageList) {
			if (this._focusMessageRafId)
				cancelAnimationFrame(this._focusMessageRafId);
			this._focusMessageRafId = requestAnimationFrame(() => {
				const container = this.$.messageList;
				const nodeRect = messageNode.getBoundingClientRect();
				const containerRect = container.getBoundingClientRect();
				const relativeTop =
					nodeRect.top - containerRect.top + container.scrollTop;
				const messageHeight = nodeRect.height;
				const containerHeight = containerRect.height;
				const scrollTop = relativeTop - containerHeight / 2 + messageHeight / 2;

				container.scrollTo({
					top: Math.max(
						0,
						Math.min(scrollTop, container.scrollHeight - containerHeight),
					),
					behavior: 'smooth',
				});

				const bubbles = messageNode.querySelectorAll('.bubble');
				for (const bubble of bubbles) {
					bubble.classList.add('flash');
					setTimeout(
						() => bubble.classList.remove('flash'),
						ThreadDisplay.FLASH_DURATION_MS,
					);
				}

				this._focusMessageRafId = null;
			});
		}
	}

	_onMessageListScroll() {
		this._scheduleIOSGradientSync();
	}

	#renderShell() {
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
					font-family: -apple-system, BlinkMacSystemFont, sans-serif;
				}

				.window {
					position: relative;
					display: flex;
					flex-direction: column;
					justify-content: space-between;
					min-height: 100%;
					max-height: 100%;
					height: 100%;

					line-height: var(--line-height);
				}

				.preview-header {
					position: absolute;
					width: 100%;
					top: 0;
					left: 0;
					display: grid;
					grid-template-columns: 1fr auto 1fr;
					align-items: center;
					padding-inline: var(--padding-inline);
					background: var(--color-header);
					border-bottom: 1px solid var(--color-edge);
					-webkit-backdrop-filter: var(--backdrop-filter);
					backdrop-filter: var(--backdrop-filter);
					padding-block: 0.7rem;
					user-select: none;
					z-index: 4;

					@media ${MQ.tablet} {
						grid-template-columns: 1fr;
					}
				}

				.preview-header .header-left {
					justify-self: start;
				}

				.header-left {
					justify-self: start;
					display: flex;
					align-items: center;
				}

				.icon-btn {
					display: none;
					background: none;
					border: none;
					cursor: pointer;
					color: var(--color-ink-subdued);
					padding: 4px;
					align-items: center;
					justify-content: center;
				}

				.icon-btn svg {
					width: var(--button-size);
					height: var(--button-size);
					fill: currentColor;
				}

				:host([show-info-button]) .info-btn {
					display: flex;
				}

				:host([show-info-button]) .preview-header icon-arrow {
					display: none;
				}

				:host([show-compose-button]) .compose-btn {
					display: flex;
				}

				:host([show-right-info-button]) .right-info-btn {
					display: flex;
				}

				.header-right {
					justify-self: end;
					min-width: 1px; /* keep the third column from collapsing weirdly */
					display: flex;
					align-items: center;
				}

				.recipient-info {
					justify-self: center;
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: calc(2rem / 14);
					line-height: 1.05;
					min-width: 0;
				}

				.recipient-avatar {
					font-family: var(--font-rounded);
					width: calc(44rem / 14);
					aspect-ratio: 1 / 1;
					border-radius: 100%;
					display: grid;
					place-items: center;
					font-size: calc(var(--font-size) * 1.25);
					font-weight: 900;
					background: linear-gradient(
						to bottom,
						var(--color-recipient-avatar-top),
						var(--color-recipient-avatar-bottom)
					);
					color: white;
					margin-bottom: calc(6rem / 14);

					.recipient-avatar-text {
						height: 1lh;
						padding-top: calc(
							1rem / 14
						); /* fudge to try to get text to align */
					}
				}

				.recipient-name-container {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: calc(4rem / 14);

					.recipient-name {
						font-size: var(--font-size-small);
						color: var(--color-ink);
						white-space: nowrap;
						max-width: 40dvw;
					}

					svg {
						width: calc(var(--font-size-small) * 0.7);
						height: calc(var(--font-size-small) * 0.7);
						transform: scaleX(-1);
						color: var(--color-ink-subdued);
					}
				}

				.recipient-location {
					font-size: calc(var(--font-size-small) * 0.9);
					color: var(--color-ink-subdued);
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					max-width: 55dvw;
				}

				/* On wide layouts we show editor + preview simultaneously, so hide mode switch */
				@media ${MQ.tablet} {
					.preview-header icon-arrow {
						display: none;
					}
				}

				/* Override: show back button at all widths when explicitly requested */
				:host([show-back-button]) .preview-header icon-arrow {
					display: block;
				}

				:host([show-back-button]) .preview-header,
				:host([show-info-button]) .preview-header,
				:host([show-compose-button]) .preview-header,
				:host([show-right-info-button]) .preview-header {
					grid-template-columns: 1fr auto 1fr;
				}

				.message-list {
					display: flex;
					flex-direction: column;
					/* Fill the available window height so the spacer can grow */
					flex: 1 1 auto;
					min-height: 0;
					overflow-y: scroll;
					background: linear-gradient(
						to top,
						var(--color-bubble-self),
						var(--color-bubble-self-faded)
					);

					/*transition: opacity 180ms ease-in;*/
				}

				/* iOS Safari breaks mix-blend-mode inside large overflow scrollers once
				   it switches to a tiled backing store. On iOS we avoid blend-mode and
				   instead paint the gradient directly into self bubbles (aligned via CSS vars). */
				:host(.ios) .message-list {
					background: var(--color-page);
					--scroll-top: 0px;
					--list-height: 0px;
				}

				:host(.ios) .container.mask {
					/* Keep the mask container in-flow so message rows retain their height,
					   but disable blend-mode painting (we render self bubbles directly). */
					mix-blend-mode: normal;
					background-color: transparent;
					pointer-events: none;
				}

				:host(.ios) .container.mask .bubble {
					visibility: hidden;
				}

				/* Fills any unused space at the bottom of the scroll area with page color */
				.message-list-spacer {
					flex: 1 0 0px;
					width: 100%;
					background: var(--color-page);
					pointer-events: none;
					padding-bottom: var(--bottom-area-height, 0px);
				}

				.shrink-wrap-pending {
					/*opacity: 0;*/
					/*transform: translateX(100%);*/
				}

				.message-row {
					width: 100%;
					position: relative;

					&:not(:first-child) .bubble {
						margin-top: var(--message-spacing);
					}

					&:first-child .container {
						padding-top: calc(
							var(--message-spacing) + var(--preview-header-height, 0px)
						);
					}

					&.self:has(+ .self.consecutive),
					&.other:has(+ .other.consecutive) {
						svg {
							display: none;
						}
					}

					&.consecutive {
						.bubble {
							margin-top: var(--consecutive-message-spacing);
						}
					}
				}

				.container {
					display: flex;
					flex-direction: column;
					padding-inline: var(--padding-inline);

					&.message {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
					}

					&.mask {
						background-color: var(--color-page);
						mix-blend-mode: var(--mask-blend-mode);
					}
				}

				.bubble {
					position: relative;
					display: flex;
					align-items: center;
					padding-inline: var(--message-padding-inline);
					padding-block: var(--message-padding-block);
					border-radius: var(--border-radius);

					max-width: 66%;

					.self & {
						align-self: end;
						justify-content: flex-end;

						.message-tail {
							right: var(--message-tail-offset);
						}
					}

					.other & {
						align-self: start;

						svg {
							transform: scale(-1, 1);
							left: var(--message-tail-offset);
						}
					}

					.self &.message {
						color: white;
						fill: transparent;
					}

					.self &.mask {
						background-color: var(--color-ink);
						fill: var(--color-ink);
					}

					.other &.message {
						background-color: var(--color-bubble-other);
						color: var(--color-ink);
						fill: var(--color-bubble-other);
					}

					.other &.mask {
						background-color: var(--color-bubble-other);
						fill: var(--color-bubble-other);
					}

					svg {
						position: absolute;
						bottom: 0;
						width: calc(10.5rem / 14);
						height: calc(14rem / 14);
					}

					&.flash {
						animation: flash ${ThreadDisplay.FLASH_DURATION_MS / 1000}s
							ease-in-out;
						z-index: 1000;
					}
				}

				/* iOS-only: replace blend-mode masking with per-bubble gradient painting
				   (aligned to the message-list gradient coordinate space via CSS vars). */
				:host(.ios) .message-row.self .bubble.message {
					background-image: linear-gradient(
						to top,
						var(--color-bubble-self),
						var(--color-bubble-self-faded)
					);
					background-repeat: no-repeat;
					background-size: 100% var(--list-height, 0px);
					background-position: 0
						calc(-1 * (var(--bubble-offset-top, 0px) - var(--scroll-top, 0px)));
				}

				:host(.ios) .message-row.self .bubble.message svg.message-tail {
					display: none;
				}

				:host(.ios) .message-row.self .bubble.message::after {
					content: '';
					position: absolute;
					bottom: 0;
					right: var(--message-tail-offset);
					width: calc(10.5rem / 14);
					height: calc(14rem / 14);

					background-image: linear-gradient(
						to top,
						var(--color-bubble-self),
						var(--color-bubble-self-faded)
					);
					background-repeat: no-repeat;
					background-size: 100% var(--list-height, 0px);
					background-position: 0
						calc(-1 * (var(--bubble-offset-top, 0px) - var(--scroll-top, 0px)));

					-webkit-mask-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2021%2028'%3E%3Cpath%20fill%3D'white'%20d%3D'M21.006%2C27.636C21.02%2C27.651%2011.155%2C30.269%201.302%2C21.384C0.051%2C20.256%200.065%2C15.626%200.006%2C14.004C-0.253%2C6.917%208.514%2C-0.156%2011.953%2C0.003L11.953%2C13.18C11.953%2C17.992%2012.717%2C23.841%2021.006%2C27.636Z'%2F%3E%3C%2Fsvg%3E");
					-webkit-mask-repeat: no-repeat;
					-webkit-mask-size: 100% 100%;
					-webkit-mask-position: 0 0;
				}

				/* Match the existing "no tail for consecutive messages" behavior. */
				:host(.ios) .message-row.self:has(+ .self.consecutive) .bubble.message::after {
					display: none;
				}

				.bubble.image-bubble {
					padding: 0;
					background-color: transparent !important;
					fill: transparent !important;
					overflow: hidden;
				}

				.bubble.image-bubble img {
					display: block;
					max-width: 240px;
					height: auto;
				}

				@keyframes flash {
					0% {
						transform: translateX(0) rotate(0deg) scale(1);
					}
					10% {
						transform: translateX(-2px) rotate(-1deg) scale(1.01);
					}
					20% {
						transform: translateX(2px) rotate(1deg) scale(1.01);
					}
					30% {
						transform: translateX(-2px) rotate(-1deg) scale(1.01);
					}
					40% {
						transform: translateX(2px) rotate(1deg) scale(1.01);
					}
					50% {
						transform: translateX(-1px) rotate(-0.5deg) scale(1.005);
					}
					60% {
						transform: translateX(1px) rotate(0.5deg) scale(1.005);
					}
					100% {
						transform: translateX(0) rotate(0deg) scale(1);
					}
				}

				.bottom-area {
					--tight-padding: calc(4rem / 14);
					position: absolute;
					bottom: 0;
					display: flex;
					width: 100%;
					padding-inline: var(--padding-inline);
					padding-block: 1rem;
					justify-content: space-between;
					align-items: flex-end;
					gap: 0.5rem;
					background: var(--color-overlay);
					backdrop-filter: var(--backdrop-filter);
					-webkit-backdrop-filter: var(--backdrop-filter);
				}

				.input-container {
					justify-content: stretch;
					border: 1px solid var(--color-edge);
					padding-left: var(--message-padding-inline);
					padding-right: var(--tight-padding);
					border-radius: 1.3rem;
					flex-grow: 1;

					display: flex;
					align-items: center;

					background: var(--color-page);

					.input {
						all: unset;
						max-width: 100%;
						min-height: 1lh;
						width: 100%;
						overflow: hidden;
						box-sizing: border-box;
						overflow-wrap: break-word;
						margin-block: var(--message-padding-block);
					}

					.send-button {
						all: unset;
						align-self: flex-end;
						cursor: pointer;
						color: white;
						background-color: var(--color-bubble-self);
						min-height: calc(
							1lh + 2 * var(--message-padding-block) - 2 * var(--tight-padding)
						);
						min-width: calc(
							1lh + 2 * var(--message-padding-block) - 2 * var(--tight-padding)
						);
						border-radius: 50%;
						margin-block: var(--tight-padding);
						display: flex;
						align-items: center;
						justify-content: center;

						svg {
							height: calc(14rem / 14);
							width: calc(14rem / 14);
						}
						/* padding: 0.3rem; */
					}

					.input:placeholder-shown + .send-button {
						display: none;
					}

					/* Hide send button on non-touch devices */
					body:not(.touch-screen) & .send-button {
						display: none;
					}
				}

				.bottom-area:has(.input:placeholder-shown) sender-switch {
					display: none;
				}

				.options-container {
					position: relative;
					min-width: var(--single-line-message-height);
					min-height: var(--single-line-message-height);
					display: flex;
					align-items: center;
					justify-content: center;
					background-color: var(--color-menu);
					border: 1px solid transparent;
					border-radius: 100%;

					color: var(--color-ink-subdued);

					input {
						position: absolute;
						opacity: 0;
						height: 0;
						width: 0;
					}

					.options-menu {
						display: none;
						position: absolute;
						bottom: var(--single-line-message-height);
						left: 0;
						min-width: max-content;
						color: var(--color-ink);

						padding-inline: 0.3rem;
						padding-block: 0.3rem;

						background-color: var(--color-menu);
						border: 1px solid var(--color-edge);
						border-radius: 0.4rem;

						filter: drop-shadow(0 0 0.7rem rgba(0, 0, 0, 0.3));

						.options-item {
							padding-inline: 0.6rem;
							padding-block: 0.3rem;
							border-radius: 0.3rem;
							list-style-type: none;
						}

						.options-item:hover {
							color: white;
							background-color: color-mix(
								in oklab,
								var(--color-menu) 20%,
								var(--color-bubble-self) 80%
							);
						}
					}

					input:checked + .options-menu {
						display: block;
					}
				}

				:host(:not([interactive])) .bottom-area {
					pointer-events: none;
				}

				${HIDE_SCROLLBAR_CSS}
			</style>
			<svg style="display:none">
				<defs>
					<symbol id="message-tail" viewBox="0 0 21 28">
						<path
							d="M21.006,27.636C21.02,27.651 11.155,30.269 1.302,21.384C0.051,20.256 0.065,15.626 0.006,14.004C-0.253,6.917 8.514,-0.156 11.953,0.003L11.953,13.18C11.953,17.992 12.717,23.841 21.006,27.636Z"
						/>
					</symbol>
				</defs>
			</svg>
			<section class="window">
				<header class="preview-header">
					<div class="header-left">
						<icon-arrow class="nav-arrow"></icon-arrow>
						<button class="icon-btn info-btn" aria-label="About">
							${infoSvg()}
						</button>
					</div>
					<div class="recipient-info">
						<div class="recipient-avatar" aria-hidden="true">
							<span class="recipient-avatar-text">?</span>
						</div>
						<div class="recipient-name-container">
							<div class="recipient-name" id="recipientName">Recipient</div>
							${arrowSvg()}
						</div>
						<div class="recipient-location" id="recipientLocation"></div>
					</div>
					<div class="header-right">
						<button class="icon-btn right-info-btn" aria-label="About">
							${infoSvg()}
						</button>
						<button class="icon-btn compose-btn" aria-label="Create">
							${composeSvg()}
						</button>
					</div>
				</header>
				<div class="message-list hide-scrollbar">
					<div class="message-list-spacer" aria-hidden="true"></div>
				</div>
				<div class="bottom-area">
					<label class="options-container">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 100 100"
							width="14"
							height="14"
						>
							<path
								d="M 50 20 L 50 80 M 20 50 L 80 50"
								stroke="currentColor"
								stroke-width="10"
								stroke-linecap="round"
								fill="none"
							/>
						</svg>
						<input type="checkbox" id="options-button" />
						<ul class="options-menu">
							<li class="options-item" id="clearChat">Clear chat</li>
							<li class="options-item" id="exportChat">Export chat</li>
							<li class="options-item" id="importChat">Import chat</li>
						</ul>
					</label>
					<div class="input-container input-sizer stacked">
						<textarea class="input" rows="1" placeholder="iMessage"></textarea>
						<button class="send-button" type="button">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
								<line
									x1="128"
									y1="216"
									x2="128"
									y2="40"
									fill="none"
									stroke="currentColor"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="40"
								/>
								<polyline
									points="56 112 128 40 200 112"
									fill="none"
									stroke="currentColor"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="40"
								/>
							</svg>
						</button>
					</div>
					<sender-switch id="senderSwitch" checked></sender-switch>
				</div>
			</section>
			<input
				id="import-file"
				type="file"
				accept=".json"
				style="display:none"
			/>
    `;

		this.$ = {
			header: this.shadowRoot.querySelector('.preview-header'),
			messageList: this.shadowRoot.querySelector('.message-list'),
			messageListSpacer: this.shadowRoot.querySelector('.message-list-spacer'),
			bottom: this.shadowRoot.querySelector('.bottom-area'),
			input: this.shadowRoot.querySelector('.input'),
			send: this.shadowRoot.querySelector('.send-button'),
			optionsButton: this.shadowRoot.querySelector('#options-button'),
			optionsContainer: this.shadowRoot.querySelector('.options-container'),
			clearChat: this.shadowRoot.querySelector('#clearChat'),
			exportChat: this.shadowRoot.querySelector('#exportChat'),
			importChat: this.shadowRoot.querySelector('#importChat'),
			senderSwitch: this.shadowRoot.querySelector('#senderSwitch'),
			importFile: this.shadowRoot.querySelector('#import-file'),
			recipientAvatar: this.shadowRoot.querySelector('.recipient-avatar-text'),
			recipientName: this.shadowRoot.querySelector('#recipientName'),
			recipientLocation: this.shadowRoot.querySelector('#recipientLocation'),
			navArrow: this.shadowRoot.querySelector('.nav-arrow'),
			infoBtn: this.shadowRoot.querySelector('.info-btn'),
			rightInfoBtn: this.shadowRoot.querySelector('.right-info-btn'),
			composeBtn: this.shadowRoot.querySelector('.compose-btn'),
		};

		this.$.infoBtn?.addEventListener('click', () => {
			this.dispatchEvent(
				new CustomEvent('navigate', {
					detail: { action: 'info' },
					bubbles: true,
					composed: true,
				}),
			);
		});

		this.$.rightInfoBtn?.addEventListener('click', () => {
			this.dispatchEvent(
				new CustomEvent('navigate', {
					detail: { action: 'info' },
					bubbles: true,
					composed: true,
				}),
			);
		});

		this.$.composeBtn?.addEventListener('click', () => {
			this.dispatchEvent(
				new CustomEvent('navigate', {
					detail: { action: 'create' },
					bubbles: true,
					composed: true,
				}),
			);
		});
	}

	#resolveNavConfig() {
		const navTextAttr = this.getAttribute('nav-text');
		const navActionAttr = this.getAttribute('nav-action');
		if (navTextAttr || navActionAttr) {
			return {
				text: navTextAttr || '',
				action: navActionAttr || '',
			};
		}
		if (this.hasAttribute('show-back-button')) {
			return { text: 'Back', action: 'back' };
		}
		return { text: 'Edit', action: 'show-editor' };
	}

	#applyNavConfig() {
		const navArrow = this.$?.navArrow;
		if (!navArrow) return;
		const { text, action } = this.#resolveNavConfig();
		if (text) navArrow.setAttribute('text', text);
		else navArrow.removeAttribute('text');
		if (action) navArrow.setAttribute('action', action);
		else navArrow.removeAttribute('action');
	}

	#applyInteractiveState() {
		const isInteractive = this.hasAttribute('interactive');
		if (this.$?.bottom) {
			this.$.bottom.style.pointerEvents = isInteractive ? '' : 'none';
		}
		if (this.$?.input) {
			this.$.input.readOnly = !isInteractive;
			this.$.input.tabIndex = isInteractive ? 0 : -1;
		}
		if (this.$?.send) this.$.send.disabled = !isInteractive;
		if (this.$?.optionsButton) {
			this.$.optionsButton.disabled = !isInteractive;
			if (!isInteractive) this.$.optionsButton.checked = false;
		}
	}

	#applyInputVisibility() {
		const attr = this.getAttribute('show-input');
		const normalized = attr ? String(attr).toLowerCase().trim() : null;
		const showInput =
			normalized === null || !['false', '0', 'no'].includes(normalized);
		if (this.$?.bottom) {
			this.$.bottom.style.display = showInput ? '' : 'none';
		}
		if (!showInput && this.$?.messageList) {
			this.$.messageList.style.setProperty('--bottom-area-height', '0px');
		}
	}

	#renderRecipientFromAttributes() {
		const name = this.getAttribute('recipient-name') || '';
		const location = this.getAttribute('recipient-location') || '';
		this.#renderRecipient({ name, location });
	}

	#renderRecipient(recipient) {
		if (!recipient || typeof recipient !== 'object') return;
		const nameRaw =
			typeof recipient.name === 'string' ? recipient.name.trim() : '';
		const locationRaw =
			typeof recipient.location === 'string' ? recipient.location.trim() : '';

		const name = nameRaw || 'Recipient';
		const location = locationRaw;

		if (this.$?.recipientName) this.$.recipientName.textContent = name;

		const initials = this.#getInitials(name);
		if (this.$?.recipientAvatar)
			this.$.recipientAvatar.textContent = String(initials).toUpperCase();

		if (this.$?.recipientLocation) {
			this.$.recipientLocation.textContent = location;
			this.$.recipientLocation.style.display = location ? '' : 'none';
		}
	}

	#getInitials(name) {
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

	#createBubbleRow(message, sender, id) {
		const row = document.createElement('div');
		row.className = `message-row ${sender}`;
		if (id) row.dataset.id = String(id);

		const maskContainer = document.createElement('div');
		maskContainer.className = 'mask container';
		const maskBubble = document.createElement('div');
		maskBubble.className = 'mask bubble';
		maskContainer.appendChild(maskBubble);

		const maskText = document.createElement('span');
		maskText.textContent = message;

		const svgNS = 'http://www.w3.org/2000/svg';
		const xlinkNS = 'http://www.w3.org/1999/xlink';

		const maskSvg = document.createElementNS(svgNS, 'svg');
		maskSvg.classList.add('message-tail');
		maskSvg.style.fill = 'inherit';

		const use = document.createElementNS(svgNS, 'use');
		use.setAttributeNS(xlinkNS, 'href', '#message-tail');

		maskSvg.appendChild(use);
		const messageSvg = maskSvg.cloneNode(true);

		maskBubble.appendChild(maskText);
		maskBubble.appendChild(maskSvg);
		maskContainer.appendChild(maskBubble);

		const messageContainer = document.createElement('div');
		messageContainer.className = 'message container';
		const bubbleDiv = document.createElement('div');
		bubbleDiv.className = `message bubble`;

		const messageText = document.createElement('span');
		messageText.textContent = message;

		bubbleDiv.appendChild(messageText);
		bubbleDiv.appendChild(messageSvg);
		messageContainer.appendChild(bubbleDiv);
		row.appendChild(maskContainer);
		row.appendChild(messageContainer);
		return row;
	}

	#createImage(img, sender, id) {
		const src = img?.src || img?.url || '';
		if (!src) return null;
		const row = document.createElement('div');
		row.className = `message-row ${sender}`;
		if (id) row.dataset.id = String(id);

		const bubble = document.createElement('div');
		bubble.className = 'message bubble image-bubble';
		const image = document.createElement('img');
		image.src = src;
		image.alt = img?.alt || img?.alt_text || '';
		const svgNS = 'http://www.w3.org/2000/svg';
		const xlinkNS = 'http://www.w3.org/1999/xlink';
		const svg = document.createElementNS(svgNS, 'svg');
		svg.classList.add('message-tail');
		svg.style.fill = 'inherit';
		const use = document.createElementNS(svgNS, 'use');
		use.setAttributeNS(xlinkNS, 'href', '#message-tail');
		svg.appendChild(use);
		bubble.appendChild(image);
		bubble.appendChild(svg);
		row.appendChild(bubble);
		return row;
	}

	#renderMessageNodes(m) {
		const nodes = [];
		const sender =
			m && (m.sender === 'self' || m.sender === 'other') ? m.sender : 'self';
		const id = m && m.id ? m.id : '';
		const timestamp = m?.timestamp ?? '';
		if (m && Array.isArray(m.images) && m.images.length > 0) {
			for (const img of m.images) {
				const imageNode = this.#createImage(img, sender, id);
				if (imageNode) {
					if (timestamp) imageNode.dataset.timestamp = timestamp;
					nodes.push(imageNode);
				}
			}
		}
		if (m && typeof m.message === 'string' && m.message.length > 0) {
			const bubbleRow = this.#createBubbleRow(m.message, sender, id);
			if (timestamp) bubbleRow.dataset.timestamp = timestamp;
			nodes.push(bubbleRow);
		}
		return nodes;
	}

	#findFirstNodeByMessageId(id) {
		const container = this.$.messageList;
		if (!container) return null;

		return container.querySelector(`[data-id="${id}"]`);
	}

	#removeMessageNodes(id) {
		const container = this.$.messageList;
		if (!container) return;
		container.querySelectorAll(`[data-id="${id}"]`).forEach((el) => {
			el.remove();
		});
	}

	#insertMessageNodesAtIndex(message, messages) {
		const container = this.$.messageList;
		if (!container || !message) return [];
		const nodes = this.#renderMessageNodes(message);
		if (nodes.length === 0) return [];
		const spacer = this.#ensureMessageListSpacer();
		const idx = Array.isArray(messages)
			? messages.findIndex((m) => m && m.id === message.id)
			: -1;
		let referenceNode = null;
		if (idx !== -1) {
			const next = messages[idx + 1];
			if (next && next.id) {
				referenceNode = this.#findFirstNodeByMessageId(next.id);
			}
		}
		for (const n of nodes) {
			if (referenceNode) container.insertBefore(n, referenceNode);
			else if (spacer) container.insertBefore(n, spacer);
			else container.appendChild(n);
		}
		return nodes;
	}

	#ensureMessageListSpacer() {
		const list = this.$.messageList;
		if (!list) return null;

		let spacer = this.$.messageListSpacer;
		if (!(spacer instanceof HTMLElement)) {
			spacer = this.shadowRoot.querySelector('.message-list-spacer');
		}
		if (!(spacer instanceof HTMLElement)) {
			spacer = document.createElement('div');
			spacer.className = 'message-list-spacer';
			spacer.setAttribute('aria-hidden', 'true');
		}

		this.$.messageListSpacer = spacer;

		if (spacer.parentElement !== list) {
			list.appendChild(spacer);
		} else if (list.lastElementChild !== spacer) {
			list.appendChild(spacer);
		}

		return spacer;
	}

	#renderAll(messages) {
		const messageList = this.$.messageList;
		if (!messageList) return;
		messageList.innerHTML = '';
		const spacer = this.#ensureMessageListSpacer();
		for (const m of messages || []) {
			const nodes = this.#renderMessageNodes(m);
			for (const n of nodes) {
				if (spacer) messageList.insertBefore(n, spacer);
				else messageList.appendChild(n);
			}
		}
	}

	#prevMessageRow(row) {
		let el = row.previousElementSibling;
		while (el && !el.classList.contains('message-row')) {
			el = el.previousElementSibling;
		}
		return el;
	}

	#nextMessageRow(row) {
		let el = row.nextElementSibling;
		while (el && !el.classList.contains('message-row')) {
			el = el.nextElementSibling;
		}
		return el;
	}

	#isConsecutiveRow(prevRow, currRow) {
		const prevSender = prevRow.classList.contains('self') ? 'self' : 'other';
		const currSender = currRow.classList.contains('self') ? 'self' : 'other';
		if (prevSender !== currSender) return false;
		const prevTime = prevRow.dataset.timestamp
			? new Date(prevRow.dataset.timestamp).getTime()
			: NaN;
		const currTime = currRow.dataset.timestamp
			? new Date(currRow.dataset.timestamp).getTime()
			: NaN;
		if (isNaN(prevTime) || isNaN(currTime)) return false;
		return currTime - prevTime < 15 * 60 * 1000;
	}

	#applyConsecutive(row, prevRow) {
		if (prevRow && this.#isConsecutiveRow(prevRow, row)) {
			row.classList.add('consecutive');
		} else {
			row.classList.remove('consecutive');
		}
	}

	#refreshConsecutiveAround(nodes) {
		if (!nodes.length) return;
		for (const node of nodes) {
			this.#applyConsecutive(node, this.#prevMessageRow(node));
		}
		const lastNode = nodes[nodes.length - 1];
		const nextRow = this.#nextMessageRow(lastNode);
		if (nextRow) this.#applyConsecutive(nextRow, this.#prevMessageRow(nextRow));
	}

	#refreshConsecutiveSpacing() {
		const list = this.$.messageList;
		if (!list) return;
		const rows = list.querySelectorAll('.message-row');
		let prevRow = null;
		for (const row of rows) {
			this.#applyConsecutive(row, prevRow);
			prevRow = row;
		}
	}

	#isNearBottom() {
		const container = this.$.messageList;
		if (!container) return false;
		return (
			container.scrollHeight - container.scrollTop - container.clientHeight < 10
		);
	}

	_shrinkWrapInit() {
		if (this._shrinkWrapInitialized || !this.$?.messageList) return;
		this._shrinkWrapInitialized = true;
		this.$.messageList.classList.add('shrink-wrap-pending');

		const runShrinkWrap = () => {
			this._scheduleShrinkWrapAll();
			requestAnimationFrame(() => {
				this.$.messageList.classList.remove('shrink-wrap-pending');
			});
		};

		if (document.readyState === 'complete') {
			runShrinkWrap();
		} else {
			window.addEventListener('load', runShrinkWrap, { once: true });
		}

		window.addEventListener(
			'resize',
			this._debounce(() => this._scheduleShrinkWrapAll(), 150),
		);
	}

	_shrinkWrapFor(nodes) {
		if (!nodes || nodes.length === 0) return;
		for (const el of nodes) {
			if (el && el.classList && el.classList.contains('message-row')) {
				const bubbles = el.querySelectorAll('.bubble');
				for (const bubble of bubbles) {
					this.#unwrapShrinkWrapForBubble(bubble);
				}
			}
		}
		if (this._shrinkWrapForRafId)
			cancelAnimationFrame(this._shrinkWrapForRafId);
		this._shrinkWrapForRafId = requestAnimationFrame(() => {
			for (const el of nodes) {
				let bubbles = [];
				if (el && el.classList && el.classList.contains('message-row')) {
					bubbles = Array.from(el.querySelectorAll('.bubble'));
				}

				for (const bubble of bubbles) {
					this.#applyShrinkWrapToBubble(bubble);
				}
			}
			this._shrinkWrapForRafId = null;
			this._scheduleIOSGradientSync();
		});
	}

	_shrinkWrapAll() {
		this.shadowRoot.querySelectorAll('.bubble').forEach((el) => {
			this.#applyShrinkWrapToBubble(el);
		});
		this._scheduleIOSGradientSync();
	}

	#applyShrinkWrapToBubble(bubble) {
		if (!bubble || typeof bubble.querySelector !== 'function') return;
		const span = bubble.querySelector('span');
		if (!span) return;
		const range = document.createRange();
		range.selectNodeContents(span);
		const { width } = range.getBoundingClientRect();
		bubble.style.width = `${width}px`;
		bubble.style.boxSizing = 'content-box';
	}

	#unwrapShrinkWrapForBubble(bubble) {
		if (!bubble || !bubble.style) return;
		bubble.style.width = '';
		bubble.style.boxSizing = '';
	}

	_shrinkWrapUnwrapAll() {
		this.shadowRoot.querySelectorAll('.bubble').forEach((el) => {
			this.#unwrapShrinkWrapForBubble(el);
		});
	}

	_scheduleShrinkWrapAll() {
		if (this._shrinkWrapAllRafId)
			cancelAnimationFrame(this._shrinkWrapAllRafId);
		this._shrinkWrapAllRafId = requestAnimationFrame(() => {
			this._shrinkWrapUnwrapAll();
			requestAnimationFrame(() => {
				this._shrinkWrapAll();
			});
			this._shrinkWrapAllRafId = null;
		});
	}

	_scheduleIOSGradientSync() {
		if (!isIOS) return;
		const list = this.$?.messageList;
		if (!list) return;
		if (this._iosGradientSyncRafId)
			cancelAnimationFrame(this._iosGradientSyncRafId);
		this._iosGradientSyncRafId = requestAnimationFrame(() => {
			list.style.setProperty('--scroll-top', `${list.scrollTop}px`);
			list.style.setProperty('--list-height', `${list.clientHeight}px`);

			const listRect = list.getBoundingClientRect();
			const selfBubbles = list.querySelectorAll(
				'.message-row.self .bubble.message',
			);
			for (const bubble of selfBubbles) {
				const r = bubble.getBoundingClientRect();
				const yVisible = r.top - listRect.top;
				const yContent = yVisible + list.scrollTop;
				bubble.style.setProperty('--bubble-offset-top', `${yContent}px`);
			}

			this._iosGradientSyncRafId = null;
		});
	}

	_debounce(func, wait) {
		let timeout;
		return (...args) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
	}
}

customElements.define('thread-view', ThreadDisplay);
export { ThreadDisplay };
