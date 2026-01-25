// Auth State Management
// Manages authentication state and user data

import { apiClient } from '../utils/api-client.js';

const AUTH_STATE_KEY = 'literary-journal:user';

class AuthState extends EventTarget {
	#user = null;
	#loading = true;
	#initialized = false;

	constructor() {
		super();
	}

	async init() {
		if (this.#initialized) return;
		this.#initialized = true;

		// Try to restore user from storage
		this.#loadUserFromStorage();

		// If we have a token, validate it
		if (apiClient.isAuthenticated()) {
			try {
				const user = await apiClient.getMe();
				this.#setUser(user);
			} catch (_e) {
				// Token invalid, clear everything
				this.#clearUser();
			}
		} else {
			this.#loading = false;
			this.#emit('change');
		}

		// Listen for unauthorized events
		window.addEventListener('auth:unauthorized', () => {
			this.#clearUser();
		});
	}

	#loadUserFromStorage() {
		try {
			const stored = localStorage.getItem(AUTH_STATE_KEY);
			if (stored) {
				this.#user = JSON.parse(stored);
			}
		} catch (_e) {
			this.#user = null;
		}
	}

	#saveUserToStorage() {
		try {
			if (this.#user) {
				localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(this.#user));
			} else {
				localStorage.removeItem(AUTH_STATE_KEY);
			}
		} catch (_e) {
			// Storage error
		}
	}

	#setUser(user) {
		this.#user = user;
		this.#loading = false;
		this.#saveUserToStorage();
		this.#emit('change');
	}

	#clearUser() {
		this.#user = null;
		this.#loading = false;
		apiClient.clearToken();
		this.#saveUserToStorage();
		this.#emit('change');
	}

	#emit(eventName) {
		this.dispatchEvent(
			new CustomEvent(eventName, {
				detail: {
					user: this.#user,
					isAuthenticated: this.isAuthenticated,
					isAdmin: this.isAdmin,
					loading: this.#loading,
				},
			}),
		);
	}

	get user() {
		return this.#user;
	}

	get isAuthenticated() {
		return !!this.#user;
	}

	get isAdmin() {
		return this.#user?.is_admin === true;
	}

	get loading() {
		return this.#loading;
	}

	async login(token) {
		this.#loading = true;
		this.#emit('change');

		try {
			const data = await apiClient.verifyToken(token);
			this.#setUser(data.user);
			return data.user;
		} catch (error) {
			this.#loading = false;
			this.#emit('change');
			throw error;
		}
	}

	async logout() {
		try {
			await apiClient.logout();
		} finally {
			this.#clearUser();
		}
	}

	async requestMagicLink(email) {
		return apiClient.requestMagicLink(email);
	}
}

const authState = new AuthState();
export { authState, AuthState };
