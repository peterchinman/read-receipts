// Login Page Component
// Email input for magic link authentication

import { html } from '../utils/template.js';
import { authState } from './auth-state.js';
import { router } from '../utils/router.js';

class LoginPage extends HTMLElement {
	#shadow;
	#emailInput;
	#submitBtn;
	#statusMessage;
	#loading = false;
	#sent = false;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this.#render();
		this.#setupListeners();
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
					margin: 0 0 32px;
					font-size: 16px;
				}

				.form-group {
					margin-bottom: 16px;
				}

				input[type='email'] {
					width: 100%;
					padding: 14px 16px;
					font-size: 16px;
					border: 1px solid var(--color-border, #ccc);
					border-radius: 12px;
					box-sizing: border-box;
					background: var(--color-input-bg, #fff);
					color: var(--color-text, #000);
				}

				input[type='email']:focus {
					outline: none;
					border-color: var(--color-primary, #007aff);
					box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
				}

				input[type='email']::placeholder {
					color: var(--color-text-tertiary, #999);
				}

				button {
					width: 100%;
					padding: 14px 16px;
					font-size: 16px;
					font-weight: 600;
					border: none;
					border-radius: 12px;
					background: var(--color-primary, #007aff);
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

				.status {
					margin-top: 16px;
					padding: 12px;
					border-radius: 8px;
					font-size: 14px;
				}

				.status.success {
					background: rgba(52, 199, 89, 0.1);
					color: #34c759;
				}

				.status.error {
					background: rgba(255, 59, 48, 0.1);
					color: #ff3b30;
				}

				.back-link {
					display: inline-block;
					margin-top: 24px;
					color: var(--color-text-secondary, #666);
					text-decoration: none;
					font-size: 14px;
				}

				.back-link:hover {
					color: var(--color-primary, #007aff);
				}
			</style>

			<div class="container">
				<h1>Sign In</h1>
				<p class="subtitle">
					Enter your email to receive a magic link
				</p>

				<form id="login-form">
					<div class="form-group">
						<input
							type="email"
							id="email"
							placeholder="your@email.com"
							required
							autocomplete="email"
						/>
					</div>
					<button type="submit" id="submit-btn">
						Send Magic Link
					</button>
				</form>

				<div id="status" class="status" style="display: none"></div>

				<a href="/" class="back-link">Back to Home</a>
			</div>
		`;

		this.#emailInput = this.#shadow.getElementById('email');
		this.#submitBtn = this.#shadow.getElementById('submit-btn');
		this.#statusMessage = this.#shadow.getElementById('status');
	}

	#setupListeners() {
		const form = this.#shadow.getElementById('login-form');

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			if (this.#loading) return;

			const email = this.#emailInput.value.trim();
			if (!email) return;

			this.#loading = true;
			this.#submitBtn.disabled = true;
			this.#submitBtn.textContent = 'Sending...';
			this.#hideStatus();

			try {
				await authState.requestMagicLink(email);
				this.#sent = true;
				this.#showStatus(
					'Check your email for the magic link!',
					'success',
				);
				this.#submitBtn.textContent = 'Link Sent';
			} catch (error) {
				this.#showStatus(
					error.message || 'Failed to send magic link',
					'error',
				);
				this.#submitBtn.textContent = 'Send Magic Link';
				this.#submitBtn.disabled = false;
			} finally {
				this.#loading = false;
			}
		});
	}

	#showStatus(message, type) {
		this.#statusMessage.textContent = message;
		this.#statusMessage.className = `status ${type}`;
		this.#statusMessage.style.display = 'block';
	}

	#hideStatus() {
		this.#statusMessage.style.display = 'none';
	}
}

customElements.define('login-page', LoginPage);
export { LoginPage };
