import { html } from './template.js';

export const FLOATING_MENU_CSS = html`
	/* Floating Menu */ .floating-menu {
	position: fixed; z-index: 10000; background: var(--color-header);
	-webkit-backdrop-filter: var(--backdrop-filter); backdrop-filter:
	var(--backdrop-filter); border: 1px solid var(--color-edge); border-radius:
	10px; padding: 4px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15), 0 1px 4px
	rgba(0, 0, 0, 0.08); } /* Standard item — subtle hover (used in dropdowns) */
	.menu-item { display: flex; align-items: center; width: 100%; padding: 6px
	10px; border: none; background: transparent; border-radius: 6px; font: 13px
	system-ui; color: var(--color-ink); cursor: pointer; text-align: left; }
	.menu-item:hover { background: var(--color-menu); } /* Action item — accent
	hover (used in context menus) */ .menu-action-item { display: flex;
	align-items: center; gap: 8px; width: 100%; padding: 6px 10px; border: none;
	background: transparent; border-radius: 6px; font: 13px system-ui; color:
	var(--color-ink); cursor: pointer; text-align: left; } .menu-action-item:hover
	{ background: var(--color-bubble-self); color: white; }
	.menu-action-item.destructive { color: var(--color-status-red); }
	.menu-action-item.destructive:hover { background: var(--color-status-red);
	color: white; } .menu-action-item svg { width: 16px; height: 16px; fill:
	currentColor; flex-shrink: 0; } .menu-separator { height: 1px; background:
	var(--color-edge); margin: 4px 0; }
`;

export class FloatingMenu {
	#el: HTMLDivElement | null = null;
	#root;
	#clickHandler: () => void;
	#keyHandler: (e: KeyboardEvent) => void;

	/**
	 * @param {object} opts
	 * @param {ShadowRoot|Element} opts.root  - where to append the menu
	 * @param {number} opts.x                 - left anchor (viewport px); menu left edge aligns here
	 * @param {number} opts.y                 - top position (viewport px)
	 * @param {string} opts.innerHTML         - menu content HTML
	 * @param {function} [opts.onItemClick]   - click handler on the menu element
	 * @param {number} [opts.minWidth]        - optional min-width in px
	 * @param {number} [opts.xRight]          - right anchor (viewport px); used as right-edge when menu flips left
	 */
	constructor({
		root,
		x,
		y,
		innerHTML,
		onItemClick,
		minWidth,
		xRight,
	}: {
		root: ShadowRoot | Element;
		x: number;
		y: number;
		innerHTML: string;
		onItemClick?: ((e: Event) => void) | null;
		minWidth?: number;
		xRight?: number;
	}) {
		this.#root = root;

		const el = document.createElement('div');
		el.className = 'floating-menu';
		if (minWidth) el.style.minWidth = `${minWidth}px`;
		el.innerHTML = innerHTML;
		el.style.left = `${x}px`;
		el.style.top = `${y}px`;

		if (onItemClick) {
			el.addEventListener('click', onItemClick);
		}

		root.appendChild(el);
		this.#el = el;

		// Clamp to viewport edges after the element has rendered
		requestAnimationFrame(() => {
			const rect = el.getBoundingClientRect();
			if (rect.right > window.innerWidth) {
				const rightAnchor = xRight ?? x;
				el.style.left = `${rightAnchor - rect.width}px`;
			}
			if (rect.bottom > window.innerHeight) {
				el.style.top = `${y - rect.height}px`;
			}
		});

		this.#clickHandler = () => this.dismiss();
		this.#keyHandler = (e) => {
			if (e.key === 'Escape') this.dismiss();
		};
		// setTimeout so this click doesn't immediately dismiss the menu
		setTimeout(() => {
			document.addEventListener('click', this.#clickHandler);
			document.addEventListener('keydown', this.#keyHandler);
		});
	}

	get isOpen() {
		return this.#el !== null;
	}

	dismiss() {
		if (!this.#el) return;
		this.#el.remove();
		this.#el = null;
		document.removeEventListener('click', this.#clickHandler);
		document.removeEventListener('keydown', this.#keyHandler);
	}
}
