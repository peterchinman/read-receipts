import type { MultiSwitchChangeDetail } from '../types/events.js';

interface SwitchOption {
	label: string;
	value: string;
}

export class MultiSwitch extends HTMLElement {
	#shadow: ShadowRoot;
	declare _options: SwitchOption[];
	declare _selectedIndex: number;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
		this._options = [];
		this._selectedIndex = 0;
	}

	static get observedAttributes() {
		return ['options', 'value'];
	}

	attributeChangedCallback(
		name: string,
		oldVal: string | null,
		newVal: string | null,
	) {
		if (oldVal === newVal) return;
		if (name === 'options') {
			try {
				this._options = JSON.parse(newVal ?? '[]');
			} catch (_e) {
				this._options = [];
			}
			if (this.isConnected) this.#render();
		}
		if (name === 'value') {
			const idx = this._options.findIndex(
				(o: SwitchOption) => o.value === newVal,
			);
			if (idx !== -1 && idx !== this._selectedIndex) {
				this._selectedIndex = idx;
				if (this.isConnected) this.#updateThumb(idx);
			}
		}
	}

	get value() {
		return this.getAttribute('value');
	}

	set value(v: string | null) {
		if (v !== null) this.setAttribute('value', v);
	}

	connectedCallback() {
		try {
			this._options = JSON.parse(this.getAttribute('options') ?? '[]');
		} catch (_e) {
			this._options = [];
		}
		const val = this.getAttribute('value');
		const idx = this._options.findIndex((o: SwitchOption) => o.value === val);
		if (idx !== -1) this._selectedIndex = idx;
		this.#render();
	}

	#render() {
		const name = this.getAttribute('name') || 'switch';
		const options = this._options;

		this.#shadow.innerHTML = `
			<style>
				:host {
					display: inline-block;
					--thumb-padding: calc(2rem / 14);
					--text-padding: calc(10rem / 14);
					--gap: 0px;
					--height: 2.3lh;
					--border-radius-outer: calc(4rem / 14);
					--border-radius-inner: calc(var(--border-radius-outer) * .75);
				}

				.multi-switch {
					display: flex;
					position: relative;
					padding-inline: var(--thumb-padding);
					gap: var(--gap);
					height: var(--height);
					background-color: var(--color-menu, #E9E9EB);
					border-radius: var(--border-radius-outer);
					user-select: none;
				}

				.multi-switch .option-wrapper { display: contents; }

				.multi-switch input {
					position: absolute;
					clip: rect(0, 0, 0, 0);
					clip-path: inset(50%);
					height: 1px; width: 1px;
					overflow: hidden; white-space: nowrap;
				}

				.multi-switch .option {
					padding: var(--text-padding);
					z-index: 1;
					display: flex;
					justify-content: center;
					align-items: center;
					cursor: pointer;
					position: relative;
					font: 12px system-ui;
					color: var(--color-ink, black);
				}

				.multi-switch .option:focus-visible {
					outline: 2px solid var(--color-bubble-self, #007AFF);
					outline-offset: 2px;
					border-radius: var(--border-radius-inner);
				}

				.multi-switch .switch-thumb {
					position: absolute;
					left: var(--thumb-padding);
					top: var(--thumb-padding);
					height: calc(var(--height) - 2 * var(--thumb-padding));
					background-color: var(--color-page, white);
					border-radius: var(--border-radius-inner);
					transition: left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
								width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
					filter: drop-shadow(calc(4rem / 14) 0 calc(4rem / 14) var(--color-drop-shadow, oklch(0 0 0 / 8%)));
					cursor: pointer;
				}
			</style>
			<div class="multi-switch" role="radiogroup" aria-label="${name}">
				${options
					.map(
						(o: SwitchOption, i: number) => `
					<div class="option-wrapper">
						<input type="radio" name="${name}" id="opt-${i}" value="${o.value}"
							${i === this._selectedIndex ? 'checked' : ''} />
						<label class="option" for="opt-${i}" tabindex="0"
							role="radio" aria-checked="${i === this._selectedIndex}"
							data-index="${i}">${o.label}</label>
					</div>
				`,
					)
					.join('')}
				<div class="switch-thumb"></div>
			</div>
		`;

		// Measure option widths after render
		requestAnimationFrame(() => {
			const labels = this.#shadow.querySelectorAll('.option');
			const container = this.#shadow.querySelector(
				'.multi-switch',
			) as HTMLElement | null;
			if (!container) return;
			labels.forEach((label, i) => {
				const w = label.getBoundingClientRect().width;
				container.style.setProperty(`--option-${i}-width`, `${w}px`);
			});
			this.#updateThumb(this._selectedIndex);
		});

		// Event listeners
		const labels = this.#shadow.querySelectorAll('.option');
		labels.forEach((label) => {
			label.addEventListener('click', (e) => {
				e.preventDefault();
				const idx = parseInt((label as HTMLElement).dataset.index ?? '0', 10);
				if (idx === this._selectedIndex) {
					// Cycle to next
					this.#select((idx + 1) % options.length);
				} else {
					this.#select(idx);
				}
			});

			label.addEventListener('keydown', (e) => {
				const len = options.length;
				switch ((e as KeyboardEvent).key) {
					case 'Enter':
					case ' ':
						e.preventDefault();
						this.#select(
							parseInt((label as HTMLElement).dataset.index ?? '0', 10),
						);
						break;
					case 'ArrowRight':
					case 'ArrowDown':
						e.preventDefault();
						this.#select((this._selectedIndex + 1) % len, true);
						break;
					case 'ArrowLeft':
					case 'ArrowUp':
						e.preventDefault();
						this.#select((this._selectedIndex - 1 + len) % len, true);
						break;
				}
			});
		});

		// Radio change fallback
		this.#shadow.querySelectorAll('input[type="radio"]').forEach((radio) => {
			radio.addEventListener('change', () => {
				const r = radio as HTMLInputElement;
				if (r.checked) {
					const idx = this._options.findIndex(
						(o: SwitchOption) => o.value === r.value,
					);
					if (idx !== -1) this.#select(idx);
				}
			});
		});
	}

	#select(index: number, moveFocus = false) {
		if (index === this._selectedIndex && !moveFocus) return;
		this._selectedIndex = index;
		const opt = this._options[index];
		if (!opt) return;

		// Update radio
		const radio = this.#shadow.querySelector(
			`#opt-${index}`,
		) as HTMLInputElement | null;
		if (radio) radio.checked = true;

		this.#updateThumb(index);

		// Update attribute without re-triggering render
		this.setAttribute('value', opt.value);

		if (moveFocus) {
			const label = this.#shadow.querySelector(
				`.option[data-index="${index}"]`,
			) as HTMLElement | null;
			if (label) label.focus();
		}

		this.dispatchEvent(
			new CustomEvent<MultiSwitchChangeDetail>('change', {
				detail: { value: opt.value },
				bubbles: true,
			}),
		);
	}

	#updateThumb(selectedIndex: number) {
		const thumb = this.#shadow.querySelector(
			'.switch-thumb',
		) as HTMLElement | null;
		const container = this.#shadow.querySelector(
			'.multi-switch',
		) as HTMLElement | null;
		if (!thumb || !container) return;

		const containerStyles = getComputedStyle(container);
		const gap = parseFloat(containerStyles.getPropertyValue('--gap')) || 0;

		// Get the computed value of padding-inline-start which uses --thumb-padding
		const thumbPadding = parseFloat(containerStyles.paddingLeft) || 0;

		let left = thumbPadding;
		for (let i = 0; i < selectedIndex; i++) {
			const w =
				parseFloat(container.style.getPropertyValue(`--option-${i}-width`)) ||
				0;
			left += w + gap;
		}

		const selectedWidth =
			parseFloat(
				container.style.getPropertyValue(`--option-${selectedIndex}-width`),
			) || 0;

		thumb.style.left = `${left}px`;
		thumb.style.width = `${selectedWidth}px`;

		// Update aria-checked on all labels
		this.#shadow.querySelectorAll('.option').forEach((label, i) => {
			label.setAttribute(
				'aria-checked',
				i === selectedIndex ? 'true' : 'false',
			);
		});
	}
}

customElements.define('multi-switch', MultiSwitch);

// Typed addEventListener overloads for MultiSwitch's custom change event
export interface MultiSwitch {
	addEventListener(
		type: 'change',
		listener: (e: CustomEvent<MultiSwitchChangeDetail>) => void,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: boolean | AddEventListenerOptions,
	): void;
}
