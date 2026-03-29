import { html } from '../utils/template.js';
import { initTooltips } from '../utils/tooltip.js';
import { isIOS } from '../utils/ios-viewport.js';
import type { SenderSwitchChangeDetail } from '../types/events.js';

export class SenderSwitch extends HTMLElement {
	#shadow: ShadowRoot;
	declare _touchStartY: number;
	declare _onTouchStart: ((e: TouchEvent) => void) | null;
	declare _onTouchEnd: ((e: TouchEvent) => void) | null;
	declare _cleanupTooltips: (() => void) | undefined;

	static get observedAttributes() {
		return ['checked', 'disabled'];
	}

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
		this._onChange = this._onChange.bind(this);
	}

	connectedCallback() {
		this.#shadow.innerHTML = html`
			<style>
				:host {
					--thumb-padding: calc(2rem / 14);
				}
				:host([disabled]) .sender-switch-container {
					opacity: 0.5;
					pointer-events: none;
				}
				.sender-switch-container {
					font-size: var(--font-size);

					display: block;
					position: relative;
					flex-shrink: 0;
					line-height: var(--line-height);
					width: calc(var(--button-size) * 1.5);
					height: var(--button-size);
					background-color: var(--color-bubble-other);
					border-radius: calc(var(--button-size) / 2);
					cursor: pointer;
					transition: background-color 0.3s ease-in-out;

					&:has(input:checked) {
						background-color: var(--color-bubble-self);
					}

					input {
						opacity: 0;
						height: 0;
						width: 0;
					}

					.switch-thumb {
						position: absolute;
						left: var(--thumb-padding);
						top: var(--thumb-padding);
						width: calc(var(--button-size) - 2 * var(--thumb-padding));
						height: calc(var(--button-size) - 2 * var(--thumb-padding));
						background-color: var(--color-page);
						border-radius: 50%;
						transition: left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

						filter: drop-shadow(
							calc(var(--button-size) / 8) 0 4px var(--color-drop-shadow)
						);
					}

					input:checked + .switch-thumb {
						left: calc(0.5 * var(--button-size) + var(--thumb-padding));
						filter: drop-shadow(
							-calc(var(--button-size) / 8) 0 4px
								var(--color-drop-shadow-intense)
						);
					}
				}
			</style>
			<label
				class="sender-switch-container"
				data-tooltip="Switch between senders"
			>
				<input type="checkbox" part="checkbox" />
				<div class="switch-thumb"></div>
			</label>
		`;

		const checkbox = this.#shadow.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement | null;
		if (checkbox) {
			checkbox.addEventListener('change', this._onChange);
			this.#syncFromAttr();
		}

		// On iOS, the first tap on a checkbox inside a shadow DOM label doesn't
		// reliably fire a change event. Handle touchend directly to ensure the
		// toggle always works on first touch.
		if (isIOS) {
			const label = this.#shadow.querySelector('label');
			if (label) {
				this._touchStartY = 0;
				this._onTouchStart = (e: TouchEvent) => {
					this._touchStartY = e.touches[0]?.clientY ?? 0;
				};
				this._onTouchEnd = (e: TouchEvent) => {
					const deltaY = Math.abs(
						(e.changedTouches[0]?.clientY ?? 0) - this._touchStartY,
					);
					if (deltaY > 10) return;
					e.preventDefault();
					(checkbox as HTMLInputElement)?.click();
				};
				label.addEventListener('touchstart', this._onTouchStart, {
					passive: true,
				});
				label.addEventListener('touchend', this._onTouchEnd);
			}
		}
		this._cleanupTooltips = initTooltips(this.#shadow, this);
	}

	disconnectedCallback() {
		if (this._onTouchEnd) {
			const label = this.#shadow.querySelector('label');
			label?.removeEventListener('touchstart', this._onTouchStart!);
			label?.removeEventListener('touchend', this._onTouchEnd!);
			this._onTouchStart = null;
			this._onTouchEnd = null;
		}
		this._cleanupTooltips?.();
	}

	attributeChangedCallback(name: string) {
		if (name === 'checked') {
			this.#syncFromAttr();
		}
		if (name === 'disabled') {
			const checkbox = this.#shadow.querySelector(
				'input[type="checkbox"]',
			) as HTMLInputElement | null;
			if (checkbox) {
				checkbox.disabled = this.hasAttribute('disabled');
			}
		}
	}

	get checked() {
		return this.hasAttribute('checked');
	}

	set checked(value) {
		if (value) {
			this.setAttribute('checked', '');
		} else {
			this.removeAttribute('checked');
		}
	}

	#syncFromAttr() {
		const checkbox = this.#shadow.querySelector(
			'input[type="checkbox"]',
		) as HTMLInputElement | null;
		if (checkbox) {
			checkbox.checked = this.checked;
		}
	}

	_onChange(e: Event) {
		this.checked = (e.target as HTMLInputElement).checked;
		this.dispatchEvent(
			new CustomEvent<SenderSwitchChangeDetail>('change', {
				detail: { checked: (e.target as HTMLInputElement).checked },
				bubbles: true,
				composed: true,
			}),
		);
	}
}

customElements.define('sender-switch', SenderSwitch);

// Typed addEventListener overloads for SenderSwitch's custom change event
export interface SenderSwitch {
	addEventListener(
		type: 'change',
		listener: (e: CustomEvent<SenderSwitchChangeDetail>) => void,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: boolean | AddEventListenerOptions,
	): void;
}
