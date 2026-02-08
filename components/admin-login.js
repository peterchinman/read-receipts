// Admin Login Component
// Dedicated login page for admin access

import { html } from '../utils/template.js';
import { authState } from './auth-state.js';
import { router } from '../utils/router.js';

class AdminLogin extends HTMLElement {
	#shadow;
	#status = 'idle'; // idle, sending, sent, error, no-access
	#error = null;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
		this._onAuthChange = this._onAuthChange.bind(this);
	}

	connectedCallback() {
		// If already admin, redirect
		if (authState.isAdmin) {
			router.navigate('/admin');
			return;
		}

		// If authenticated but not admin
		if (authState.isAuthenticated && !authState.isAdmin) {
			this.#status = 'no-access';
		}

		authState.addEventListener('change', this._onAuthChange);
		this.#render();
	}

	disconnectedCallback() {
		authState.removeEventListener('change', this._onAuthChange);
	}

	_onAuthChange() {
		if (authState.isAdmin) {
			router.navigate('/admin');
			return;
		}
		if (authState.isAuthenticated && !authState.isAdmin) {
			this.#status = 'no-access';
			this.#render();
		}
	}

	async #handleSubmit(e) {
		e.preventDefault();
		const emailInput = this.#shadow.querySelector('#email');
		const email = emailInput?.value?.trim();
		if (!email) return;

		this.#status = 'sending';
		this.#render();

		try {
			await authState.requestMagicLink(email);
			localStorage.setItem('admin-login-pending', 'true');
			this.#status = 'sent';
			this.#render();
		} catch (error) {
			this.#status = 'error';
			this.#error = error.message || 'Failed to send login link';
			this.#render();
		}
	}

	#render() {
		this.#shadow.innerHTML = html`
			<style>
				:host {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					min-height: 100vh;
					padding: 20px;
					box-sizing: border-box;
				}

				.container {
					max-width: 400px;
					width: 100%;
					text-align: center;
				}

				h1 {
					font-size: 24px;
					font-weight: 600;
					margin: 0 0 8px;
					color: var(--color-text, #000);
				}

				.subtitle {
					color: var(--color-text-secondary, #666);
					font-size: 16px;
					margin: 0 0 32px;
				}

				form {
					display: flex;
					flex-direction: column;
					gap: 16px;
				}

				input[type="email"] {
					all: unset;
					font: 16px system-ui;
					color: var(--color-ink, #000);
					padding: 12px 16px;
					border: 1px solid var(--color-edge, #ccc);
					border-radius: 8px;
					background: var(--color-header, #fff);
					box-sizing: border-box;
					width: 100%;
				}

				input[type="email"]::placeholder {
					color: var(--color-ink-subdued, #999);
				}

				button {
					font: 16px system-ui;
					font-weight: 600;
					padding: 12px 24px;
					border: none;
					border-radius: 8px;
					background: var(--color-bubble-self, #007aff);
					color: #fff;
					cursor: pointer;
					transition: opacity 0.2s;
				}

				button:hover:not(:disabled) {
					opacity: 0.9;
				}

				button:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}

				.message {
					color: var(--color-text-secondary, #666);
					font-size: 16px;
					margin: 0;
				}

				.error {
					color: #ff3b30;
				}

				.success {
					color: #34c759;
				}

				.icon {
					font-size: 48px;
					margin-bottom: 16px;
				}

				.dev-divider {
					margin: 24px 0 16px;
					font-size: 12px;
					color: var(--color-text-secondary, #999);
					text-transform: uppercase;
					letter-spacing: 0.05em;
				}

				.dev-btn {
					font: 14px system-ui;
					font-weight: 600;
					padding: 10px 24px;
					border: 1px dashed var(--color-edge, #ccc);
					border-radius: 8px;
					background: none;
					color: var(--color-text-secondary, #666);
					cursor: pointer;
				}

				.dev-btn:hover {
					background: var(--color-hover, #f5f5f7);
				}
			</style>

			<div class="container">
				${this.#renderContent()}
			</div>
		`;

		// Attach form listener
		const form = this.#shadow.querySelector('form');
		if (form) {
			form.addEventListener('submit', (e) => this.#handleSubmit(e));
		}

		// Dev login
		const devBtn = this.#shadow.querySelector('#dev-login-btn');
		if (devBtn) {
			devBtn.addEventListener('click', () => this.#handleDevLogin());
		}
	}

	async #handleDevLogin() {
		this.#status = 'sending';
		this.#render();

		try {
			await authState.devLogin('admin@example.com');
			router.navigate('/admin');
		} catch (error) {
			this.#status = 'error';
			this.#error = error.message || 'Dev login failed — is APP_ENV=local?';
			this.#render();
		}
	}

	#renderContent() {
		switch (this.#status) {
			case 'idle':
				return html`
					<h1>Admin Login</h1>
					<p class="subtitle">Sign in to access the admin dashboard</p>
					<form>
						<input
							type="email"
							id="email"
							placeholder="admin@example.com"
							required
							autocomplete="email"
						/>
						<button type="submit">Send Login Link</button>
					</form>
					<p class="dev-divider">dev</p>
					<button class="dev-btn" id="dev-login-btn">Dev Login (admin@example.com)</button>
				`;

			case 'sending':
				return html`
					<h1>Admin Login</h1>
					<p class="subtitle">Sign in to access the admin dashboard</p>
					<form>
						<input
							type="email"
							id="email"
							placeholder="admin@example.com"
							disabled
						/>
						<button type="submit" disabled>Sending...</button>
					</form>
				`;

			case 'sent':
				return html`
					<div class="icon success">&#10003;</div>
					<h1>Check Your Email</h1>
					<p class="message">We've sent a login link to your email. Click it to sign in.</p>
				`;

			case 'error':
				return html`
					<div class="icon error">&#10007;</div>
					<h1>Error</h1>
					<p class="message error">${this.#error}</p>
					<form>
						<input
							type="email"
							id="email"
							placeholder="admin@example.com"
							required
							autocomplete="email"
						/>
						<button type="submit">Try Again</button>
					</form>
				`;

			case 'no-access':
				return html`
					<div class="icon error">&#10007;</div>
					<h1>No Admin Access</h1>
					<p class="message">Your account does not have admin privileges.</p>
				`;

			default:
				return '';
		}
	}
}

customElements.define('admin-login', AdminLogin);
export { AdminLogin };
