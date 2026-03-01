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
	height: 'calc(100 * var(--vh))',
	background: 'rgba(0, 0, 0, 0.5)',
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
