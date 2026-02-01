// Header Navigation Component
// Desktop header with Create/Login links

import { html } from '../utils/template.js';
import { authState } from './auth-state.js';
import { router } from '../utils/router.js';
import { config } from '../utils/config.js';

class HeaderNav extends HTMLElement {
	#shadow;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this.#render();
		this.#setupListeners();
	}

	disconnectedCallback() {
		authState.removeEventListener('change', this.#handleAuthChange);
	}

	#handleAuthChange = () => {
		this.#render();
		this.#setupListeners();
	};

	#render() {
		const user = authState.user;
		const isAuth = authState.isAuthenticated;
		const isAdmin = authState.isAdmin;

		this.#shadow.innerHTML = html`
			<style>
				:host {
					display: block;
				}

				nav {
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: 16px 24px;
					background: var(--color-nav-bg, rgba(255, 255, 255, 0.9));
					backdrop-filter: blur(10px);
					-webkit-backdrop-filter: blur(10px);
					border-bottom: 1px solid var(--color-border, #e5e5e5);
					position: sticky;
					top: 0;
					z-index: 100;
				}

				.logo {
					font-size: 20px;
					color: var(--color-text, #000);
					text-decoration: none;
				}

				.logo:hover {
					opacity: 0.8;
				}

				.nav-links {
					display: flex;
					gap: 24px;
					align-items: center;
				}

				a {
					color: var(--color-text-secondary, #666);
					text-decoration: none;
					transition: color 0.2s;
				}

				a:hover {
					color: var(--color-primary, #007aff);
				}

				.btn-primary {
					background: var(--color-primary, #007aff);
					color: #fff !important;
					padding: 8px 16px;
					border-radius: 8px;
				}

				.btn-primary:hover {
					opacity: 0.9;
				}

				.user-menu {
					display: flex;
					align-items: center;
					gap: 12px;
				}

				.user-name {
					color: var(--color-text-secondary, #666);
					font-size: 14px;
				}

				button {
					background: none;
					border: none;
					color: var(--color-text-secondary, #666);
					font-size: 14px;
					cursor: pointer;
					padding: 8px;
				}

				button:hover {
					color: var(--color-primary, #007aff);
				}
			</style>

			<nav>
				<a href="/" class="logo">${config.appName}</a>

				<div class="nav-links">
					<a href="/create">Create</a>
					${isAdmin ? html`<a href="/admin">Admin</a>` : ''}
					${isAuth
						? html`
								<div class="user-menu">
									<span class="user-name">
										${user?.display_name || user?.name || user?.email}
									</span>
									<button id="logout-btn">Sign Out</button>
								</div>
							`
						: ''}
				</div>
			</nav>
		`;
	}

	#setupListeners() {
		authState.addEventListener('change', this.#handleAuthChange);

		const logoutBtn = this.#shadow.getElementById('logout-btn');
		if (logoutBtn) {
			logoutBtn.addEventListener('click', async () => {
				await authState.logout();
				router.navigate('/');
			});
		}
	}
}

customElements.define('header-nav', HeaderNav);
export { HeaderNav };
