// Auth State Management
// Manages authentication state and user data

import { apiClient } from '../utils/api-client.js';
import { config } from '../utils/config.js';

const AUTH_STATE_KEY = `${config.appName.toLowerCase().replace(/\s+/g, '-')}:user`;

interface User {
	is_admin?: boolean;
	display_name?: string;
	name?: string;
	email?: string;
	[key: string]: unknown;
}

class AuthState extends EventTarget {
	#user: User | null = null;
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

	#setUser(user: User) {
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

	#emit(eventName: string) {
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

	async login(token: string) {
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

	async devLogin(email: string) {
		this.#loading = true;
		this.#emit('change');

		try {
			const data = await apiClient.devLogin(email);
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

	async requestMagicLink(email: string) {
		return apiClient.requestMagicLink(email);
	}
}

const authState = new AuthState();
export { authState, AuthState };
