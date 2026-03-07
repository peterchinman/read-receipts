/**
 * Reusable dialog utility.
 *
 * createDialog()  – low-level: builds overlay + modal container, returns
 *                   { overlay, modal, close() } so callers can populate
 *                   the modal with arbitrary content.
 *
 * showDialog()    – high-level: renders a simple title / body / buttons
 *                   dialog and returns a Promise that resolves when a
 *                   button is clicked.
 */

// ── shared inline-style objects ──────────────────────────────────────

const overlayStyles = {
	position: 'fixed',
	top: '0',
	left: '0',
	width: '100%',
	height: 'calc(100 * var(--vh, 1dvh))',
	background: 'var(--color-dialog-overlay, hsl(0 0 0 / 0.5)',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	zIndex: '1000',
	animation: 'dialog-fade 0.2s ease',
};

const modalStyles = {
	background: 'var(--color-page)',
	borderRadius: '14px',
	padding: '20px',
	maxWidth: '420px',
	width: '90%',
	boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
	animation: 'dialog-slide 0.3s ease',
};

const keyframeCSS = `
	@keyframes dialog-fade {
		from { opacity: 0; }
		to   { opacity: 1; }
	}
	@keyframes dialog-slide {
		from { transform: translateY(20px); opacity: 0; }
		to   { transform: translateY(0);    opacity: 1; }
	}
`;

// ── style helpers (exported for re-use in custom dialog content) ─────

export const dialogTitleStyle = `
	font: 600 1.2rem system-ui;
	color: var(--color-ink);
	margin-bottom: 8px;
`;

export const dialogBodyStyle = `
	color: var(--color-ink);
	margin-bottom: 20px;
	line-height: 1.4;
`;

export const dialogButtonRowStyle = `
	display: flex;
	gap: 8px;
`;

const buttonBase = `
	flex: 1;
	padding: 11px 16px;
	border: none;
	border-radius: 8px;
	font: 600 1rem system-ui;
	cursor: pointer;
`;

export const dialogCancelButtonStyle = `${buttonBase}
	background: var(--color-edge);
	color: var(--color-ink);
`;

export const dialogConfirmButtonStyle = `${buttonBase}
	background: var(--color-bubble-self);
	color: white;
`;

export const dialogDestructiveButtonStyle = `${buttonBase}
	background: #ff3b30;
	color: white;
`;

export const dialogInputStyle = `
	width: 100%;
	font: 14px system-ui;
	color: var(--color-ink);
	padding: 10px 12px;
	border: 1px solid var(--color-edge);
	border-radius: 8px;
	background: var(--color-header);
	margin-bottom: 16px;
	box-sizing: border-box;
`;

// ── createDrawer ─────────────────────────────────────────────────────

const drawerKeyframeCSS = `
	@keyframes drawer-overlay-fade {
		from { opacity: 0; }
		to   { opacity: 1; }
	}
	@keyframes drawer-slide {
		from { transform: translateY(100%); }
		to   { transform: translateY(0); }
	}
`;

/**
 * Creates a bottom-sheet drawer overlay and appends it to the document body
 * (or an optional container for scoped placement).
 *
 * @param {Object}           [options]
 * @param {boolean}          [options.closeOnOverlayClick=true]
 * @param {Node|ShadowRoot}  [options.container]  Append to this node instead of document.body.
 *                                                 When provided the overlay uses position:absolute.
 * @returns {{ overlay: HTMLElement, drawer: HTMLElement, close: () => void }}
 */
