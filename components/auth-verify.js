// Auth Verify Component
// Handles magic link token verification

import { html } from '../utils/template.js';
import { authState } from './auth-state.js';
import { router } from '../utils/router.js';

class AuthVerify extends HTMLElement {
	#shadow;
	#token = null;
	#status = 'verifying';
	#error = null;
	#connected = false;
	#redirectTimer = null;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
	}

	static get observedAttributes() {
		return ['token'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'token' && oldValue !== newValue) {
			this.#token = newValue;
			if (this.#connected) {
				this.#verifyToken();
			}
		}
	}

	connectedCallback() {
		this.#connected = true;
		this.#token = this.getAttribute('token');
		this.#render();
		if (this.#token) {
			this.#verifyToken();
		}
	}

	disconnectedCallback() {
		this.#connected = false;
		if (this.#redirectTimer) {
			clearTimeout(this.#redirectTimer);
			this.#redirectTimer = null;
		}
	}

	async #verifyToken() {
		if (!this.#token) {
			this.#status = 'error';
			this.#error = 'No token provided';
			this.#render();
			return;
		}

		this.#status = 'verifying';
		this.#render();

		try {
			await authState.login(this.#token);
			this.#status = 'success';
			this.#render();

			// Redirect after short delay
			this.#redirectTimer = setTimeout(() => {
				if (localStorage.getItem('admin-login-pending')) {
					localStorage.removeItem('admin-login-pending');
					router.navigate('/admin');
				} else {
					router.navigate('/create');
				}
			}, 1500);
		} catch (error) {
			this.#status = 'error';
			this.#error = error.message || 'Verification failed';
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

				.icon {
					font-size: 48px;
					margin-bottom: 16px;
				}

				h1 {
					font-size: 24px;
					font-weight: 600;
					margin: 0 0 8px;
					color: var(--color-text, #000);
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

				a {
					display: inline-block;
					margin-top: 24px;
					color: var(--color-primary, #007aff);
					text-decoration: none;
				}

				a:hover {
					text-decoration: underline;
				}
			</style>

			<div class="container">
				${this.#renderContent()}
			</div>
		`;
	}

	#renderContent() {
		switch (this.#status) {
			case 'verifying':
				return html`
					<div class="icon">...</div>
					<h1>Verifying</h1>
					<p class="message">Please wait while we sign you in...</p>
				`;

			case 'success':
				return html`
					<div class="icon success">&#10003;</div>
					<h1>Verified!</h1>
					<p class="message">Redirecting to complete your submission...</p>
				`;

			case 'error':
				return html`
					<div class="icon error">&#10007;</div>
					<h1>Verification Failed</h1>
					<p class="message error">${this.#error}</p>
					<a href="/login">Try signing in again</a>
				`;

			default:
				return '';
		}
	}
}

customElements.define('auth-verify', AuthVerify);
export { AuthVerify };