export function createDrawer({ closeOnOverlayClick = true, container } = {}) {
	const scoped = !!container;

	const overlay = document.createElement('div');
	Object.assign(overlay.style, {
		position: scoped ? 'absolute' : 'fixed',
		top: '0',
		left: '0',
		width: '100%',
		height: scoped ? '100%' : 'calc(100 * var(--vh, 1dvh))',
		background: 'var(--color-dialog-overlay, hsl(0 0 0 / 0.5))',
		display: 'flex',
		alignItems: 'flex-end',
		zIndex: '1000',
		animation: 'drawer-overlay-fade 0.2s ease',
	});

	const style = document.createElement('style');
	style.textContent = drawerKeyframeCSS;
	overlay.appendChild(style);

	const drawer = document.createElement('div');
	Object.assign(drawer.style, {
		background: 'var(--color-page)',
		borderRadius: '20px 20px 0 0',
		padding: '12px 20px 32px',
		width: '100%',
		minHeight: scoped ? '85%' : '85dvh',
		overflowY: 'auto',
		boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.15)',
		animation: 'drawer-slide 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
	});
	drawer.addEventListener('click', (e) => e.stopPropagation());

	// Drag handle
	const handle = document.createElement('div');
	Object.assign(handle.style, {
		width: '36px',
		height: '5px',
		borderRadius: '3px',
		background: 'var(--color-edge)',
		margin: '0 auto 20px',
	});
	drawer.appendChild(handle);

	overlay.appendChild(drawer);

	const close = () => overlay.remove();

	if (closeOnOverlayClick) {
		overlay.addEventListener('click', close);
	}

	// Swipe-to-dismiss
	let startY = 0;
	let currentDelta = 0;
	let dragging = false;
	let lastY = 0;
	let lastTime = 0;
	let velocity = 0;

	const DISMISS_TRANSITION = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';

	drawer.addEventListener('touchstart', (e) => {
		startY = e.touches[0].clientY;
		lastY = startY;
		lastTime = Date.now();
		currentDelta = 0;
		velocity = 0;
		dragging = false;
	}, { passive: true });

	drawer.addEventListener('touchmove', (e) => {
		const y = e.touches[0].clientY;
		const now = Date.now();
		const elapsed = now - lastTime || 1;
		velocity = (y - lastY) / elapsed;
		lastY = y;
		lastTime = now;

		const delta = y - startY;

		// Only begin dragging when at scroll top and moving downward
		if (!dragging) {
			if (delta > 0 && drawer.scrollTop === 0) {
				dragging = true;
			} else {
				return;
			}
		}

		currentDelta = Math.max(0, delta);
		drawer.style.transition = 'none';
		drawer.style.transform = `translateY(${currentDelta}px)`;
	}, { passive: true });

	drawer.addEventListener('touchend', () => {
		if (!dragging) return;
		dragging = false;

		const shouldDismiss = currentDelta > drawer.offsetHeight * 0.25 || velocity > 0.5;

		if (shouldDismiss) {
			drawer.style.transition = DISMISS_TRANSITION;
			drawer.style.transform = `translateY(100%)`;
			drawer.addEventListener('transitionend', close, { once: true });
		} else {
			drawer.style.transition = DISMISS_TRANSITION;
			drawer.style.transform = '';
			drawer.addEventListener('transitionend', () => {
				drawer.style.transition = '';
			}, { once: true });
		}
	}, { passive: true });

	(container ?? document.body).appendChild(overlay);
	return { overlay, drawer, close };
}

// ── createDialog ─────────────────────────────────────────────────────

/**
 * Creates a modal overlay + empty modal container and appends it to the
 * document body.
 *
 * @param {Object}  [options]
 * @param {boolean} [options.closeOnOverlayClick=true]
 * @returns {{ overlay: HTMLElement, modal: HTMLElement, close: () => void }}
 */
export function createDialog({ closeOnOverlayClick = true } = {}) {
	const overlay = document.createElement('div');
	Object.assign(overlay.style, overlayStyles);

	const style = document.createElement('style');
	style.textContent = keyframeCSS;
	overlay.appendChild(style);

	const modal = document.createElement('div');
	Object.assign(modal.style, modalStyles);
	modal.addEventListener('click', (e) => e.stopPropagation());
	overlay.appendChild(modal);

	const close = () => overlay.remove();

	if (closeOnOverlayClick) {
		overlay.addEventListener('click', close);
	}

	document.body.appendChild(overlay);
	return { overlay, modal, close };
}

// ── showDialog ───────────────────────────────────────────────────────

/**
 * Shows a simple dialog with a title, body text, and one or more buttons.
 *
 * @param {Object}   options
 * @param {string}   options.title
 * @param {string}   options.body
 * @param {Array<{ label: string, value: *, style?: string }>} [options.buttons]
 *        Defaults to a single "OK" button styled as the primary action.
 * @returns {Promise<*>} Resolves with the clicked button's `value`.
 */
export function showDialog({ title, body, buttons } = {}) {
	buttons = buttons ?? [
		{ label: 'OK', value: 'ok', style: dialogConfirmButtonStyle },
	];

	return new Promise((resolve) => {
		const closeOnOverlayClick = buttons.length > 1;
		const { overlay, modal, close } = createDialog({ closeOnOverlayClick });

		if (closeOnOverlayClick) {
			overlay.addEventListener('click', () => resolve(null), { once: true });
		}

		// Title
		const titleEl = document.createElement('div');
		titleEl.style.cssText = dialogTitleStyle;
		titleEl.textContent = title;
		modal.appendChild(titleEl);

		// Body
		const bodyEl = document.createElement('div');
		bodyEl.style.cssText = dialogBodyStyle;
		bodyEl.textContent = body;
		modal.appendChild(bodyEl);

		// Button row
		const row = document.createElement('div');
		row.style.cssText = dialogButtonRowStyle;
		modal.appendChild(row);

		for (const btn of buttons) {
			const el = document.createElement('button');
			el.type = 'button';
			el.style.cssText = btn.style ?? dialogCancelButtonStyle;
			el.textContent = btn.label;
			el.addEventListener('click', () => {
				close();
				resolve(btn.value);
			});
			row.appendChild(el);
		}
	});
}
